// Ice, in the rain's canvas (src/lib/weather/rain.ts runs it): the two ways it
// comes down.
//
// Pellets (ice pellets, and hail, which is the same thing bigger and
// faster) are hard, so they don't splash: they bounce. One comes straight
// down at speed, hits the top of a tile, and goes back up at a fraction of
// what it came in with and off to one side or the other, then again,
// lower, and after a bounce or three it has nothing left: it lies where it
// stopped for a moment and is gone. One that bounces off the edge of its
// tile carries on down to the next.
//
// Freezing rain is rain until it lands, and ice from then on: everything
// it lands on gets a skin of it. Here that's a bright line along the top
// of every tile, with the odd glint in it, and a row of icicles growing
// from the bottom: each its own length, some places bare, none longer
// than the gap under the tile. They grow slowly, and when the freezing
// rain stops they go the same way.

import type { Air, Surface } from "./falling";

const DENSITY = 1 / 15000; // pellets per px² of canvas, in a moderate fall
const MAX_PELLETS = 260;
const FALL: [number, number] = [640, 900]; // px/s at a 900px window
const HAIL_FALL: [number, number] = [1000, 1400];
const GRAVITY = 2600; // px/s², once one's bounced
const BOUNCE: [number, number] = [0.3, 0.5]; // share of its speed it keeps
const SCATTER = 150; // px/s sideways a bounce can give it
const MAX_BOUNCES = 3;
const REST_S: [number, number] = [0.35, 1]; // how long a spent one lies there
const ICICLE_EVERY = 13; // px between places one might hang
const ICICLE_GROW = 1 / 45; // per second, of its full length
const ICICLE_MELT = 1 / 2.5;

interface Pellet {
	x: number;
	y: number;
	vx: number;
	vy: number;
	r: number;
	bounces: number;
	/** Seconds left lying where it stopped; 0 while it's moving. */
	rest: number;
	restFor: number;
	surface: Surface | null;
}

interface Glaze {
	grown: number; // 0 bare, 1 as iced as it gets
	width: number;
	/** Where its icicles hang (as shares of its width), and how long and wide. */
	icicles: { at: number; len: number; w: number }[];
	glints: { at: number; rate: number; phase: number }[];
}

