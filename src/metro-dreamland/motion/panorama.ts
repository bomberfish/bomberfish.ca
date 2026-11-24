import { config, reduceMotion, still } from "./core";

// A link in a panorama to one of its sections ("#there", data-m-pan) is a
// jump within the page, which is navigation's to make: it says how here.
export const panLinks: {
	section: (hash: string) => Element | null;
	jump: (hash: string) => void;
} = { section: () => null, jump: () => {} };

// ---------------------------------------------------------------------------
// Panorama
// ---------------------------------------------------------------------------

// The home page pans sideways in three layers, as panoramas did: the tiles
// at the speed you scroll, the big title slower (it's wider than the
// screen, and you see a different stretch of it over each section), and
// the photo behind slowest of all. Where the browser has scroll-driven
// animations the two slow layers are tied to the scroller on the
// compositor; elsewhere a scroll listener moves them.
//
// A mouse wheel only goes up and down, so here it pans: over a section
// that still has somewhere to scroll vertically it scrolls that first.
//
// That's the strip, which is what a big window gets. On a phone the same
// sections are one under another and the page scrolls down like any other
// (metro.css, "phone mode"): nothing pans, the wheel and the keys are the
// browser's, and a jump to a section is a scroll down the page to it. The
// stylesheet says which it is, by whether the panorama scrolls sideways.

export interface Pano {
	el: HTMLElement;
	/**
	 * Pan to the section `target` is (or is in), false if it's in none.
	 * Not `smooth`: there at once, and held there for a few seconds while
	 * the page is still finding its size.
	 */
	to: (target: Element, smooth: boolean) => boolean;
	off: () => void;
}
export let pano: Pano | null = null;

export type ScrollTimelineCtor = new (options: {
	source: Element;
	axis: string;
}) => AnimationTimeline;

