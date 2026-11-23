// Snow, in the rain's canvas (src/lib/weather/rain.ts runs it).
//
// A flake weighs next to nothing, so it doesn't fall so much as get
// carried: down at a walking pace, sideways with whatever the wind's
// doing, in the eddies of it (a slow field of swirls every flake near a
// place shares, so the snow moves in drifts and curtains rather than each
// flake on its own), and with a wobble of its own on top, since a flake is
// a flat thing and slides about on the air like a falling leaf.
//
// It has depth, and a camera's idea of it: the far flakes are small, slow
// and sharp, there are a great many of them, and they hardly move when the
// home page pans; the nearest are few, big, quick, and out of focus.
//
// And it settles. A flake that comes down on the top of a tile stays
// there: every tile carries a little drift, a row of heights along its top
// edge that each landing adds to and that slumps under its own weight (so
// it's a smooth bank, not a bar chart), deeper where more has landed,
// rounded off at the ends. It thaws slowly all the while, so how deep it
// lies follows how hard it's snowing, and when the snow stops it goes:
// the weather here changes at a stroke (it's picked on the about page, or
// the next report says something else), so what's in the air fades out
// in a second rather than taking half a minute to finish falling.
// A page that's opened into falling snow has some on it already.
//
// Wet snow (when it's mixed with rain) is heavy: it comes straight down,
// fast, and what lands is gone almost at once.

import type { Air, Surface } from "./falling";

const DENSITY = 1 / 3300; // flakes per px² of canvas, in a moderate fall
const MAX_FLAKES = 900;
const FALL: [number, number] = [34, 118]; // px/s at a 900px window, far to near
const WIND_PX = 5.2; // px/s sideways per km/h, for the nearest
const EDDY = 30; // px/s, the swirls
const SETTLE = 0.6; // share of the flakes at the page's depth that land
const COLUMN = 3; // px: how finely a drift is kept
const DEPTH = 6; // px: about how deep it gets (at a 900px window)
const THAW = 0.035; // px/s it sinks while it's snowing...
const THAW_AFTER = 2.6; // ...and once it's stopped: gone in a couple of seconds
const CLEAR_S = 1.1; // how long what's still in the air takes to fade, then
const THAW_WET = 1.1;
const SPRITE = 32; // px, the flakes' pictures

interface Flake {
	x: number;
	y: number;
	z: number; // 0 far, 1 near
	r: number;
	fall: number;
	sway: number; // px, its own wobble
	rate: number;
	phase: number;
	pan: number;
	alpha: number;
	soft: number; // which picture: 0 sharp, 1 soft, 2 out of focus
}

interface Drift {
	heights: Float32Array;
	width: number;
}

