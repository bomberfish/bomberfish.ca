// Minimal rain, loosely after the iOS Weather app: thin slanted streaks in
// screen space that splash on the top edges of the page's tiles. Hit testing
// is done relative to each card's own motion, so scrolling a card up into
// the rain splashes too, not just drops falling onto a still card.
//
// Cards don't stop rain outright: each one a drop crosses soaks up part of
// its strength (splashing in proportion) and it carries on, fainter, until
// a few cards later there's nothing left of it.
//
// Like Weather, there's also a denser, fainter, slower back layer that
// ignores the cards entirely (it reads as rain further away), only some
// hits splash, and splash droplets hang around for a second or so: a small
// arc up, then they settle back on the edge they came from and fade.
//
// Rain that misses every card just falls out of the bottom of the window:
// the page has no ground for it to land on.
//
// Now and then there's lightning (src/lib/weather/lightning.ts). It's drawn here,
// into the same canvas and behind the rain, which catches its light.
//
// The rain has depth. When the home page's panorama pans, the rain goes
// the same way, but by less than the tiles do, and by less still the
// further off a drop is: the far layer hardly more than the photo behind
// it, the nearest drops of the front layer more than half as far as the
// tiles. That's all a pan does to it: it's the camera moving, not the rain,
// so every streak keeps the angle it's falling at.

import type { Air, Surface } from "./falling";
import { gpuQuality, startGpu, type Quality } from "./gpu";
import { createIce } from "./ice";
import { scene, type Scene } from "./index";
import { createLightning, type Sky } from "./lightning";
import { createSnow } from "./snow";

// Anything that reads as a solid panel the rain can land on: tiles first
// of all (a date tile on the blog list is one too).
const SURFACES =
	".tile, .background-container, .buttons-section, .blog-date, .blog-year, .rain-surface";

// How much rain, how it leans and whether there's lightning are the
// weather's doing (src/lib/weather/index.ts): a drizzle is a few fine slow
// drops, a downpour twice the usual number, longer and faster, and the
// lean is the wind's, gusts and all. Snow and ice fall in the same canvas
// (snow.ts, ice.ts), on the same tiles.
const DENSITY = 1 / 100; // drops per px² of viewport, in moderate rain
const MAX_DROPS = 180; // ...and at most, in moderate rain
const DROPS_LIMIT = 360; // at most, in any
// ...and all of that (and the snow and the ice) by how much the machine
// can take: gpu.ts sizes up its graphics card, which is as good a measure
// as there is of the rest of it. The sky's drawn to the same scale.
const PLENTY: Record<Quality, number> = { low: 0.5, medium: 0.75, high: 1 };
const WIND_PER_KMH = 1 / 110; // slant (horizontal px per vertical px) per km/h of wind
const MAX_SLANT = 0.7;
const WIND_RANGE = 0.07; // ± slant from the mouse's x position
const WIND_EASE = 2; // per second, how quickly the slant follows the mouse
const ABSORB = 0.5; // share of a drop's remaining strength each card takes
const MIN_STRENGTH = 0.15; // below this the drop is spent (about 3 cards)
const MAX_SPLASHES_PER_FRAME = 24; // keeps a fast scroll from turning into fireworks
// splash droplets alive at once; only a memory backstop, normal rain
// stays well under it
const MAX_PARTICLES = 1500;
// how much brighter the rain gets in a flash of lightning, at its height
const RAIN_LIT = 2.2;

// Parallax with the panorama ([data-m-pano], see bindPano in metro-dreamland):
// how far a drop goes for each px the panorama pans, from the furthest
// drops of a layer to its nearest. The photo behind does 0.25 at most, the
// page's title 0.6, the tiles 1.
const PAN_BACK: [number, number] = [0.27, 0.36];
const PAN_FRONT: [number, number] = [0.42, 0.62];

