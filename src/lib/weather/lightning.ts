// Lightning, every so often, behind the rain.
//
// Each bolt is made up on the spot. The channel is a line from the cloud
// (off the top of the window) to somewhere below, broken at its middle and
// pushed sideways, then each half broken again, and so on down to a few
// pixels: the way a real channel wanders at every scale. Forks leave it at
// a shallow angle, heading the same general way as the channel itself (a
// leader only ever branches forwards), thinner and fainter than what they
// left, fading out towards their tips, and forking again themselves.
//
// It's lit the way a strike is. First the leader feels its way down,
// faint; when it gets there the return stroke lights the whole channel at
// once, overexposed, and dies away in a few hundredths of a second; then
// maybe one or two more strokes down the same channel, weaker, while the
// forks (which only carry the first) are already gone. While it lasts the
// sky around where it left the cloud glows, the photo behind the page
// shows through its dark scrim as if lit, and the rain catches the light
// (src/lib/weather/rain.ts brightens by level()). About a third of the flashes are
// sheet lightning: all of that, with the bolt itself somewhere out of view.
//
// The bolt's glow is real blur rather than fat lines: the channel is drawn
// thin and white, shrunk by halves into a stack of ever smaller copies,
// and those are laid back over it, each stretched to full size (which
// blurs it, the smaller the wider), tinted bluer the further out.
//
// It draws into the rain's canvas (rain.ts calls draw() each frame, before
// the rain, so the rain falls in front) and so stops when the rain does:
// with prefers-reduced-motion there's no lightning at all. A strike is
// never more than three flashes, and strikes are seconds apart, which
// keeps it inside the three-flashes-a-second limit for flashing content.
//
// The canvas runs past the window (under the browser's toolbars), but a
// bolt is always placed in the part of it that's on screen: it comes in
// over the top edge, and its channel stays between the sides all the way
// down. Only its forks are free to run off the edge. And it belongs to the
// sky, so when the home page pans it goes with the photo, not the window.

import { photoTurn } from "../accent";

const FIRST_MS: [number, number] = [2_000, 6_500]; // until the first one
const GAP_MS: [number, number] = [12_000, 38_000]; // between strikes
const FOLLOW_UP = 0.22; // chance of another flash on the heels of one
const FOLLOW_UP_MS: [number, number] = [1_100, 2_600];
const SHEET = 0.3; // share of flashes with no bolt in view

const GRAIN = 7; // px: how short the channel's pieces get
const SWAY = 0.13; // how far the first break can go, as a share of the length
const ROUGH = 0.56; // how much of that each further halving keeps
const CORE = 2; // px: the main channel's width (at a 900px tall window)
const MAX_DEPTH = 3; // forks of forks of forks

const LEADER_MS: [number, number] = [90, 170];
const LEADER_LEVEL = 0.22;
const PEAK = 1.4; // the first return stroke, overexposed
const PHOTO_LIT = 0.5; // how far the photo shows through at full flash
const SKY_LIT = 0.42; // the glow in the cloud, likewise

// The bloom: one entry per halving of the channel's picture, from the
// tightest glow out to the widest. `peak` is roughly how bright that layer
// gets right beside the channel.
const BLOOM: { tint: string; peak: number }[] = [
	{ tint: "rgb(236, 241, 255)", peak: 0.6 },
	{ tint: "rgb(208, 219, 255)", peak: 0.42 },
	{ tint: "rgb(176, 191, 255)", peak: 0.3 },
	{ tint: "rgb(148, 164, 255)", peak: 0.23 },
	{ tint: "rgb(126, 141, 250)", peak: 0.18 },
	{ tint: "rgb(112, 124, 240)", peak: 0.14 },
];
const BLOOM_PAD = 110; // px of room round the bolt for the widest of them
const RISE = 80; // px above the window that a bolt starts
const LAYER_SCALE = 1.5; // the bolt's picture, in device px per px, at most

/**
 * The flash, for whoever else is lit by it (the drawn sky, src/lib/weather/sky.ts,
 * whose clouds it lights from inside): how bright right now, 0 to 1, and
 * where in the picture, in window-heights from the photo layer's top left.
 */
export const flash = { level: 0, x: 0.5, y: 0 };

interface Pt {
	x: number;
	y: number;
}