export function createSnow() {
	let amount = 0;
	// (how much is falling right now: it follows `amount` over a second or
	// two, so snow comes on by degrees)
	let falling = 0;
	let primed = false; // the first flakes are spread down the window; later ones come in at the top
	let wet = false;
	const flakes: Flake[] = [];
	const drifts = new WeakMap<Element, Drift>();
	let shown = 1; // the drifts fade out while tiles are flying about
	let inAir = 1; // the flakes fade out when it stops snowing
	let lying = false; // any drift anywhere
	let sprites: HTMLCanvasElement[] = [];
	let spriteDay = -1;
	let fillStyle = "#fff";

	// the flakes' pictures: a dot, a softer one, and one well out of focus
	// (a disc with a soft edge, as a lens makes of a point of light)
	const drawSprites = (day: number) => {
		spriteDay = day;
		// white by day; by night, whatever the town's lamps make of it
		const tint = [
			Math.round(206 + 49 * day),
			Math.round(210 + 45 * day),
			Math.round(226 + 29 * day),
		].join(", ");
		fillStyle = `rgb(${tint})`;
		sprites = [
			[0.4, 0.7, 1],
			[0.15, 0.5, 1],
			[0.55, 0.8, 1],
		].map(([solid, half, end], i) => {
			const canvas = document.createElement("canvas");
			canvas.width = canvas.height = SPRITE;
			const c = canvas.getContext("2d")!;
			const g = c.createRadialGradient(SPRITE / 2, SPRITE / 2, 0, SPRITE / 2, SPRITE / 2, SPRITE / 2);
			g.addColorStop(0, `rgba(${tint}, 1)`);
			if (solid) g.addColorStop(solid, `rgba(${tint}, ${i === 2 ? 0.9 : 1})`);
			g.addColorStop(half, `rgba(${tint}, ${i === 2 ? 0.55 : 0.5})`);
			g.addColorStop(end, `rgba(${tint}, 0)`);
			c.fillStyle = g;
			c.fillRect(0, 0, SPRITE, SPRITE);
			return canvas;
		});
	};

	const place = (f: Flake, air: Air, y: number) => {
		// a great many far off, a few close: z bunches towards 0
		const z = Math.random() ** 1.6;
		const unit = Math.min(1.5, Math.max(0.75, air.viewH / 900));
		// (room either side for the wind to bring them in from)
		f.x = air.x - air.w * 0.25 + Math.random() * air.w * 1.5;
		f.y = y;
		f.z = z;
		f.r = (1 + 2.4 * z * z) * unit * (wet ? 0.85 : 1);
		f.fall = (FALL[0] + (FALL[1] - FALL[0]) * z) * unit * (0.85 + 0.3 * Math.random());
		f.sway = (3 + 13 * Math.random()) * (0.4 + 0.6 * z) * unit;
		f.rate = 0.7 + 1.6 * Math.random();
		f.phase = Math.random() * 6.283;
		f.pan = 0.27 + 0.4 * z;
		f.soft = z > 0.9 ? 2 : z > 0.45 ? 1 : 0;
		f.alpha = f.soft === 2 ? 0.3 : 0.5 + 0.5 * z;
		if (f.soft === 2) f.r *= 1.9;
		return f;
	};

	// a drift for a surface, with some snow on it already if it's snowing
	const driftOf = (s: Surface, deep: number) => {
		const width = s.right - s.left;
		let d = drifts.get(s.el);
		if (d && Math.abs(d.width - width) < 1) return d;
		const n = Math.max(2, Math.ceil(width / COLUMN));
		const heights = new Float32Array(n);
		if (amount > 0 && !wet) {
			const base = 0.45 + 0.3 * Math.random();
			const a = Math.random() * 6.283;
			const b = Math.random() * 6.283;
			for (let i = 0; i < n; i++) {
				const t = i / n;
				heights[i] =
					deep *
					Math.min(1, amount) *
					base *
					(0.8 + 0.2 * Math.sin(a + t * 9) + 0.12 * Math.sin(b + t * 23));
			}
		}
		d = { heights, width };
		drifts.set(s.el, d);
		return d;
	};

	return {
		/** How hard it's snowing (0 for not), and whether it's the wet kind. */
		set(to: number, isWet: boolean) {
			amount = to;
			wet = isWet;
		},

		/** Anything to draw: snow falling, or still lying. */
		active: () => amount > 0 || flakes.length > 0 || lying,

		step(air: Air) {
			const { dt, time } = air;
			const unit = Math.min(1.5, Math.max(0.75, air.viewH / 900));
			const deep = DEPTH * unit * (amount > 1.3 ? 1.3 : 1) * (wet ? 0.3 : 1);
			const bottom = air.y + air.h;

			// as many flakes as it's snowing hard; when it stops, the ones in
			// the air fade away
			inAir =
				amount > 0
					? Math.min(1, inAir + dt / (CLEAR_S * 0.6))
					: Math.max(0, inAir - dt / CLEAR_S);
			if (inAir <= 0) flakes.length = 0;
			if (!primed) falling = amount;
			else falling += Math.sign(amount - falling) * Math.min(Math.abs(amount - falling), dt * 0.9);
			const want = Math.min(
				MAX_FLAKES,
				Math.round(air.w * air.h * DENSITY * falling * air.plenty)
			);
			while (flakes.length < want)
				flakes.push(
					place({} as Flake, air, air.y + (primed ? -Math.random() * 0.3 : Math.random()) * air.h)
				);
			primed = true;

			const speedUp = wet ? 2.7 : 1;
			const carried = air.wind * WIND_PX * (wet ? 0.55 : 1);
			// (still air has slow, slight eddies; a wind has strong ones)
			const eddy = EDDY * (0.55 + Math.min(1.3, Math.abs(air.wind) / 22));
			let kept = 0;
			for (const f of flakes) {
				const prevY = f.y;
				// the eddies: the same for every flake hereabouts
				const eddyX =
					Math.sin(f.y * 0.0062 + time * 0.83) * Math.cos(f.x * 0.0041 - time * 0.57);
				const eddyY = Math.sin(f.x * 0.0053 + time * 0.71 + 1.3);
				const near = 0.35 + 0.65 * f.z;
				const loose = wet ? 0.3 : 1;
				f.y += (f.fall * speedUp + eddyY * eddy * 0.3 * near * loose) * dt;
				f.x +=
					(carried * near +
						eddyX * eddy * near * loose +
						Math.cos(time * f.rate + f.phase) * f.sway * f.rate * loose) *
						dt -
					air.panned * f.pan;

				let gone = f.y - f.r > bottom;
				// blown out one side: back in on the other
				if (f.x < air.x - air.w * 0.3) f.x += air.w * 1.55;
				else if (f.x > air.x + air.w * 1.3) f.x -= air.w * 1.55;

				// the ones at the page's own depth come down on it
				if (!gone && f.z > 0.3 && f.z < 0.9) {
					for (const s of air.surfaces) {
						if (f.x < s.left || f.x > s.right) continue;
						if (prevY - s.prevTop >= 0 || f.y - s.top < 0 || f.y > s.bottom) continue;
						if (Math.random() > SETTLE) continue;
						gone = true;
						if (s.nested) break;
						const d = driftOf(s, deep);
						const at = Math.floor((f.x - s.left) / COLUMN);
						// a flake's worth, spread over its neighbours; less the
						// nearer the drift is to as deep as it gets
						for (let k = -3; k <= 3; k++) {
							const i = at + k;
							if (i < 0 || i >= d.heights.length) continue;
							const room = Math.max(0, 1 - d.heights[i] / deep);
							d.heights[i] += f.r * 0.5 * Math.exp(-(k * k) / 3.2) * room;
						}
						break;
					}
				}

				if (gone) {
					// (no more than it's snowing now)
					if (kept >= want) continue;
					place(f, air, air.y - f.r - Math.random() * 30);
				}
				flakes[kept++] = f;
			}
			flakes.length = kept;

			// the drifts: slump, and thaw
			const thaw = (amount > 0 ? (wet ? THAW_WET : THAW) : THAW_AFTER) * dt;
			const slump = Math.min(0.24, dt * 9);
			lying = false;
			for (const s of air.surfaces) {
				if (s.nested) continue;
				const d = amount > 0 ? driftOf(s, deep) : drifts.get(s.el);
				if (!d) continue;
				const h = d.heights;
				let last = h[0];
				for (let i = 0; i < h.length; i++) {
					const here = h[i];
					const next = i + 1 < h.length ? h[i + 1] : here;
					h[i] = Math.max(0, here + (last + next - 2 * here) * slump - thaw);
					last = here;
					if (h[i] > 0.05) lying = true;
				}
			}
			// while tiles are turning and flying, their snow's out of the way
			const target = air.busy ? 0 : 1;
			shown += (target - shown) * Math.min(1, dt * (air.busy ? 14 : 5));
		},

		draw(ctx: CanvasRenderingContext2D, air: Air) {
			const day = Math.round(air.day * 8) / 8;
			if (day !== spriteDay) drawSprites(day);
			const dim = 0.72 + 0.28 * air.day;

			for (const f of flakes) {
				ctx.globalAlpha = f.alpha * dim * inAir;
				const size = f.r * 2.6;
				ctx.drawImage(sprites[f.soft], f.x - size / 2, f.y - size / 2, size, size);
			}

			if (lying && shown > 0.01) {
				ctx.globalAlpha = 0.94 * shown * (0.8 + 0.2 * air.day);
				ctx.fillStyle = fillStyle;
				ctx.beginPath();
				for (const s of air.surfaces) {
					if (s.nested) continue;
					const d = drifts.get(s.el);
					if (!d) continue;
					const h = d.heights;
					const n = h.length;
					const step = (s.right - s.left) / n;
					ctx.moveTo(s.left, s.top + 0.5);
					for (let i = 0; i < n; i++) {
						// rounded off at either end
						const edge = Math.min(1, (i + 0.5) / 2.5, (n - i - 0.5) / 2.5);
						ctx.lineTo(s.left + (i + 0.5) * step, s.top + 0.5 - h[i] * Math.sqrt(edge));
					}
					ctx.lineTo(s.right, s.top + 0.5);
					ctx.closePath();
				}
				ctx.fill();
			}
			ctx.globalAlpha = 1;
		},

		/** Drop the lot (the canvas is stopping). */
		clear() {
			flakes.length = 0;
		},
	};
}