// back layer: no collisions, so it's just a moving batch of lines
const BACK_DENSITY = 1 / 2000;
const BACK_MAX_DROPS = 1300;
const BACK_MAX_ALPHA = 0.12;

// splashes, after Weather: only some hits splash, and the droplets live
// ~1-1.8s. Speeds are fractions of the viewport height so it looks the
// same on any screen.
const SPLASH_CHANCE = 0.15;
const SPLASH_SPEED = 0.09; // launch, viewport heights/s (+ up to 0.01)
const SPLASH_SPREAD = 0.9; // radians either side of straight up
const GRAVITY = 0.5; // viewport heights/s²
const SPLASH_ORPHAN_LIFE = 0.15; // s; what's left of one whose card went

// Rain doesn't need more than 60fps, and every rain frame also makes the
// browser recompute any backdrop-filter sitting over it (the top blur
// strip, the cards), so on 120Hz+ screens this halves that work too.
const FRAME_MS = 1000 / 60;
// Drops/splashes are drawn in a handful of alpha buckets, one stroke/fill
// call each, instead of one call per drop with its own globalAlpha.
const ALPHA_STEPS = 8;
const DROP_MAX_ALPHA = 0.3; // 0.08 + 0.22, see resetDrop
const SPLASH_MAX_ALPHA = 0.45; // 0.9 * ABSORB

interface BackDrop {
	x: number;
	y: number;
	speed: number;
	len: number;
	pan: number; // px it moves per px the panorama pans
	bucket: number; // alpha bucket, fixed per drop
}

interface Drop {
	x: number;
	y: number; // tip (bottom end) of the streak
	speed: number; // px/s
	len: number;
	alpha: number;
	pan: number; // px it moves per px the panorama pans
	strength: number; // 1 = untouched, drops by ABSORB per card crossed
}

interface Splash {
	x: number;
	y: number;
	vx: number;
	vy: number;
	floor: number; // the edge it splashed off; it comes to rest here
	size: number;
	life: number;
	maxLife: number;
	alpha: number;
	// the card it landed on, which it moves with; null once that's gone
	surface: Surface | null;
}

declare global {
	interface Window {
		__rainCleanup?: () => void;
	}
}

