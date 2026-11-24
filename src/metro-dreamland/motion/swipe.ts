import { EASE_OUT, SSR, flags, pageEl, still } from "./core";
import { unpress } from "./tilt";

// ---------------------------------------------------------------------------
// Swipe
// ---------------------------------------------------------------------------

// A pivot turned under a finger: swipe the page left and the next section
// comes round, right and it's the one before (the strip of headers goes
// round, so there's always one each way). The content follows the finger
// while it's going, so it's plain what's about to happen, and goes back
// where it was if the swipe comes to nothing.
//
// It's touch only, and it's meant to be hard to do by accident, since the
// page it's on scrolls down under the same finger:
//
//   - one finger, on a page that isn't zoomed, and not started within EDGE
//     of either side of the screen (that's the browser's own swipe back
//     and forward)
//   - not started on anything that takes a sideways drag itself: a slider,
//     a field, something that scrolls sideways, anything that's claimed
//     its gestures with touch-action
//   - level from the start: by the time it's gone LOCK px it has to be
//     LEVEL times further across than up or down, or it's a scroll (or
//     nothing) for as long as the finger's down, whatever it does next
//   - far enough: 30% of the window across (120px, if that's less), or a
//     flick, which is shorter but quick
//   - and meant: not on its way back when it's let go (a swipe that
//     returns most of the way has been thought better of), and nothing
//     selected by it
//
// Nothing here stops the browser doing what it would with the touch (the
// listeners are passive): a swipe that isn't quite level scrolls the page
// a little as it goes, as it would have.

const EDGE = 28; // px
const LOCK = 12; // px
const LEVEL = 1.8;
const FLICK_PX = 56;
const FLICK = 0.5; // px a ms
/** How far across is far enough: 30% of the window, or 120px if that's less. */
const far = () => Math.min(120, innerWidth * 0.3);
/** How much of the finger's travel the content takes, and the furthest it goes. */
const FOLLOW = 0.6;
const reach = () => innerWidth * 0.3;

/**
 * Navigation's to do (it's set there): turn the pivot one section on (1)
 * or back (-1). False if there's nowhere to turn to.
 */
export const swipes: { turn: (dir: 1 | -1) => boolean } = {
	turn: () => false,
};

let pulled = 0;
/**
 * How far across the content had been pulled when a swipe turned the
 * page: where its way out starts from (pivotOut). Good for one asking.
 */
export function takePull() {
	const px = pulled;
	pulled = 0;
	return px;
}

// Does something between what was touched and the page want a sideways
// drag for itself?
function taken(from: Element | null, page: Element) {
	for (let el = from; el && el !== page; el = el.parentElement) {
		if (
			el.matches(
				"input, textarea, select, [contenteditable], [role=slider], audio, video"
			)
		)
			return true;
		const style = getComputedStyle(el);
		// (touch-action isn't inherited: this is the element's own say)
		if (!/^(auto|manipulation)$/.test(style.touchAction || "auto")) return true;
		if (
			el.scrollWidth > el.clientWidth + 1 &&
			/auto|scroll/.test(style.overflowX)
		)
			return true;
	}
	return false;
}

interface Going {
	id: number;
	x: number;
	y: number;
	at: number;
	page: HTMLElement;
	/** Not yet known to be a swipe (null), or one: what follows the finger. */
	follows: HTMLElement[] | null;
	dx: number;
	dy: number;
	/** The furthest across it's been. */
	peak: number;
	offset: number;
}

export function startSwipe() {
	if (SSR) return;
	let going: Going | null = null;

	const place = (g: Going, offset: number) => {
		g.offset = offset;
		for (const el of g.follows ?? [])
			el.style.transform = offset ? `translate3d(${offset}px, 0, 0)` : "";
	};
	// back where it was, from wherever it had got to
	const settle = (g: Going) => {
		const from = g.offset;
		place(g, 0);
		if (!from || still()) return;
		for (const el of g.follows ?? [])
			el.animate?.(
				[
					{ transform: `translate3d(${from}px, 0, 0)` },
					{ transform: "translate3d(0, 0, 0)" },
				],
				{ duration: 260, easing: EASE_OUT }
			);
	};
	const drop = () => {
		if (going) settle(going);
		going = null;
	};
	const touchOf = (e: TouchEvent, g: Going) =>
		Array.from(e.changedTouches).find((t) => t.identifier === g.id);

	addEventListener(
		"touchstart",
		(e) => {
			// (a second finger: whatever that is, it isn't this)
			if (going || e.touches.length !== 1) return drop();
			const page = pageEl();
			if (!page?.matches('[data-m-page="pivot"]') || flags.busy) return;
			if ((window.visualViewport?.scale ?? 1) > 1.01) return;
			const t = e.touches[0];
			if (t.clientX < EDGE || t.clientX > innerWidth - EDGE) return;
			if (taken(e.target as Element | null, page)) return;
			going = {
				id: t.identifier,
				x: t.clientX,
				y: t.clientY,
				at: performance.now(),
				page,
				follows: null,
				dx: 0,
				dy: 0,
				peak: 0,
				offset: 0,
			};
		},
		{ passive: true }
	);

	addEventListener(
		"touchmove",
		(e) => {
			const g = going;
			if (!g) return;
			if (e.touches.length !== 1) return drop();
			const t = touchOf(e, g);
			if (!t) return;
			g.dx = t.clientX - g.x;
			g.dy = t.clientY - g.y;
			const across = Math.abs(g.dx);
			if (!g.follows) {
				if (Math.hypot(g.dx, g.dy) < LOCK) return;
				// (a scroll, or text being selected: not ours, now or later
				// in this touch)
				if (
					across < LEVEL * Math.abs(g.dy) ||
					getSelection()?.isCollapsed === false
				) {
					going = null;
					return;
				}
				g.follows = still()
					? []
					: Array.from(g.page.querySelectorAll<HTMLElement>("[data-m-content]"));
				// (whatever was pressed isn't being pressed any more)
				unpress();
			}
			g.peak = Math.max(g.peak, across);
			const most = reach();
			place(g, Math.max(-most, Math.min(most, g.dx * FOLLOW)));
		},
		{ passive: true }
	);

	addEventListener(
		"touchend",
		(e) => {
			const g = going;
			if (!g || !touchOf(e, g)) return;
			going = null;
			if (!g.follows) return;
			const across = Math.abs(g.dx);
			const took = performance.now() - g.at;
			const meant =
				across >= g.peak * 0.7 &&
				across >= Math.abs(g.dy) &&
				getSelection()?.isCollapsed !== false &&
				(across >= far() || (across >= FLICK_PX && across / took >= FLICK));
			if (meant && g.page === pageEl() && !flags.busy) {
				// (the page's way out takes it from where the finger left it)
				const from = g.offset;
				place(g, 0);
				pulled = from;
				if (swipes.turn(g.dx < 0 ? 1 : -1)) return;
				pulled = 0;
				g.offset = from;
			}
			settle(g);
		},
		{ passive: true }
	);

	addEventListener("touchcancel", drop, { passive: true });
}