export function bindPano(page: Element) {
	unbindPano();
	const el = page.querySelector<HTMLElement>("[data-m-pano]");
	if (!el) return;
	const title = el.querySelector<HTMLElement>('[data-m-layer="title"]');
	const photo = document.querySelector<HTMLElement>(config.photo);
	// as wide as the background has to be (the window, and under the iPhone
	// Duo's rail if there is one: see --bg-bleed-r in metro.css)
	const cover = document.querySelector<HTMLElement>(config.cover);
	// listeners to take off again when the page goes. Kept by hand rather
	// than with an AbortSignal: older browsers ignore that option without
	// a word, and a keydown listener left behind would go on swallowing
	// the arrow keys on every other page.
	const undo: (() => void)[] = [];
	const listen = <E extends Event>(
		target: EventTarget,
		type: string,
		fn: (e: E) => void,
		options?: AddEventListenerOptions
	) => {
		target.addEventListener(type, fn as EventListener, options);
		undo.push(() =>
			target.removeEventListener(type, fn as EventListener, options)
		);
	};
	const Timeline = (window as { ScrollTimeline?: ScrollTimelineCtor })
		.ScrollTimeline;
	const canTranslate = CSS.supports("translate", "1px 0");

	// (a strip, or a phone's column: as of the last measure())
	let strip = true;
	let range = 0;
	let titleTravel = 0;
	let photoTravel = 0;
	let driven: Animation[] = [];
	let raf = 0;
	// a section being held in place (see to(), under "jumps")
	let pinned: HTMLElement | null = null;
	let unpin = 0;

	const place = () => {
		raf = 0;
		const t = range > 0 ? Math.min(1, Math.max(0, el.scrollLeft / range)) : 0;
		if (title)
			title.style.transform = `translate3d(${(-t * titleTravel).toFixed(1)}px, 0, 0)`;
		if (photo && canTranslate)
			photo.style.translate = `${(-t * photoTravel).toFixed(1)}px 0`;
	};

	// Text that has to fit: [data-m-fit] is in a box of a set height where
	// nothing scrolls (whoami, on the start screen), and it has to fit
	// whatever it says. The stylesheet lays it out from two custom
	// properties, --fit-scale (its size) and --fit-cols (how many columns,
	// which it evens out, and makes the box that many wide); this finds the
	// first that fits: as it is, then a little smaller, then in two columns,
	// three... Where the box isn't held to a height it fits as it is, and
	// nothing's set.
	//
	// And where there's something to go under the text if the column has
	// the height for both (the box's next sibling, in a [data-m-fit-stack]),
	// that's tried before any of it: the text in one column at each size
	// with the other thing under it, which the stylesheet does for
	// [data-m-stacked] on the column. Without it, it's put beside.
	const fitText = () => {
		for (const box of el.querySelectorAll<HTMLElement>("[data-m-fit]")) {
			const set = (scale: string | null, cols: number) => {
				if (scale) box.style.setProperty("--fit-scale", scale);
				else box.style.removeProperty("--fit-scale");
				if (cols > 1) box.style.setProperty("--fit-cols", `${cols}`);
				else box.style.removeProperty("--fit-cols");
			};
			// (too much for its columns, and it starts another off the side)
			const fits = () =>
				box.scrollHeight <= box.clientHeight + 1 &&
				box.scrollWidth <= box.clientWidth + 1;
			const sizes = [null, "0.95", "0.9"];
			const tries: [scale: string | null, cols: number, stacked: boolean][] =
				[];
			// (only where the thing under it is a box of its own just now: in
			// the layouts where it isn't, there's nothing to decide)
			const stack = box.closest<HTMLElement>("[data-m-fit-stack]");
			const under = stack && box.nextElementSibling;
			if (stack && under && under.getClientRects().length)
				for (const scale of sizes) tries.push([scale, 1, true]);
			for (const scale of sizes) tries.push([scale, 1, false]);
			for (let cols = 2; cols <= 8; cols++) tries.push(["0.95", cols, false]);
			for (const [scale, cols, stacked] of tries) {
				stack?.toggleAttribute("data-m-stacked", stacked);
				set(scale, cols);
				if (fits()) break;
			}
		}
	};

	const measure = () => {
		strip = /auto|scroll/.test(getComputedStyle(el).overflowX);
		// (first: it changes how wide the strip is)
		fitText();
		if (!strip) {
			// a column: nothing to pan, so nothing for the layers to do
			range = 0;
			if (pinned) scrollTo(0, restOf(pinned));
			driven.forEach((a) => a.cancel());
			driven = [];
			if (title) title.style.transform = "";
			if (photo) photo.style.translate = "";
			return;
		}
		range = Math.max(0, el.scrollWidth - el.clientWidth);
		// (a section the page was opened at stays put while what's before it
		// is still changing size: see to(), below)
		if (pinned) el.scrollLeft = stopOf(pinned);
		// by the far end the title has gone most of its own length, so its
		// tail is what's left over the last section
		titleTravel = title
			? Math.min(range * 0.6, Math.max(0, title.scrollWidth * 0.62))
			: 0;
		// the photo can go as far as it's wider than what it has to cover
		// (so not at all with a rail, where it's exactly that wide)
		photoTravel = photo
			? Math.max(
					0,
					Math.min(
						photo.offsetWidth - (cover?.offsetWidth ?? el.clientWidth),
						range * 0.25
					)
				)
			: 0;
		driven.forEach((a) => a.cancel());
		driven = [];
		if (still()) {
			if (title) title.style.transform = "";
			if (photo) photo.style.translate = "";
			return;
		}
		if (Timeline && range > 0) {
			try {
				const timeline = new Timeline({ source: el, axis: "x" });
				const tie = (target: HTMLElement, frames: Keyframe[]) =>
					driven.push(
						target.animate(frames, {
							timeline,
							fill: "both",
							easing: "linear",
						} as KeyframeAnimationOptions)
					);
				if (title) {
					title.style.transform = "";
					tie(title, [
						{ transform: "translate3d(0, 0, 0)" },
						{ transform: `translate3d(${-titleTravel}px, 0, 0)` },
					]);
				}
				if (photo && canTranslate) {
					photo.style.translate = "";
					tie(photo, [
						{ translate: "0px 0px" },
						{ translate: `${-photoTravel}px 0px` },
					]);
				}
				return;
			} catch {
				driven.forEach((a) => a.cancel());
				driven = [];
			}
		}
		place();
	};

	listen(
		el,
		"scroll",
		() => {
			if (!driven.length) raf ||= requestAnimationFrame(place);
		},
		{ passive: true }
	);

	// --- wheel ---
	const snaps = () => getComputedStyle(el).scrollSnapType.includes("mandatory");
	// (the ones that are there: one that a layout has put away has no box)
	const sections = () =>
		Array.from(el.querySelectorAll<HTMLElement>("[data-m-pano-item]")).filter(
			(section) => section.getClientRects().length
		);
	// how far it can scroll, measured on the spot (`range` is as of the
	// last measure(), and tiles loading in can have widened things since)
	const reach = () => Math.max(0, el.scrollWidth - el.clientWidth);
	// where a section comes to rest, as a scroll position: its left edge at
	// the page's margin, which is where everything here comes to rest
	function stopOf(section: HTMLElement) {
		const pad = parseFloat(getComputedStyle(el!).scrollPaddingLeft) || 0;
		const base = el!.getBoundingClientRect().left - el!.scrollLeft;
		return Math.max(
			0,
			Math.min(reach(), section.getBoundingClientRect().left - base - pad)
		);
	}
	// ...and in a phone's column, how far down the page it is: its top at
	// the window's (less the room the stylesheet asks for over it). The
	// first one is the top of the page, title and all.
	function restOf(section: HTMLElement) {
		if (section === sections()[0]) return 0;
		const over = parseFloat(getComputedStyle(section).scrollMarginTop) || 0;
		const max = document.documentElement.scrollHeight - innerHeight;
		return Math.max(
			0,
			Math.min(max, section.getBoundingClientRect().top + scrollY - over)
		);
	}
	const stops = () => sections().map(stopOf);
	const step = (dir: 1 | -1) => {
		const here = el.scrollLeft;
		const list = stops();
		const next =
			dir > 0
				? list.find((x) => x > here + 8)
				: [...list].reverse().find((x) => x < here - 8);
		el.scrollTo({
			left: next ?? (dir > 0 ? reach() : 0),
			behavior: still() ? "auto" : "smooth",
		});
	};

	// does something between the pointer and the panorama still have room
	// to scroll this way itself?
	const scrollsInside = (from: Element | null, dy: number) => {
		for (let n = from; n && n !== el; n = n.parentElement) {
			if (n.scrollHeight <= n.clientHeight + 1) continue;
			const oy = getComputedStyle(n).overflowY;
			if (oy !== "auto" && oy !== "scroll") continue;
			if (
				dy < 0
					? n.scrollTop > 0
					: n.scrollTop + n.clientHeight < n.scrollHeight - 1
			)
				return true;
		}
		return false;
	};

	// The wheel-driven pan eases towards `target`. It keeps its own running
	// position (`at`) rather than reading scrollLeft back every frame: the
	// browser rounds scrollLeft to whole device pixels, and a loop that
	// keeps adding a fraction of what's left to a rounded number stalls a
	// pixel short of its target and never ends. And it only carries on
	// while the panorama is still where it last put it: once anything else
	// has scrolled it (a sideways swipe, the scrollbar, a find-in-page jump)
	// the glide is over, instead of hauling the panorama back to wherever
	// it had been heading.
	const GLIDE_MS = 60; // time constant of the ease
	let target = 0;
	let at = 0;
	let gliding = 0;
	let lastFrame = 0;
	let lastStep = 0;
	let lastWheel = 0;
	let acc = 0;
	const stopGlide = () => {
		cancelAnimationFrame(gliding);
		gliding = 0;
	};
	const glide = (now: number) => {
		gliding = 0;
		// (2px: what rounding can account for, with room to spare)
		if (Math.abs(el.scrollLeft - at) > 2) return;
		const dt = Math.min(Math.max(now - lastFrame, 0), 50);
		lastFrame = now;
		at += (target - at) * (1 - Math.exp(-dt / GLIDE_MS));
		if (Math.abs(target - at) < 0.5) at = target;
		el.scrollLeft = at;
		if (at !== target) gliding = requestAnimationFrame(glide);
	};

	listen<WheelEvent>(
		el,
		"wheel",
		(e) => {
			if (!strip) return;
			if (e.ctrlKey || e.metaKey || e.shiftKey) return;
			if (Math.abs(e.deltaX) >= Math.abs(e.deltaY)) {
				// sideways already (a two-finger swipe): the browser's to
				// scroll, and a glide still in flight gets out of its way
				stopGlide();
				return;
			}
			if (scrollsInside(e.target as Element | null, e.deltaY)) return;
			const max = reach();
			if (max <= 0) return;
			e.preventDefault();
			const unit =
				e.deltaMode === 1 ? 36 : e.deltaMode === 2 ? el.clientWidth : 1;
			const dy = e.deltaY * unit;
			if (snaps()) {
				// sections snap: a wheel gesture is one section over
				const now = performance.now();
				if (now - lastWheel > 250) acc = 0;
				lastWheel = now;
				if (now - lastStep < 420) return;
				acc += dy;
				if (Math.abs(acc) < 40) return;
				lastStep = now;
				step(acc > 0 ? 1 : -1);
				acc = 0;
				return;
			}
			if (still()) {
				el.scrollLeft += dy;
				return;
			}
			if (!gliding) {
				at = target = el.scrollLeft;
				lastFrame = performance.now() - 16;
			}
			target = Math.max(0, Math.min(max, target + dy));
			gliding ||= requestAnimationFrame(glide);
		},
		{ passive: false }
	);
	listen(el, "pointerdown", stopGlide, { passive: true });
	listen(el, "touchstart", stopGlide, { passive: true });

	// --- jumps ---
	// Panning to a section: one the page was opened at ("/#projects"), or
	// that a link here asked for. Opened at it, the panorama is put there
	// at once and held there for a moment: the type arriving and the live
	// tiles filling in can still move a section along, and it should be
	// the section that stays put, not the number of pixels. Touching the
	// panorama lets go of it.
	const letGo = () => {
		pinned = null;
		clearTimeout(unpin);
	};
	const to = (target: Element, smooth: boolean) => {
		const section = target.closest<HTMLElement>("[data-m-pano-item]");
		if (!section || !el.contains(section)) return false;
		// (a section this layout has put away: there's nowhere to go)
		if (!section.getClientRects().length) return false;
		stopGlide();
		letGo();
		const behavior = smooth && !still() ? "smooth" : "auto";
		if (strip) el.scrollTo({ left: stopOf(section), behavior });
		else scrollTo({ top: restOf(section), behavior });
		if (!smooth) {
			pinned = section;
			unpin = window.setTimeout(letGo, 3000);
		}
		return true;
	};
	for (const type of ["wheel", "pointerdown", "touchstart"])
		listen(el, type, letGo, { passive: true });

	// a link here with data-m-pan goes to the "#section" it names: a jump
	// to another part of the same page (see jump(), under Navigation)
	listen<MouseEvent>(el, "click", (e) => {
		if (e.defaultPrevented || e.button !== 0) return;
		if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
		const link = (e.target as Element | null)?.closest?.<HTMLAnchorElement>(
			"a[data-m-pan]"
		);
		const hash = link?.getAttribute("href") ?? "";
		if (!hash.startsWith("#") || !panLinks.section(hash)) return;
		e.preventDefault();
		panLinks.jump(hash);
	});

	// --- keys: left/right walk the sections ---
	listen<KeyboardEvent>(window, "keydown", (e) => {
		if (!strip) return;
		if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
		const t = e.target as HTMLElement | null;
		if (
			t?.closest?.(
				"input, textarea, select, [contenteditable], [role=slider], audio, video, [data-keys]"
			)
		)
			return;
		if (e.key === "ArrowRight" || e.key === "PageDown") step(1);
		else if (e.key === "ArrowLeft" || e.key === "PageUp") step(-1);
		else if (e.key === "Home") el.scrollTo({ left: 0, behavior: "smooth" });
		else if (e.key === "End")
			el.scrollTo({ left: reach(), behavior: "smooth" });
		else return;
		stopGlide();
		letGo();
		e.preventDefault();
	});

	const sizes = new ResizeObserver(measure);
	sizes.observe(el);
	const track = el.querySelector("[data-m-pano-track]");
	if (track) sizes.observe(track);
	if (title) sizes.observe(title);
	if (reduceMotion) listen(reduceMotion, "change", measure);
	// (the type arriving changes how much room the text takes)
	if (document.fonts) listen(document.fonts, "loadingdone", measure);
	measure();

	pano = {
		el,
		to,
		off() {
			undo.forEach((off) => off());
			sizes.disconnect();
			stopGlide();
			letGo();
			cancelAnimationFrame(raf);
			driven.forEach((a) => a.cancel());
			if (title) title.style.transform = "";
			if (photo) photo.style.translate = "";
		},
	};
}

export function unbindPano() {
	pano?.off();
	pano = null;
}
