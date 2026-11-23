import { EASE_IN_OUT, EASE_OUT, flags, onScreen, pageEl, still } from "./core";
import { pressedEl } from "./tilt";

// ---------------------------------------------------------------------------
// Live tiles: flip and cycle
// ---------------------------------------------------------------------------

// A flip tile has two faces on a .tile-flipper; its resting state is the
// .is-flipped class (metro.css turns the flipper over), and the turn
// between the two is animated here, always the same way round like the
// phone's, so going back to the front carries on through 360 degrees.
export interface Flip {
	back: boolean;
	anim: Animation | null;
	due: number; // when it next turns by itself
	hover: boolean;
}
export const flips = new WeakMap<Element, Flip>();

export const FLIP_MS = 680;
export const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);

export function flipOf(tile: Element): Flip {
	let f = flips.get(tile);
	if (!f) {
		f = {
			back: tile.classList.contains("is-flipped"),
			anim: null,
			// the first turn comes early for some, late for others
			due: performance.now() + rand(2500, 16000),
			hover: false,
		};
		flips.set(tile, f);
	}
	return f;
}

export function flipTo(tile: HTMLElement, back: boolean) {
	const f = flipOf(tile);
	if (f.back === back) return;
	const card = tile.querySelector<HTMLElement>(".tile-flipper");
	if (!card) return;
	// where it is now, if it's caught mid-turn
	let from = back ? 0 : 180;
	const running = f.anim;
	if (running && running.playState === "running") {
		const t = Math.min(1, Number(running.currentTime ?? 0) / FLIP_MS);
		const eased = t * t * (3 - 2 * t);
		from = f.back ? eased * 180 : 180 + eased * 180;
		if (from >= 360) from -= 360;
	}
	running?.cancel();
	f.back = back;
	tile.classList.toggle("is-flipped", back);
	if (still() || typeof card.animate !== "function") return;
	const to = back ? 180 : 360;
	if (from > to) from -= 360;
	f.anim = card.animate(
		[{ transform: `rotateX(${from}deg)` }, { transform: `rotateX(${to}deg)` }],
		{ duration: FLIP_MS * (Math.abs(to - from) / 180), easing: EASE_IN_OUT }
	);
}

// A cycle tile shows one .tile-slide at a time; the next one pushes up
// from the bottom edge and the old one out of the top, the way Windows 8
// tiles took an update.
export const cycles = new WeakMap<Element, { due: number; busy: boolean }>();

export function cycle(tile: HTMLElement) {
	const slides = Array.from(tile.querySelectorAll<HTMLElement>(".tile-slide"));
	if (slides.length < 2) return;
	let at = slides.findIndex((s) => s.classList.contains("is-current"));
	if (at < 0) at = 0;
	const cur = slides[at];
	const next = slides[(at + 1) % slides.length];
	const state = cycles.get(tile)!;
	const settle = () => {
		cur.classList.remove("is-current");
		next.classList.remove("is-entering");
		next.classList.add("is-current");
		state.busy = false;
	};
	if (still() || typeof cur.animate !== "function") return settle();
	state.busy = true;
	next.classList.add("is-entering");
	const timing = { duration: 620, easing: EASE_OUT };
	cur.animate(
		[
			{ transform: "translate3d(0, 0, 0)" },
			{ transform: "translate3d(0, -100%, 0)" },
		],
		timing
	);
	const anim = next.animate(
		[
			{ transform: "translate3d(0, 100%, 0)" },
			{ transform: "translate3d(0, 0, 0)" },
		],
		timing
	);
	anim.onfinish = anim.oncancel = settle;
}

// One slow clock for all of them: tiles turn when their time is up, if
// they're on screen and nobody is in the middle of using them.
export function tickTiles() {
	if (document.hidden || still() || flags.busy) return;
	const page = pageEl();
	if (!page) return;
	const now = performance.now();
	for (const tile of page.querySelectorAll<HTMLElement>("[data-m-flip]")) {
		const f = flipOf(tile);
		if (now < f.due || f.hover || pressedEl() === tile) continue;
		if (!onScreen(tile.getBoundingClientRect())) continue;
		// the back is the caption: it's shown for a few seconds, then the
		// picture gets the tile back for a good while
		f.due = now + (f.back ? rand(7000, 17000) : rand(3800, 5600));
		flipTo(tile, !f.back);
	}
	for (const tile of page.querySelectorAll<HTMLElement>("[data-m-cycle]")) {
		let c = cycles.get(tile);
		if (!c)
			cycles.set(tile, (c = { due: now + rand(3500, 6500), busy: false }));
		if (now < c.due || c.busy) continue;
		if (!onScreen(tile.getBoundingClientRect())) continue;
		c.due = now + rand(5200, 8200);
		cycle(tile);
	}
}

// with a mouse, pointing at a flip tile turns it over to read the back
export function hoverFlip(e: PointerEvent, inside: boolean) {
	if (e.pointerType !== "mouse") return;
	const tile = (e.target as Element | null)?.closest?.<HTMLElement>(
		"[data-m-flip]"
	);
	if (!tile || tile.contains(e.relatedTarget as Node | null)) return;
	const f = flipOf(tile);
	f.hover = inside;
	f.due = performance.now() + rand(6000, 14000);
	flipTo(tile, inside);
}