export function createIce() {
	let amount = 0;
	let hail = false;
	let glazing = false;
	const pellets: Pellet[] = [];
	const glazes = new WeakMap<Element, Glaze>();
	let iced = false; // any glaze anywhere
	let shown = 1;
	let inAir = 1; // what's falling fades out when it stops

	const place = (p: Pellet, air: Air, y: number) => {
		const unit = Math.min(1.5, Math.max(0.75, air.viewH / 900));
		const fall = hail ? HAIL_FALL : FALL;
		p.x = air.x - air.w * 0.1 + Math.random() * air.w * 1.2;
		p.y = y;
		p.vy = (fall[0] + Math.random() * (fall[1] - fall[0])) * unit;
		p.vx = 0;
		p.r = (hail ? 1.7 + Math.random() * 1.9 : 0.9 + Math.random() * 0.9) * unit;
		p.bounces = 0;
		p.rest = 0;
		p.surface = null;
		return p;
	};

	const glazeOf = (s: Surface) => {
		const width = s.right - s.left;
		let g = glazes.get(s.el);
		if (g && Math.abs(g.width - width) < 1) return g;
		const icicles: Glaze["icicles"] = [];
		for (let x = ICICLE_EVERY * (0.4 + Math.random()); x < width - 4; x += ICICLE_EVERY * (0.6 + Math.random() * 1.3)) {
			// (some places bare; most icicles short, a few long)
			if (Math.random() < 0.3) continue;
			icicles.push({ at: x / width, len: 0.25 + 0.75 * Math.random() ** 1.7, w: 1.8 + Math.random() * 1.6 });
		}
		const glints: Glaze["glints"] = [];
		for (let x = 20 + Math.random() * 60; x < width - 10; x += 50 + Math.random() * 130)
			glints.push({ at: x / width, rate: 0.5 + Math.random() * 1.2, phase: Math.random() * 6.283 });
		// (freezing rain that's already falling has already been at it)
		g = { grown: g?.grown ?? (glazing ? 0.55 + 0.3 * Math.random() : 0), width, icicles, glints };
		glazes.set(s.el, g);
		return g;
	};

	return {
		/** How hard the pellets are coming (0 for none), and whether they're hail. */
		set(to: number, isHail: boolean, glaze: boolean) {
			amount = to;
			hail = isHail;
			glazing = glaze;
		},

		active: () => amount > 0 || pellets.length > 0 || glazing || iced,

		step(air: Air) {
			const { dt } = air;
			const bottom = air.y + air.h;
			const want = Math.min(
				MAX_PELLETS,
				Math.round(air.w * air.h * DENSITY * amount * (hail ? 0.5 : 1) * air.plenty)
			);
			while (pellets.length < want)
				pellets.push(place({} as Pellet, air, air.y + Math.random() * air.h));

			inAir = amount > 0 ? Math.min(1, inAir + dt * 2) : Math.max(0, inAir - dt * 1.4);
			if (inAir <= 0) pellets.length = 0;
			const drift = air.wind * 1.6;
			let kept = 0;
			for (const p of pellets) {
				let gone = false;
				if (p.rest > 0) {
					// lying on its tile, going where the tile goes
					p.rest -= dt;
					const s = p.surface;
					if (!s || s.gone || p.rest <= 0) gone = true;
					else {
						p.x += s.left - s.prevLeft;
						p.y = s.top - p.r;
					}
				} else {
					const prevY = p.y;
					if (p.bounces > 0) p.vy += GRAVITY * dt;
					p.y += p.vy * dt;
					p.x += (p.vx + (p.bounces ? 0 : drift)) * dt - air.panned * 0.5;
					if (p.vy > 0) {
						for (const s of air.surfaces) {
							if (p.x < s.left || p.x > s.right) continue;
							if (prevY - s.prevTop >= 0 || p.y - s.top < 0 || p.y > s.bottom) continue;
							p.bounces++;
							const back = p.vy * (BOUNCE[0] + Math.random() * (BOUNCE[1] - BOUNCE[0]));
							if (p.bounces > MAX_BOUNCES || back < 70) {
								p.rest = p.restFor = REST_S[0] + Math.random() * (REST_S[1] - REST_S[0]);
								p.surface = s;
								p.vx = p.vy = 0;
							} else {
								p.vy = -back;
								p.vx = p.vx * 0.5 + (Math.random() * 2 - 1) * SCATTER;
							}
							p.y = s.top - p.r;
							break;
						}
					}
					if (p.y - p.r > bottom) gone = true;
				}
				if (gone) {
					if (kept >= want) continue;
					place(p, air, air.y - 10 - Math.random() * 60);
				}
				pellets[kept++] = p;
			}
			pellets.length = kept;

			// the glaze: on its way, or on its way out
			iced = false;
			if (glazing || amount === 0) {
				for (const s of air.surfaces) {
					if (s.nested) continue;
					const g = glazing ? glazeOf(s) : glazes.get(s.el);
					if (!g) continue;
					g.grown = glazing
						? Math.min(1, g.grown + ICICLE_GROW * dt)
						: Math.max(0, g.grown - ICICLE_MELT * dt);
					if (g.grown > 0.01) iced = true;
				}
			}
			const target = air.busy ? 0 : 1;
			shown += (target - shown) * Math.min(1, dt * (air.busy ? 14 : 5));
		},

		draw(ctx: CanvasRenderingContext2D, air: Air) {
			const dim = 0.7 + 0.3 * air.day;

			if (iced && shown > 0.01) {
				const unit = Math.min(1.5, Math.max(0.75, air.viewH / 900));
				const reach = 7 * unit; // the longest icicle: just short of the next tile
				// the skin on top
				ctx.strokeStyle = "rgb(214, 232, 255)";
				ctx.lineWidth = 1.25;
				ctx.lineCap = "round";
				for (const s of air.surfaces) {
					if (s.nested) continue;
					const g = glazes.get(s.el);
					if (!g || g.grown <= 0.01) continue;
					ctx.globalAlpha = 0.5 * g.grown * shown * dim;
					ctx.beginPath();
					ctx.moveTo(s.left + 1, s.top - 0.4);
					ctx.lineTo(s.right - 1, s.top - 0.4);
					ctx.stroke();
				}
				// the icicles under it
				ctx.fillStyle = "rgb(204, 226, 255)";
				for (const s of air.surfaces) {
					if (s.nested) continue;
					const g = glazes.get(s.el);
					if (!g || g.grown <= 0.01) continue;
					const width = s.right - s.left;
					ctx.globalAlpha = 0.6 * shown * dim;
					ctx.beginPath();
					for (const icicle of g.icicles) {
						const x = s.left + icicle.at * width;
						const len = reach * icicle.len * g.grown;
						if (len < 0.8) continue;
						const half = (icicle.w / 2) * Math.min(1, 0.4 + g.grown);
						ctx.moveTo(x - half, s.bottom);
						ctx.lineTo(x + half, s.bottom);
						// (not quite a triangle: an icicle's sides are a little hollow)
						ctx.quadraticCurveTo(x + half * 0.25, s.bottom + len * 0.45, x, s.bottom + len);
						ctx.quadraticCurveTo(x - half * 0.25, s.bottom + len * 0.45, x - half, s.bottom);
					}
					ctx.fill();
					// glints, coming and going
					ctx.fillStyle = "#fff";
					for (const glint of g.glints) {
						const a = Math.max(0, Math.sin(air.time * glint.rate + glint.phase)) ** 6;
						if (a < 0.05) continue;
						ctx.globalAlpha = a * 0.9 * g.grown * shown * dim;
						const x = s.left + glint.at * width;
						ctx.fillRect(x - 1.5, s.top - 1, 3, 1);
						ctx.fillRect(x - 0.5, s.top - 2, 1, 3);
					}
					ctx.fillStyle = "rgb(204, 226, 255)";
				}
			}

			if (pellets.length) {
				ctx.fillStyle = "rgb(236, 243, 255)";
				ctx.strokeStyle = "rgb(236, 243, 255)";
				ctx.lineCap = "round";
				// what's falling is a streak (it's quick), what's bounced or
				// stopped a bead
				ctx.globalAlpha = 0.5 * dim * inAir;
				for (const p of pellets) {
					if (p.rest > 0 || p.bounces > 0) continue;
					ctx.lineWidth = p.r * 1.5;
					ctx.beginPath();
					ctx.moveTo(p.x, p.y - p.vy * 0.016);
					ctx.lineTo(p.x, p.y);
					ctx.stroke();
				}
				for (const p of pellets) {
					if (p.rest <= 0 && p.bounces === 0) continue;
					ctx.globalAlpha =
						(p.rest > 0 ? Math.min(1, (p.rest / p.restFor) * 2) : 1) * 0.9 * dim * inAir;
					ctx.beginPath();
					ctx.arc(p.x, p.y, p.r, 0, 6.283);
					ctx.fill();
				}
			}
			ctx.globalAlpha = 1;
		},

		clear() {
			pellets.length = 0;
		},
	};
}
