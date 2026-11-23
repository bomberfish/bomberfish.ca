// Reveal: Windows 10's light under the pointer. Things near the pointer
// have their edges lit where it's closest, the one it's over is lit inside
// as well, and the light moves as the pointer does.
//
// This is the part that knows where the pointer is; drawing the light is
// the stylesheet's. Each element matching `selector` within reach gets two
// custom properties, the pointer's place measured from its own top left
// corner:
//
//   --mx, --my    in px; unset when the pointer's nowhere near (so give
//                 them a fallback far off the element)
//   --mr          how big a light over it would be to light all of it,
//                 the way WinUI's hover light is sized: its longer side
//                 and 12px, between 16px and 512px
//
// and a stylesheet does what it likes with them, usually a
// radial-gradient(circle at var(--mx) var(--my), ...) masked down to a
// border, or under the content. Nothing here knows about the site: take
// the file and call startReveal() once.
//
// A mouse only (a finger has no "near"), one pass a frame at most, and the
// elements are measured afresh each pass, so things that move, turn or
// scroll under a still pointer are right as soon as it moves again.

export interface RevealOptions {
	/**
	 * How far from an element's edge the light still reaches it, in px.
	 * WinUI's wider border light is 77px across the ground; the default is
	 * that and a little.
	 */
	reach?: number;
	/** Asked before each pass: false, and nothing's lit (what was, goes out). */
	when?: () => boolean;
}

export function startReveal(selector: string, options: RevealOptions = {}) {
	if (typeof document === "undefined") return () => {};
	const reach = options.reach ?? 96;
	const lit = new Set<HTMLElement>();
	let at: { x: number; y: number } | null = null;
	let queued = 0;

	const clear = (el: HTMLElement) => {
		el.style.removeProperty("--mx");
		el.style.removeProperty("--my");
		el.style.removeProperty("--mr");
	};

	const pass = () => {
		queued = 0;
		const now = new Set<HTMLElement>();
		// (measured first, all of them, and only then written to: a write
		// between two measurements has the browser work the page out again
		// for the second, once for every tile under the light)
		const found: [HTMLElement, string, string, string][] = [];
		if (at && (options.when?.() ?? true))
			for (const el of document.querySelectorAll<HTMLElement>(selector)) {
				const r = el.getBoundingClientRect();
				if (
					!r.width ||
					at.x < r.left - reach ||
					at.x > r.right + reach ||
					at.y < r.top - reach ||
					at.y > r.bottom + reach
				)
					continue;
				const w = el.offsetWidth;
				const h = el.offsetHeight;
				// (in the element's own, unscaled px: it may be drawn smaller
				// or larger than it's laid out, mid-transition or pressed)
				found.push([
					el,
					`${(((at.x - r.left) / r.width) * w).toFixed(1)}px`,
					`${(((at.y - r.top) / r.height) * h).toFixed(1)}px`,
					`${Math.min(512, Math.max(16, Math.max(w, h) + 12))}px`,
				]);
			}
		for (const [el, x, y, radius] of found) {
			el.style.setProperty("--mx", x);
			el.style.setProperty("--my", y);
			el.style.setProperty("--mr", radius);
			now.add(el);
		}
		for (const el of lit) if (!now.has(el)) clear(el);
		lit.clear();
		for (const el of now) lit.add(el);
	};
	const queue = () => {
		queued ||= requestAnimationFrame(pass);
	};

	const move = (e: PointerEvent) => {
		if (e.pointerType !== "mouse") return;
		at = { x: e.clientX, y: e.clientY };
		queue();
	};
	const gone = () => {
		at = null;
		queue();
	};

	addEventListener("pointermove", move, { passive: true });
	addEventListener("scroll", queue, { passive: true, capture: true });
	document.documentElement.addEventListener("pointerleave", gone);
	addEventListener("blur", gone);
	return () => {
		removeEventListener("pointermove", move);
		removeEventListener("scroll", queue, { capture: true });
		document.documentElement.removeEventListener("pointerleave", gone);
		removeEventListener("blur", gone);
		cancelAnimationFrame(queued);
		for (const el of lit) clear(el);
		lit.clear();
	};
}