export function startRain() {
	window.__rainCleanup?.();

	const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
	startGpu();
	const canvas = document.createElement("canvas");
	canvas.className = "rain-canvas";
	canvas.setAttribute("aria-hidden", "true");
	// into the screen-fixed part of the page background (see .page-bg)
	(document.querySelector(".page-bg-fixed") ?? document.documentElement).appendChild(
		canvas
	);
	const ctx = canvas.getContext("2d")!;

	// the canvas runs past the viewport on every side (--bg-bleed-* in
	// style.css); everything here is in viewport coordinates, and the
	// canvas covers originX..originX + width, originY..originY + height
	let width = 0;
	let height = 0;
	let originX = 0;
	let originY = 0;
	let viewH = 0; // the actual window height, for speeds
	let color = "";
	const back: BackDrop[] = [];
	const drops: Drop[] = [];
	const dropBucket = new Uint8Array(DROPS_LIMIT);
	const splashes: Splash[] = [];
	const spare: Splash[] = []; // dead splash droplets, reused
	const splashBucket = new Uint8Array(MAX_PARTICLES);
	const visible: Surface[] = [];
	let surfaces: Surface[] = [];
	let surfacesDirty = true;
	let rafId: number | null = null;
	let lastDraw = 0; // for dt
	let frameClock = 0; // for the 60fps cap
	let lastScrollY = window.scrollY;
	const lightning = createLightning();
	// what lightning.draw() is told about the canvas; filled in by resize(),
	// and `view` (the part of it that's the window) each frame
	const sky: Sky = {
		x: 0,
		y: 0,
		w: 0,
		h: 0,
		dpr: 1,
		view: { x: 0, y: 0, w: 0, h: 0 },
	};
	// the weather, and what it makes of the rain: how fast and how long the
	// drops are (drizzle is slow and fine, a downpour neither)
	let weather: Scene = scene();
	let fast = 1;
	let long = 1;
	// how much rain there is right now: it follows the weather's amount over
	// a second or two, so a shower comes on and eases off rather than
	// switching
	let raining = weather.rain;
	let seeded = false; // the first lot of drops is spread down the window; later ones come in at the top
	const snow = createSnow();
	const ice = createIce();
	const air: Air = {
		x: 0,
		y: 0,
		w: 0,
		h: 0,
		viewH: 0,
		dt: 0,
		time: 0,
		wind: 0,
		panned: 0,
		surfaces: visible,
		busy: false,
		day: 0,
		plenty: PLENTY[gpuQuality()],
	};
	let seconds = 0;
	let cleared = false; // nothing falling, and the canvas wiped
	// the slant: the wind's, plus the mouse's lean
	let wind = 0.1;
	let lean = 0;
	// where drops come in, and go round: wide enough of the canvas, on the
	// side the wind's from, that the slant still fills the far corner
	let leftmost = 0;
	let span = 1;
	// the panorama, if this page has one, and where it was last frame
	let pano: Element | null = null;
	let panoAt = 0;

	// depth 0 = far (slow, short, faint), 1 = near. Reuses the object so
	// respawning doesn't allocate every frame.
	const resetDrop = (d: Drop, y: number) => {
		const depth = Math.random();
		d.x = leftmost + Math.random() * span;
		d.y = y;
		d.speed = (700 + depth * 700) * fast;
		d.len = (8 + depth * 14) * long;
		d.alpha = 0.08 + depth * 0.22;
		d.pan = PAN_FRONT[0] + depth * (PAN_FRONT[1] - PAN_FRONT[0]);
		d.strength = 1;
		return d;
	};
	const newDrop = (y: number) => resetDrop({} as Drop, y);

	// roughly half the speed of the front layer, shorter and fainter
	const resetBack = (d: BackDrop, y: number) => {
		const depth = Math.random();
		d.x = leftmost + Math.random() * span;
		d.y = y;
		d.speed = (380 + depth * 300) * fast;
		d.len = (4 + depth * 6) * long;
		d.pan = PAN_BACK[0] + depth * (PAN_BACK[1] - PAN_BACK[0]);
		d.bucket = Math.floor(Math.random() * (ALPHA_STEPS / 2));
		return d;
	};

	// The canvas's size and place, and then how much is falling in it.
	const resize = () => {
		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		// the canvas runs past the viewport (under Safari's toolbars, see
		// --bg-bleed), so size to it rather than to innerWidth/innerHeight
		const rect = canvas.getBoundingClientRect();
		width = rect.width || window.innerWidth;
		height = rect.height || window.innerHeight;
		originX = rect.left;
		originY = rect.top;
		viewH = window.innerHeight;
		canvas.width = Math.round(width * dpr);
		canvas.height = Math.round(height * dpr);
		ctx.setTransform(dpr, 0, 0, dpr, -originX * dpr, -originY * dpr);
		sky.x = originX;
		sky.y = originY;
		sky.w = width;
		sky.h = height;
		sky.dpr = dpr;
		// computed `color` resolves var()/calc() into an rgb() canvas accepts
		color = getComputedStyle(canvas).color;

		populate();
	};

	// As much rain as the weather has (and as fits). Not a resize: new
	// weather mustn't re-measure the canvas, or wipe it.
	const populate = () => {
		air.x = originX;
		air.y = originY;
		air.w = width;
		air.h = height;
		air.viewH = viewH;
		edges();

		// drizzle is fine and slow; heavy rain is long and fast
		const rain = raining;
		fast = weather.drizzle ? 0.5 : 0.82 + 0.2 * Math.min(2, rain);
		long = weather.drizzle ? 0.42 : 0.7 + 0.32 * Math.min(2, rain);
		const amount = (weather.drizzle ? rain * 1.4 : rain) * air.plenty;

		const target = Math.min(
			DROPS_LIMIT,
			Math.round(Math.min(MAX_DROPS, width * height * DENSITY) * amount)
		);
		while (drops.length < target)
			drops.push(newDrop(originY + (seeded ? -Math.random() : Math.random()) * height));
		drops.length = target;

		const backTarget = Math.min(
			BACK_MAX_DROPS,
			Math.round(width * height * BACK_DENSITY * amount)
		);
		while (back.length < backTarget)
			back.push(
				resetBack({} as BackDrop, originY + (seeded ? -Math.random() : Math.random()) * height)
			);
		back.length = backTarget;
		seeded = true;
	};

	// Where drops start and wrap, for the slant there is now.
	const edges = () => {
		const reach = height * (Math.abs(wind) + WIND_RANGE);
		leftmost = wind >= 0 ? originX - reach : originX;
		span = width + reach;
	};

	// Cards come and go with route changes; re-query lazily on DOM changes,
	// but read their rects every frame since scrolling moves them.
	const observer = new MutationObserver(() => {
		surfacesDirty = true;
	});
	observer.observe(document.body, { childList: true, subtree: true });

	const updateSurfaces = () => {
		if (surfacesDirty) {
			surfacesDirty = false;
			// (the panorama comes and goes with the home page, too)
			const el = document.querySelector("[data-m-pano]");
			if (el !== pano) {
				pano = el;
				panoAt = el ? el.scrollLeft : 0;
			}
			const prev = new Map(surfaces.map((s) => [s.el, s]));
			for (const s of surfaces) s.gone = true;
			surfaces = Array.from(document.querySelectorAll(SURFACES)).map((el) => {
				const s = prev.get(el) ?? {
					el,
					left: 0,
					right: 0,
					top: 0,
					bottom: 0,
					prevTop: NaN,
					prevLeft: NaN,
					gone: false,
					nested: !!el.parentElement?.closest(SURFACES),
				};
				s.gone = false;
				return s;
			});
		}
		for (const s of surfaces) {
			const r = s.el.getBoundingClientRect();
			s.prevTop = Number.isNaN(s.prevTop) ? r.top : s.top;
			s.prevLeft = Number.isNaN(s.prevLeft) ? r.left : s.left;
			s.left = r.left;
			s.right = r.right;
			s.top = r.top;
			s.bottom = r.bottom;
		}
	};

	// `amount` is the strength the card just took from the drop (0..ABSORB)
	const splash = (x: number, y: number, amount: number, surface: Surface) => {
		const n = Math.max(1, Math.round((2 + Math.random() * 2) * amount * 2));
		for (let i = 0; i < n && splashes.length < MAX_PARTICLES; i++) {
			const p = spare.pop() ?? ({} as Splash);
			const angle = (Math.random() * 2 - 1) * SPLASH_SPREAD;
			const speed = (SPLASH_SPEED + Math.random() * 0.01) * viewH;
			p.x = x;
			p.y = p.floor = y;
			p.vx = Math.sin(angle) * speed;
			p.vy = -Math.cos(angle) * speed;
			p.size = 1 + Math.random() * 1.2;
			p.life = p.maxLife = 1 + Math.random() * 0.8;
			p.alpha = 0.9 * amount;
			p.surface = surface;
			splashes.push(p);
		}
	};

	const tick = (now: number) => {
		rafId = requestAnimationFrame(tick);

		// 60fps cap. The carry keeps in-between refresh rates (90Hz etc.)
		// close to 60 instead of rounding down to every other frame.
		const since = now - frameClock;
		if (since < FRAME_MS - 2) return;
		frameClock = now - Math.min(Math.max(since - FRAME_MS, 0), FRAME_MS);
		const dt = Math.min((now - lastDraw) / 1000, 0.05);
		lastDraw = now;

		// splashes whose card has gone ride along with the page as it scrolls
		const scrollDelta = window.scrollY - lastScrollY;
		lastScrollY = window.scrollY;

		if (raining !== weather.rain) {
			const left = weather.rain - raining;
			raining += Math.sign(left) * Math.min(Math.abs(left), dt * 1.1);
			populate();
		}
		// the wind: somewhere between its steady speed and its gusts, which
		// come and go over a few seconds
		seconds += dt;
		const gusting =
			0.5 +
			0.5 * Math.sin(seconds * 0.43) * Math.sin(seconds * 0.171 + 1.9) +
			0.18 * Math.sin(seconds * 1.31);
		const blowing =
			Math.sign(weather.wind) *
			(Math.abs(weather.wind) +
				(weather.gust - Math.abs(weather.wind)) * Math.min(1, Math.max(0, gusting)));
		const slant =
			Math.max(-MAX_SLANT, Math.min(MAX_SLANT, blowing * WIND_PER_KMH)) + lean;
		wind += (slant - wind) * Math.min(1, dt * WIND_EASE);
		edges();

		const bottom = originY + height; // of the canvas, in viewport coords

		// nothing coming down, nothing lying, no lightning due: leave the
		// canvas empty and the page alone
		const falling = drops.length > 0 || back.length > 0 || splashes.length > 0;
		if (!falling && !snow.active() && !ice.active() && weather.lightning <= 0 && lightning.level() === 0) {
			if (!cleared) ctx.clearRect(originX, originY, width, height);
			cleared = true;
			return;
		}
		cleared = false;

		updateSurfaces();

		// how far the panorama has panned since the last frame. Not a jump,
		// though (its place being restored on the way back to the page):
		// that's not movement to go along with.
		let panned = 0;
		if (pano) {
			const at = pano.scrollLeft;
			if (Math.abs(at - panoAt) < width) panned = at - panoAt;
			panoAt = at;
		}
		// drops panned off one side come back on the other, so there's as
		// much rain after as before. (The same goes for one the wind carries
		// off the far side: it's out of sight either way.)
		const rightmost = leftmost + span;
		visible.length = 0;
		for (const s of surfaces) {
			if (s.bottom > originY && s.top < bottom && s.right > s.left) visible.push(s);
		}

		let splashBudget = MAX_SPLASHES_PER_FRAME;
		for (const d of drops) {
			const prevY = d.y;
			const dy = d.speed * dt;
			d.y += dy;
			d.x += dy * wind - panned * d.pan;
			if (d.x < leftmost) d.x += span;
			else if (d.x >= rightmost) d.x -= span;

			for (const s of visible) {
				if (d.x < s.left || d.x > s.right) continue;
				// position relative to the card's top edge, then and now; only
				// crossing it counts, so a card sliding over a drop leaves it be
				const before = prevY - s.prevTop;
				const after = d.y - s.top;
				if (before >= 0 || after < 0 || d.y > s.bottom) continue;
				const lost = d.strength * ABSORB;
				d.strength -= lost;
				if (splashBudget > 0 && Math.random() < SPLASH_CHANCE) {
					splashBudget--;
					splash(d.x, s.top, lost, s);
				}
			}

			if (d.strength < MIN_STRENGTH || d.y - d.len > bottom) {
				resetDrop(d, originY - Math.random() * 40);
			}
		}

		for (const d of back) {
			const dy = d.speed * dt;
			d.y += dy;
			d.x += dy * wind - panned * d.pan;
			if (d.x < leftmost) d.x += span;
			else if (d.x >= rightmost) d.x -= span;
			if (d.y - d.len > bottom) resetBack(d, originY - Math.random() * 40);
		}

		// update splashes and compact the survivors in place
		const gravity = GRAVITY * viewH;
		let alive = 0;
		for (const p of splashes) {
			p.life -= dt;
			const s = p.surface;
			if (s && (s.gone || s.right <= s.left)) {
				// its card's gone (or hidden): don't leave droplets hanging
				// where it was, over whatever's there now (a new page's title)
				p.surface = null;
				if (p.life > SPLASH_ORPHAN_LIFE) {
					// fade out from where it is now
					p.alpha *= p.life / p.maxLife;
					p.life = p.maxLife = SPLASH_ORPHAN_LIFE;
				}
			}
			// the rest stick to their card, scrolling or not (layout shifts),
			// sideways too: the home page's tiles pan under the rain
			const shift = p.surface ? p.surface.top - p.surface.prevTop : -scrollDelta;
			p.floor += shift;
			p.y += shift;
			if (p.surface) p.x += p.surface.left - p.surface.prevLeft;
			if (p.vx !== 0 || p.vy !== 0) {
				p.vy += gravity * dt;
				p.x += p.vx * dt;
				p.y += p.vy * dt;
				// back down on the edge: stop there and just fade out
				if (p.vy > 0 && p.y >= p.floor) {
					p.y = p.floor;
					p.vx = p.vy = 0;
				}
			}
			if (p.life > 0) splashes[alive++] = p;
			else spare.push(p);
		}
		splashes.length = alive;

		air.dt = dt;
		air.time = seconds;
		air.wind = blowing;
		air.panned = panned;
		air.day = weather.day;
		air.busy = document.documentElement.classList.contains("m-swapping");
		snow.step(air);
		ice.step(air);

		ctx.clearRect(originX, originY, width, height);

		// lightning first, so the rain falls in front of it; and while the
		// sky's lit, so is the rain. It keeps its bolts to the part of the
		// canvas that's on screen.
		const vv = window.visualViewport;
		const view = sky.view;
		view.x = Math.max(originX, vv ? vv.offsetLeft : 0);
		view.y = Math.max(originY, vv ? vv.offsetTop : 0);
		view.w =
			Math.min(originX + width, view.x + (vv ? vv.width : window.innerWidth)) - view.x;
		view.h =
			Math.min(bottom, view.y + (vv ? vv.height : window.innerHeight)) - view.y;
		lightning.draw(ctx, now, sky);
		const lit = 1 + RAIN_LIT * lightning.level();

		ctx.strokeStyle = color;
		ctx.fillStyle = color;

		// back layer first, thinner, in a few fixed alpha buckets
		ctx.lineWidth = 0.75;
		for (let b = 0; b < ALPHA_STEPS / 2; b++) {
			ctx.globalAlpha = Math.min(
				1,
				((b + 1) / (ALPHA_STEPS / 2)) * BACK_MAX_ALPHA * lit
			);
			ctx.beginPath();
			for (const d of back) {
				if (d.bucket !== b) continue;
				ctx.moveTo(d.x - d.len * wind, d.y - d.len);
				ctx.lineTo(d.x, d.y);
			}
			ctx.stroke();
		}

		ctx.lineWidth = 1;

		// drops: bucket by alpha, then one path + stroke per bucket
		for (let i = 0; i < drops.length; i++) {
			const a = drops[i].alpha * drops[i].strength;
			dropBucket[i] = Math.min(
				ALPHA_STEPS - 1,
				Math.floor((a / DROP_MAX_ALPHA) * ALPHA_STEPS)
			);
		}
		for (let b = 0; b < ALPHA_STEPS; b++) {
			ctx.globalAlpha = Math.min(1, ((b + 0.5) / ALPHA_STEPS) * DROP_MAX_ALPHA * lit);
			ctx.beginPath();
			for (let i = 0; i < drops.length; i++) {
				if (dropBucket[i] !== b) continue;
				const d = drops[i];
				ctx.moveTo(d.x - d.len * wind, d.y - d.len);
				ctx.lineTo(d.x, d.y);
			}
			ctx.stroke();
		}

		// splashes: same idea, fewer buckets
		if (alive > 0) {
			for (let i = 0; i < alive; i++) {
				const p = splashes[i];
				const a = (p.alpha * p.life) / p.maxLife;
				splashBucket[i] = Math.min(
					ALPHA_STEPS / 2 - 1,
					Math.floor((a / SPLASH_MAX_ALPHA) * (ALPHA_STEPS / 2))
				);
			}
			for (let b = 0; b < ALPHA_STEPS / 2; b++) {
				ctx.globalAlpha = Math.min(
					1,
					((b + 0.5) / (ALPHA_STEPS / 2)) * SPLASH_MAX_ALPHA * lit
				);
				ctx.beginPath();
				for (let i = 0; i < alive; i++) {
					if (splashBucket[i] !== b) continue;
					const p = splashes[i];
					ctx.rect(p.x - p.size / 2, p.y - p.size, p.size, p.size);
				}
				ctx.fill();
			}
		}
		ctx.globalAlpha = 1;

		snow.draw(ctx, air);
		ice.draw(ctx, air);
	};

	const start = () => {
		if (rafId !== null || reduceMotion.matches) return;
		canvas.hidden = false;
		lastDraw = frameClock = performance.now();
		lastScrollY = window.scrollY;
		rafId = requestAnimationFrame(tick);
	};

	const stop = () => {
		if (rafId !== null) cancelAnimationFrame(rafId);
		rafId = null;
		spare.push(...splashes);
		splashes.length = 0;
		snow.clear();
		ice.clear();
		lightning.cancel();
		canvas.hidden = true;
	};

	const onMotionPref = () => (reduceMotion.matches ? stop() : start());

	// mouse x leans the rain a little either way; touch leaves it at rest
	const onPointerMove = (e: PointerEvent) => {
		if (e.pointerType !== "mouse" || !window.innerWidth) return;
		lean = (e.clientX / window.innerWidth - 0.5) * 2 * WIND_RANGE;
	};
	const onPointerLeave = () => {
		lean = 0;
	};

	// new weather: a different amount of everything
	const onWeather = () => {
		weather = scene();
		lightning.setRate(weather.lightning);
		snow.set(weather.snow, weather.wet);
		ice.set(weather.pellets, weather.hail, weather.glaze);
		populate();
	};
	window.addEventListener("weatherchange", onWeather);
	// the machine's been sized up: as much rain (snow, ice) as it can take
	const onQuality = () => {
		air.plenty = PLENTY[gpuQuality()];
		populate();
	};
	window.addEventListener("gpuquality", onQuality);

	resize();
	onWeather();
	window.addEventListener("resize", resize);
	// the canvas can change size without the window doing so (the side
	// rail bleed, see pageBg.ts); its own size is what matters anyway
	const sizeObserver = new ResizeObserver(() => resize());
	sizeObserver.observe(canvas);
	window.addEventListener("pointermove", onPointerMove, { passive: true });
	document.documentElement.addEventListener("mouseleave", onPointerLeave);
	reduceMotion.addEventListener("change", onMotionPref);
	onMotionPref();
	// a new accent retints the rain (src/lib/accent.ts); the colour is read
	// in resize(). It turns the photo behind as well, and the lightning has
	// a copy of that.
	const onAccent = () => {
		resize();
		lightning.retint();
	};
	window.addEventListener("accentchange", onAccent);

	window.__rainCleanup = () => {
		stop();
		observer.disconnect();
		sizeObserver.disconnect();
		window.removeEventListener("resize", resize);
		window.removeEventListener("accentchange", onAccent);
		window.removeEventListener("weatherchange", onWeather);
		window.removeEventListener("gpuquality", onQuality);
		window.removeEventListener("pointermove", onPointerMove);
		document.documentElement.removeEventListener("mouseleave", onPointerLeave);
		reduceMotion.removeEventListener("change", onMotionPref);
		canvas.remove();
		window.__rainCleanup = undefined;
	};
}