// a stretch of channel drawn in one go: one width, one brightness
interface Run {
	pts: Pt[];
	w: number;
	a: number;
}

// a finished picture of part of the bolt, and where it goes
interface Layer {
	canvas: HTMLCanvasElement;
	x: number;
	y: number;
	w: number;
	h: number;
}

interface Stroke {
	at: number; // ms into the strike
	a: number;
	tau: number; // ms, how fast it dies away
}

interface Strike {
	t0: number;
	leader: number; // ms the leader takes; 0 for sheet lightning
	strokes: Stroke[];
	end: number;
	top: number; // the bolt's extent, for the leader's way down
	bottom: number;
	main: Layer | null;
	forks: Layer | null;
	glows: { x: number; y: number; r: number; a: number }[];
	photo: HTMLCanvasElement | null; // the photo behind, as this one lights it
	anchor: number; // where the photo's left edge was when it struck
	power: number; // sheet lightning is dimmer
}

/**
 * Where the lightning is drawn: the canvas's area in its own coordinates,
 * and `view`, the part of that which is the visible window.
 */
export interface Sky {
	x: number;
	y: number;
	w: number;
	h: number;
	dpr: number;
	view: { x: number; y: number; w: number; h: number };
}

const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
// bunched round the middle, like most things
const bell = () => Math.random() + Math.random() - 1;

// A jagged line from a to b: break it at the middle, push the break
// sideways, and do the same to both halves, a little less each time.
function jagged(a: Pt, b: Pt, sway: number): Pt[] {
	let pts = [a, b];
	let piece = Math.hypot(b.x - a.x, b.y - a.y);
	let reach = piece * sway;
	while (piece > GRAIN) {
		const next = [pts[0]];
		for (let i = 1; i < pts.length; i++) {
			const p = pts[i - 1];
			const q = pts[i];
			const len = Math.hypot(q.x - p.x, q.y - p.y) || 1;
			const off = bell() * reach;
			next.push(
				{
					x: (p.x + q.x) / 2 - ((q.y - p.y) / len) * off,
					y: (p.y + q.y) / 2 + ((q.x - p.x) / len) * off,
				},
				q
			);
		}
		pts = next;
		piece /= 2;
		reach *= ROUGH;
	}
	return pts;
}

// Keep a path between two sides: slid across if it strays over one, and
// squeezed first if it's wider than the gap between them altogether.
function fit(pts: Pt[], left: number, right: number) {
	let lo = Infinity;
	let hi = -Infinity;
	for (const p of pts) {
		lo = Math.min(lo, p.x);
		hi = Math.max(hi, p.x);
	}
	const mid = (lo + hi) / 2;
	const squeeze = Math.min(1, Math.max(1, right - left) / Math.max(1, hi - lo));
	const half = ((hi - lo) / 2) * squeeze;
	let slide = 0;
	if (mid - half < left) slide = left - (mid - half);
	else if (mid + half > right) slide = right - (mid + half);
	if (squeeze === 1 && slide === 0) return;
	for (const p of pts) p.x = mid + (p.x - mid) * squeeze + slide;
}

const lengthOf = (pts: Pt[], from = 0) => {
	let sum = 0;
	for (let i = from + 1; i < pts.length; i++)
		sum += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
	return sum;
};

// Cut a path into runs for drawing, thinning along its length:
//   "ground"  the main channel, all the way down: only a little thinner
//   "air"     a main channel that ends in mid-air: holds for the first
//             half, then thins and fades out, rather than just stopping
//   "fork"    tapers to nothing at its tip
type Taper = "ground" | "air" | "fork";

function runsOf(pts: Pt[], width: number, alpha: number, taper: Taper) {
	const runs: Run[] = [];
	const step = 5;
	for (let i = 0; i < pts.length - 1; i += step) {
		const t = Math.min(1, (i + step / 2) / (pts.length - 1));
		let w = width;
		let a = alpha;
		if (taper === "fork") {
			w *= 1 - 0.6 * t;
			a *= (1 - t) ** 0.8;
		} else if (taper === "air") {
			const tail = Math.max(0, t - 0.5) / 0.5;
			w *= 1 - 0.2 * t - 0.5 * tail;
			a *= 1 - 0.9 * tail ** 1.4;
		} else {
			w *= 1 - 0.3 * t;
		}
		runs.push({ pts: pts.slice(i, i + step + 1), w: Math.max(0.5, w), a });
	}
	return runs;
}

