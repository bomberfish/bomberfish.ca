// Minimal rain, loosely after the iOS Weather app: thin slanted streaks in
// screen space that splash on the top edges of the page's cards. Hit testing
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

// Anything that reads as a solid panel the rain can land on.
const SURFACES =
	".background-container, .contact-card, .project-card-wrapper, .buttons-section, .blog-item";

const DENSITY = 1 / 100; // drops per px² of viewport
const MAX_DROPS = 180;
const WIND = 0.1; // resting slant, horizontal px per vertical px
const WIND_RANGE = 0.07; // ± slant from the mouse's x position
const WIND_EASE = 2; // per second, how quickly the slant follows the mouse
const ABSORB = 0.5; // share of a drop's remaining strength each card takes
const MIN_STRENGTH = 0.15; // below this the drop is spent (about 3 cards)
const MAX_SPLASHES_PER_FRAME = 24; // keeps a fast scroll from turning into fireworks
// splash droplets alive at once; only a memory backstop, normal rain on
// the ground stays well under it
const MAX_PARTICLES = 1500;

// back layer: no collisions, so it's just a moving batch of lines
const BACK_DENSITY = 1 / 2000;
const BACK_MAX_DROPS = 800;
const BACK_MAX_ALPHA = 0.12;

// splashes, after Weather: only some hits splash, and the droplets live
// ~1-1.8s. Speeds are fractions of the viewport height so it looks the
// same on any screen.
const SPLASH_CHANCE = 0.15;
const SPLASH_SPEED = 0.09; // launch, viewport heights/s (+ up to 0.01)
const SPLASH_SPREAD = 0.9; // radians either side of straight up
const GRAVITY = 0.5; // viewport heights/s²

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
	bucket: number; // alpha bucket, fixed per drop
}

interface Drop {
	x: number;
	y: number; // tip (bottom end) of the streak
	speed: number; // px/s
	len: number;
	alpha: number;
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
}

interface Surface {
	el: Element;
	left: number;
	right: number;
	top: number;
	bottom: number;
	prevTop: number;
}

declare global {
	interface Window {
		__rainCleanup?: () => void;
	}
}