// The forks off a path, and theirs, into `out`.
function fork(
	out: Run[],
	path: Pt[],
	width: number,
	alpha: number,
	depth: number,
	count: number
) {
	const total = lengthOf(path);
	for (let n = 0; n < count; n++) {
		// not right at either end; the main channel forks all the way down,
		// a fork mostly near where it began
		const at = depth === 1 ? rand(0.07, 0.86) : rand(0.1, 0.7);
		const i = Math.min(
			path.length - 2,
			Math.max(1, Math.round(at * (path.length - 1)))
		);
		const p = path[i];
		const left = lengthOf(path, i);
		const len = Math.min(left * rand(0.2, 0.6), total * 0.6);
		if (len < 30) continue;

		// the way the path is heading there (over a few pieces, not just the
		// one), turned aside, and pulled a little towards straight down
		const before = path[Math.max(0, i - 4)];
		const after = path[Math.min(path.length - 1, i + 4)];
		const heading = Math.atan2(after.y - before.y, after.x - before.x);
		const turn = rand(0.3, 0.9) * (Math.random() < 0.5 ? -1 : 1);
		let dx = Math.cos(heading + turn);
		let dy = Math.sin(heading + turn) + 0.3;
		const norm = Math.hypot(dx, dy) || 1;
		dx /= norm;
		dy /= norm;

		const branch = jagged(
			p,
			{ x: p.x + dx * len, y: p.y + dy * len },
			SWAY * 1.25
		);
		// the forks off the main channel are nearly its equal; theirs less so
		const w = width * (depth === 1 ? 0.72 : 0.6);
		const a = alpha * (depth === 1 ? rand(0.6, 0.9) : rand(0.5, 0.8));
		out.push(...runsOf(branch, w, a, "fork"));
		if (depth < MAX_DEPTH && len > 90)
			fork(
				out,
				branch,
				w,
				a,
				depth + 1,
				Math.round(rand(0, depth === 1 ? 3.4 : 1.6))
			);
	}
}

// What CSS's hue-rotate() does to a colour, done to pixels (r, g, b, a,
// r, g...) in place: the same matrix (Filter Effects, feColorMatrix
// hueRotate), on the same sRGB values, so a canvas comes out the colour
// the filter makes the element behind it.
function hueRotate(px: Uint8ClampedArray, deg: number) {
	const cos = Math.cos((deg * Math.PI) / 180);
	const sin = Math.sin((deg * Math.PI) / 180);
	const m = [
		0.213 + cos * 0.787 - sin * 0.213,
		0.715 - cos * 0.715 - sin * 0.715,
		0.072 - cos * 0.072 + sin * 0.928,
		0.213 - cos * 0.213 + sin * 0.143,
		0.715 + cos * 0.285 + sin * 0.14,
		0.072 - cos * 0.072 - sin * 0.283,
		0.213 - cos * 0.213 - sin * 0.787,
		0.715 - cos * 0.715 + sin * 0.715,
		0.072 + cos * 0.928 + sin * 0.072,
	];
	for (let i = 0; i < px.length; i += 4) {
		const [r, g, b] = [px[i], px[i + 1], px[i + 2]];
		px[i] = m[0] * r + m[1] * g + m[2] * b;
		px[i + 1] = m[3] * r + m[4] * g + m[5] * b;
		px[i + 2] = m[6] * r + m[7] * g + m[8] * b;
	}
}

const sheet = (width: number, height: number) => {
	const canvas = document.createElement("canvas");
	canvas.width = Math.max(1, Math.ceil(width));
	canvas.height = Math.max(1, Math.ceil(height));
	return canvas;
};

// Draw runs, then give them their glow. `core` is the main channel's
// width: the glow is worked out for a line that thick, so thinner, fainter
// forks come out with less of it, as they should.
function bake(runs: Run[], core: number, sky: Sky): Layer | null {
	let x0 = Infinity;
	let y0 = Infinity;
	let x1 = -Infinity;
	let y1 = -Infinity;
	for (const run of runs)
		for (const p of run.pts) {
			x0 = Math.min(x0, p.x);
			y0 = Math.min(y0, p.y);
			x1 = Math.max(x1, p.x);
			y1 = Math.max(y1, p.y);
		}
	if (x0 > x1) return null;
	// no further than the canvas goes (plus the glow's room)
	x0 = Math.max(x0, sky.x) - BLOOM_PAD;
	y0 = Math.max(y0, sky.y) - BLOOM_PAD;
	x1 = Math.min(x1, sky.x + sky.w) + BLOOM_PAD;
	y1 = Math.min(y1, sky.y + sky.h) + BLOOM_PAD;
	const w = x1 - x0;
	const h = y1 - y0;
	if (w <= 0 || h <= 0) return null;
	const scale = Math.min(sky.dpr, LAYER_SCALE);

	// the channel itself: thin, white, sharp
	const sharp = sheet(w * scale, h * scale);
	const pen = sharp.getContext("2d")!;
	pen.setTransform(scale, 0, 0, scale, -x0 * scale, -y0 * scale);
	pen.strokeStyle = "#fff";
	pen.lineJoin = "round";
	for (const run of runs) {
		pen.globalAlpha = Math.min(1, run.a);
		pen.lineWidth = run.w;
		pen.beginPath();
		pen.moveTo(run.pts[0].x, run.pts[0].y);
		for (let i = 1; i < run.pts.length; i++)
			pen.lineTo(run.pts[i].x, run.pts[i].y);
		pen.stroke();
	}

	// smaller and smaller copies of it, each half the last (the first of
	// them half of one px per px, whatever the screen's density, so the
	// glow is as wide on any screen)
	const shrink = (from: HTMLCanvasElement, width: number, height: number) => {
		const small = sheet(width, height);
		const c = small.getContext("2d")!;
		c.imageSmoothingEnabled = true;
		c.imageSmoothingQuality = "high";
		c.drawImage(from, 0, 0, small.width, small.height);
		return small;
	};
	const steps: HTMLCanvasElement[] = [];
	const base = scale > 1 ? shrink(sharp, w, h) : sharp;
	let last = base;
	for (let k = 0; k < BLOOM.length; k++) {
		last = shrink(last, w / 2 ** (k + 1), h / 2 ** (k + 1));
		steps.push(last);
	}

	// ...laid back over each other, each in its colour, from the smallest
	// up: what there is so far is stretched to twice its size and the next
	// copy added to it. Stretching is what blurs, and going up a doubling
	// at a time (rather than each straight to full size) is what keeps the
	// blur smooth instead of blotchy. A line `core` wide, blurred out to
	// 2^k px, is only core / 2^k as bright as it was, so each copy is put
	// down as many times as it takes to reach its `peak`.
	let glow: HTMLCanvasElement | null = null;
	for (let k = BLOOM.length - 1; k >= 0; k--) {
		const small = steps[k];
		const tint = small.getContext("2d")!;
		tint.globalCompositeOperation = "source-in";
		tint.fillStyle = BLOOM[k].tint;
		tint.fillRect(0, 0, small.width, small.height);

		const merged = sheet(small.width, small.height);
		const c = merged.getContext("2d")!;
		c.imageSmoothingEnabled = true;
		c.imageSmoothingQuality = "high";
		c.globalCompositeOperation = "lighter";
		if (glow) {
			c.drawImage(glow, 0, 0, merged.width, merged.height);
			glow.width = glow.height = 0;
		}
		const gain = (BLOOM[k].peak * 2 ** (k + 1)) / core;
		const times = Math.ceil(gain);
		c.globalAlpha = gain / times;
		for (let n = 0; n < times; n++) c.drawImage(small, 0, 0);
		glow = merged;
	}

	// and over the glow, the channel itself
	const canvas = sheet(w * scale, h * scale);
	const out = canvas.getContext("2d")!;
	out.imageSmoothingEnabled = true;
	out.imageSmoothingQuality = "high";
	out.globalCompositeOperation = "lighter";
	if (glow) {
		out.drawImage(glow, 0, 0, canvas.width, canvas.height);
		glow.width = glow.height = 0;
	}
	out.drawImage(sharp, 0, 0);

	// (free the working copies now rather than whenever)
	for (const c of [sharp, base, ...steps]) c.width = c.height = 0;
	return { canvas, x: x0, y: y0, w, h };
}