export function startRain() {
	window.__rainCleanup?.();

	const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
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
	const dropBucket = new Uint8Array(MAX_DROPS);
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
	let lastGround = NaN;
	let wind = WIND;
	let targetWind = WIND;

	// depth 0 = far (slow, short, faint), 1 = near. Reuses the object so
	// respawning doesn't allocate every frame.
	const resetDrop = (d: Drop, y: number) => {
		const depth = Math.random();
		// spawn far enough left that the steepest slant still reaches the left edge
		const reach = height * (WIND + WIND_RANGE);
		d.x = originX + Math.random() * (width + reach) - reach;
		d.y = y;
		d.speed = 700 + depth * 700;
		d.len = 8 + depth * 14;
		d.alpha = 0.08 + depth * 0.22;
		d.strength = 1;
		return d;
	};
	const newDrop = (y: number) => resetDrop({} as Drop, y);

	// roughly half the speed of the front layer, shorter and fainter
	const resetBack = (d: BackDrop, y: number) => {
		const depth = Math.random();
		const reach = height * (WIND + WIND_RANGE);
		d.x = originX + Math.random() * (width + reach) - reach;
		d.y = y;
		d.speed = 380 + depth * 300;
		d.len = 4 + depth * 6;
		d.bucket = Math.floor(Math.random() * (ALPHA_STEPS / 2));
		return d;
	};

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
		// computed `color` resolves var()/calc() into an rgb() canvas accepts
		color = getComputedStyle(canvas).color;

		const target = Math.min(MAX_DROPS, Math.round(width * height * DENSITY));
		while (drops.length < target) drops.push(newDrop(originY + Math.random() * height));
		drops.length = target;

		const backTarget = Math.min(
			BACK_MAX_DROPS,
			Math.round(width * height * BACK_DENSITY)
		);
		while (back.length < backTarget)
			back.push(resetBack({} as BackDrop, originY + Math.random() * height));
		back.length = backTarget;
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
			const prev = new Map(surfaces.map((s) => [s.el, s]));
			surfaces = Array.from(document.querySelectorAll(SURFACES)).map(
				(el) =>
					prev.get(el) ?? {
						el,
						left: 0,
						right: 0,
						top: 0,
						bottom: 0,
						prevTop: NaN,
					}
			);
		}
		for (const s of surfaces) {
			const r = s.el.getBoundingClientRect();
			s.prevTop = Number.isNaN(s.prevTop) ? r.top : s.top;
			s.left = r.left;
			s.right = r.right;
			s.top = r.top;
			s.bottom = r.bottom;
		}
	};

	// `amount` is the strength the card just took from the drop (0..ABSORB)
	// `far` is the back layer: smaller, lower droplets to match its drops
	const splash = (x: number, y: number, amount: number, far = false) => {
		const scale = far ? 0.6 : 1;
		const n = Math.max(1, Math.round((2 + Math.random() * 2) * amount * 2));
		for (let i = 0; i < n && splashes.length < MAX_PARTICLES; i++) {
			const p = spare.pop() ?? ({} as Splash);
			const angle = (Math.random() * 2 - 1) * SPLASH_SPREAD;
			const speed = (SPLASH_SPEED + Math.random() * 0.01) * viewH * scale;
			p.x = x;
			p.y = p.floor = y;
			p.vx = Math.sin(angle) * speed;
			p.vy = -Math.cos(angle) * speed;
			p.size = (1 + Math.random() * 1.2) * scale;
			// far droplets are far more numerous, so they go sooner
			p.life = p.maxLife = (1 + Math.random() * 0.8) * (far ? 0.5 : 1);
			p.alpha = 0.9 * amount;
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

		// splashes sit on cards, so they ride along with the page when it scrolls
		const scrollDelta = window.scrollY - lastScrollY;
		lastScrollY = window.scrollY;

		wind += (targetWind - wind) * Math.min(1, dt * WIND_EASE);

		const bottom = originY + height; // of the canvas, in viewport coords

		updateSurfaces();
		visible.length = 0;
		for (const s of surfaces) {
			if (s.bottom > originY && s.top < bottom && s.right > s.left) visible.push(s);
		}

		// the bottom of the document is the ground; only in view once you've
		// scrolled to the end (or always, on pages shorter than the window)
		const ground = document.documentElement.scrollHeight - window.scrollY;
		const prevGround = Number.isNaN(lastGround) ? ground : lastGround;
		lastGround = ground;

		let splashBudget = MAX_SPLASHES_PER_FRAME;
		for (const d of drops) {
			const prevY = d.y;
			const dy = d.speed * dt;
			d.y += dy;
			d.x += dy * wind;

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
					splash(d.x, s.top, lost);
				}
			}

			// the ground takes whatever is left of the drop, same crossing test
			// as the cards so scrolling down onto it splashes too
			if (ground <= bottom && prevY < prevGround && d.y >= ground) {
				// always splashes, no chance roll or per-frame budget: everything
				// that makes it to the bottom lands somewhere visible.
				// scaled so an untouched drop splashes like it hit a first card
				splash(d.x, ground, d.strength * ABSORB);
				resetDrop(d, originY - Math.random() * 40);
				continue;
			}

			if (d.strength < MIN_STRENGTH || d.y - d.len > bottom) {
				resetDrop(d, originY - Math.random() * 40);
			}
		}

		for (const d of back) {
			const prevY = d.y;
			const dy = d.speed * dt;
			d.y += dy;
			d.x += dy * wind;
			// the one thing the back layer does hit: the ground, same crossing
			// test (and same always-splash rule) as the front layer
			if (ground <= bottom && prevY < prevGround && d.y >= ground) {
				const alpha = ((d.bucket + 1) / (ALPHA_STEPS / 2)) * BACK_MAX_ALPHA;
				splash(d.x, ground, alpha / 0.9, true);
				resetBack(d, originY - Math.random() * 40);
			} else if (d.y - d.len > bottom) resetBack(d, originY - Math.random() * 40);
		}

		// update splashes and compact the survivors in place
		const gravity = GRAVITY * viewH;
		let alive = 0;
		for (const p of splashes) {
			p.life -= dt;
			p.floor -= scrollDelta;
			p.y -= scrollDelta;
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

		ctx.clearRect(originX, originY, width, height);
		ctx.strokeStyle = color;
		ctx.fillStyle = color;

		// back layer first, thinner, in a few fixed alpha buckets
		ctx.lineWidth = 0.75;
		for (let b = 0; b < ALPHA_STEPS / 2; b++) {
			ctx.globalAlpha = ((b + 1) / (ALPHA_STEPS / 2)) * BACK_MAX_ALPHA;
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
			ctx.globalAlpha = ((b + 0.5) / ALPHA_STEPS) * DROP_MAX_ALPHA;
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
				ctx.globalAlpha = ((b + 0.5) / (ALPHA_STEPS / 2)) * SPLASH_MAX_ALPHA;
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
	};

	const start = () => {
		if (rafId !== null || reduceMotion.matches) return;
		canvas.hidden = false;
		lastDraw = frameClock = performance.now();
		lastScrollY = window.scrollY;
		lastGround = NaN;
		rafId = requestAnimationFrame(tick);
	};

	const stop = () => {
		if (rafId !== null) cancelAnimationFrame(rafId);
		rafId = null;
		spare.push(...splashes);
		splashes.length = 0;
		canvas.hidden = true;
	};

	const onMotionPref = () => (reduceMotion.matches ? stop() : start());

	// mouse x leans the rain a little either way; touch leaves it at rest
	const onPointerMove = (e: PointerEvent) => {
		if (e.pointerType !== "mouse" || !window.innerWidth) return;
		targetWind = WIND + (e.clientX / window.innerWidth - 0.5) * 2 * WIND_RANGE;
	};
	const onPointerLeave = () => {
		targetWind = WIND;
	};

	resize();
	window.addEventListener("resize", resize);
	// the canvas can change size without the window doing so (the side
	// rail bleed, see pageBg.ts); its own size is what matters anyway
	const sizeObserver = new ResizeObserver(() => resize());
	sizeObserver.observe(canvas);
	window.addEventListener("pointermove", onPointerMove, { passive: true });
	document.documentElement.addEventListener("mouseleave", onPointerLeave);
	reduceMotion.addEventListener("change", onMotionPref);
	onMotionPref();

	window.__rainCleanup = () => {
		stop();
		observer.disconnect();
		sizeObserver.disconnect();
		window.removeEventListener("resize", resize);
		window.removeEventListener("pointermove", onPointerMove);
		document.documentElement.removeEventListener("mouseleave", onPointerLeave);
		reduceMotion.removeEventListener("change", onMotionPref);
		canvas.remove();
		window.__rainCleanup = undefined;
	};
}