export function createLightning() {
	const photoEl = document.querySelector<HTMLElement>(".page-bg-photo");

	// The photo behind the page, as lightning shows it: brightest in the
	// sky, nothing by the bottom (where the page's scrim has it fully dark
	// anyway). Drawn over the real one for as long as a flash lasts. And
	// turned to the same hue as the real one, where the accent has turned
	// that (src/lib/accent.ts): `plain` is it as it comes.
	let plain: HTMLCanvasElement | null = null;
	let photo: HTMLCanvasElement | null = null;
	const retint = () => {
		if (!plain) return;
		const deg = photoTurn();
		const turned = deg ? sheet(plain.width, plain.height) : null;
		const from = plain.getContext("2d");
		const to = turned?.getContext("2d");
		if (photo && photo !== plain) photo.width = photo.height = 0;
		if (!turned || !from || !to) {
			photo = plain;
			return;
		}
		const pixels = from.getImageData(0, 0, plain.width, plain.height);
		hueRotate(pixels.data, deg);
		to.putImageData(pixels, 0, 0);
		photo = turned;
	};
	// (no storm, no photo wanted: it's fetched when there's first lightning to light it)
	let asked = false;
	const img = new Image();
	img.decoding = "async";
	img.onload = () => {
		const canvas = sheet(img.naturalWidth, img.naturalHeight);
		const c = canvas.getContext("2d");
		if (!c) return;
		c.drawImage(img, 0, 0);
		const fade = c.createLinearGradient(0, 0, 0, canvas.height);
		fade.addColorStop(0, "rgba(0, 0, 0, 1)");
		fade.addColorStop(0.55, "rgba(0, 0, 0, 0.45)");
		fade.addColorStop(0.9, "rgba(0, 0, 0, 0)");
		c.globalCompositeOperation = "destination-in";
		c.fillStyle = fade;
		c.fillRect(0, 0, canvas.width, canvas.height);
		plain = canvas;
		retint();
	};
	const fetchPhoto = () => {
		if (asked) return;
		asked = true;
		img.src = "/bg-rain.webp";
	};

	// where the photo is on screen: its size is the element's, covered
	const placed = () => {
		if (!photo || !photoEl) return null;
		const r = photoEl.getBoundingClientRect();
		const scale = Math.max(r.width / photo.width, r.height / photo.height);
		const w = photo.width * scale;
		const h = photo.height * scale;
		return {
			x: r.left + (r.width - w) / 2,
			y: r.top + (r.height - h) / 2,
			w,
			h,
			scale,
		};
	};

	// ...and that photo as one flash lights it: fully near where the light
	// is, less and less with distance (but some of it everywhere)
	const litBy = (x: number, y: number, reach: number) => {
		const at = placed();
		if (!photo || !at) return null;
		const canvas = sheet(photo.width, photo.height);
		const c = canvas.getContext("2d");
		if (!c) return null;
		c.drawImage(photo, 0, 0);
		const px = (x - at.x) / at.scale;
		const py = (y - at.y) / at.scale;
		const falloff = c.createRadialGradient(px, py, 0, px, py, reach / at.scale);
		falloff.addColorStop(0, "rgba(0, 0, 0, 1)");
		falloff.addColorStop(0.35, "rgba(0, 0, 0, 0.8)");
		falloff.addColorStop(1, "rgba(0, 0, 0, 0.34)");
		c.globalCompositeOperation = "destination-in";
		c.fillStyle = falloff;
		c.fillRect(0, 0, canvas.width, canvas.height);
		return canvas;
	};

	let strike: Strike | null = null;
	// how often: 1 is a strike every GAP_MS or so, 2 twice as often, 0 never
	// (it's only a storm that has any: src/lib/weather/index.ts)
	let rate = 1;
	let nextAt = performance.now() + rand(...FIRST_MS);
	let level = 0;

	const begin = (now: number, sky: Sky) => {
		const view = sky.view;
		const unit = Math.min(1.5, Math.max(0.7, view.h / 900)) * rand(0.8, 1.2);
		const core = CORE * unit;
		const glows: Strike["glows"] = [];
		let main: Layer | null = null;
		let forks: Layer | null = null;
		let top = view.y;
		let bottom = view.y + view.h;
		const isSheet = Math.random() < SHEET;

		if (isSheet) {
			// in the cloud somewhere over the window
			glows.push({
				x: view.x + view.w * rand(0.1, 0.9),
				y: view.y + view.h * rand(-0.3, 0.12),
				r: Math.max(view.w, view.h) * rand(0.7, 1.1),
				a: 1,
			});
		} else {
			// out of the cloud above the window, down to the ground somewhere
			// below it, or to nowhere in particular in the air
			const from = { x: view.x + view.w * rand(0.12, 0.88), y: view.y - RISE };
			const to = {
				// (a narrow window hasn't the room for it to lean far)
				x: from.x + Math.min(view.h * 0.3, view.w * 0.4) * rand(-1, 1),
				y:
					view.y +
					view.h * (Math.random() < 0.6 ? rand(1.02, 1.12) : rand(0.5, 0.92)),
			};
			const grounded = to.y >= view.y + view.h;
			const channel = jagged(from, to, SWAY);
			// all of it on screen, wherever its wandering took it
			const edge = Math.max(12, view.w * 0.05);
			fit(channel, view.x + edge, view.x + view.w - edge);
			const head = channel[0];
			const foot = channel[channel.length - 1];
			const branches: Run[] = [];
			fork(branches, channel, core, 1, 1, Math.round(rand(4, 9)));
			main = bake(
				runsOf(channel, core, 1, grounded ? "ground" : "air"),
				core,
				sky
			);
			forks = bake(branches, core, sky);
			// how far down any of it goes, for the leader to cover
			let lowest = foot.y;
			for (const run of branches)
				for (const p of run.pts) lowest = Math.max(lowest, p.y);
			top = head.y;
			bottom = Math.min(view.y + view.h, lowest);
			// where it left the cloud, and (fainter) where it came down
			glows.push({
				x: head.x,
				y: view.y - view.h * 0.08,
				r: view.h * rand(0.75, 1),
				a: 1,
			});
			if (grounded)
				glows.push({ x: foot.x, y: view.y + view.h, r: view.h * 0.4, a: 0.45 });
		}

		// the return strokes: the first as soon as the leader's down, then
		// up to two more down the same channel
		const leader = isSheet ? 0 : rand(...LEADER_MS);
		const strokes: Stroke[] = [{ at: leader, a: PEAK, tau: rand(50, 75) }];
		for (const chance of [0.75, 0.35]) {
			if (Math.random() > chance) break;
			const prev = strokes[strokes.length - 1];
			strokes.push({
				at: prev.at + rand(55, 120),
				a: rand(0.45, 0.95),
				tau: rand(55, 90),
			});
		}
		const lastStroke = strokes[strokes.length - 1];
		lastStroke.tau *= 1.7; // the last one lingers
		// (anything on the page that minds lightning hears of it as the bolt
		// lands, which is the leader's length after it sets out: the cat)
		setTimeout(() => window.dispatchEvent(new Event("lightning")), leader);
		strike = {
			t0: now,
			leader,
			strokes,
			end: lastStroke.at + lastStroke.tau * 6,
			top,
			bottom,
			main,
			forks,
			glows,
			photo: litBy(
				glows[0].x,
				view.y + view.h * 0.3,
				Math.max(view.w, view.h) * 1.1
			),
			anchor: photoEl?.getBoundingClientRect().left ?? 0,
			power: isSheet ? rand(0.45, 0.8) : 1,
		};
	};

	const finish = (now: number) => {
		if (strike) {
			// (free the pictures now rather than whenever)
			for (const layer of [strike.main, strike.forks])
				if (layer) layer.canvas.width = layer.canvas.height = 0;
			if (strike.photo) strike.photo.width = strike.photo.height = 0;
		}
		strike = null;
		level = 0;
		flash.level = 0;
		nextAt =
			rate <= 0
				? Infinity
				: now +
					(Math.random() < FOLLOW_UP
						? rand(...FOLLOW_UP_MS)
						: rand(...GAP_MS) / rate);
	};

	const put = (
		ctx: CanvasRenderingContext2D,
		layer: Layer | null,
		amount: number
	) => {
		// past 1 it's overexposed: the picture is laid on again
		for (let left = amount; layer && left > 0.004; left -= 1) {
			ctx.globalAlpha = Math.min(1, left);
			ctx.drawImage(layer.canvas, layer.x, layer.y, layer.w, layer.h);
		}
	};

	return {
		/** How brightly the scene is lit right now, 0 to 1. */
		level: () => level,

		/** How often it strikes: 1 as often as it used to, 0 never. */
		setRate(to: number) {
			if (to > 0) fetchPhoto();
			if (to === rate) return;
			const was = rate;
			rate = to;
			if (strike) return; // (finish() works out the next from the new rate)
			const now = performance.now();
			if (to <= 0) nextAt = Infinity;
			else if (was <= 0) nextAt = now + rand(...FIRST_MS) / Math.max(1, to);
			else nextAt = now + ((nextAt - now) * was) / to;
		},

		/** The photo's hue has been turned, or turned back: turn the copy here too. */
		retint,

		/** Draw this frame's lightning, if there is any. Call on a cleared canvas. */
		draw(ctx: CanvasRenderingContext2D, now: number, sky: Sky) {
			if (!strike) {
				if (now < nextAt) return;
				fetchPhoto();
				// (after a long gap in frames, a hidden tab mostly: not the
				// instant it's back)
				if (now - nextAt > 3000) {
					nextAt = now + rand(2_000, 9_000);
					return;
				}
				begin(now, sky);
			}
			const s = strike!;
			const t = now - s.t0;
			if (t > s.end) {
				finish(now);
				return;
			}

			// how bright the channel and its forks are, and how far down the
			// leader has got
			let bolt = 0;
			let forks = 0;
			let reach = 1;
			if (t < s.leader) {
				const along = t / s.leader;
				reach = along * along * (3 - 2 * along);
				bolt = forks = LEADER_LEVEL * (0.75 + 0.5 * Math.random());
			} else {
				for (const stroke of s.strokes)
					if (t >= stroke.at)
						bolt += stroke.a * Math.exp(-(t - stroke.at) / stroke.tau);
				const first = s.strokes[0];
				forks = first.a * Math.exp(-(t - first.at) / (first.tau * 0.8));
			}
			const lit = Math.min(1, bolt / PEAK) * s.power;
			level = t < s.leader ? lit * 0.5 : lit;
			const winH = window.innerHeight || 1;
			flash.level = level;
			flash.x = (s.glows[0].x - s.anchor) / winH;
			flash.y = s.glows[0].y / winH;

			ctx.save();

			// the photo, showing through
			// (only if the photo's what's there: a drawn sky lights itself)
			const behind = document.documentElement.dataset.backdrop === "photo";
			const at = behind && s.photo && level > 0.004 ? placed() : null;
			if (s.photo && at) {
				ctx.imageSmoothingEnabled = true;
				ctx.imageSmoothingQuality = "high";
				ctx.globalAlpha = level * PHOTO_LIT;
				ctx.drawImage(s.photo, at.x, at.y, at.w, at.h);
			}

			// the rest is in the sky, so it goes where the photo has gone since
			// (sideways: the home page pans it; up and down, the bolt runs
			// from one edge of the window to the other and stays put)
			const pan = photoEl ? photoEl.getBoundingClientRect().left - s.anchor : 0;
			ctx.translate(pan, 0);

			// the glow in the cloud
			ctx.globalCompositeOperation = "lighter";
			for (const glow of s.glows) {
				const g = ctx.createRadialGradient(
					glow.x,
					glow.y,
					0,
					glow.x,
					glow.y,
					glow.r
				);
				g.addColorStop(0, "rgba(206, 218, 255, 1)");
				g.addColorStop(0.22, "rgba(150, 168, 255, 0.5)");
				g.addColorStop(0.55, "rgba(110, 126, 235, 0.16)");
				g.addColorStop(1, "rgba(100, 112, 220, 0)");
				ctx.globalAlpha = Math.min(1, level * SKY_LIT * glow.a * (behind ? 1 : 0.55));
				ctx.fillStyle = g;
				ctx.fillRect(sky.x - pan, sky.y, sky.w, sky.h);
			}

			// the bolt: only as far as the leader has got, while it's still
			// on its way down
			if (reach < 1) {
				ctx.beginPath();
				ctx.rect(
					sky.x - pan,
					sky.y,
					sky.w,
					s.top + (s.bottom - s.top) * reach - sky.y
				);
				ctx.clip();
			}
			put(ctx, s.forks, forks);
			put(ctx, s.main, bolt);

			ctx.restore();
		},

		/** Drop the strike in progress (the canvas is going away, or stopping). */
		cancel() {
			finish(performance.now());
		},
	};
}
