import { EASE_IN, EASE_OUT, SSR, play, release, still } from "./core";

// ---------------------------------------------------------------------------
// Marquee
// ---------------------------------------------------------------------------

// A line of text too long for where it is. It may wrap onto so many lines;
// when that isn't enough it goes on one line and travels through it: it
// rests at its start for a moment, eases up to a steady pace, and eases to
// rest again just as a second copy of itself arrives where the first began,
// so the loop has no seam and the rest that follows is the next one's. The
// far edge fades out; the near one only does while the text is moving, so
// at rest its first letter is whole. It holds still under a pointer or with
// the focus in it, to be read or clicked, and with reduced motion it doesn't
// travel at all: it's on its one line all the same (so nothing around it
// sits differently), cut short with an ellipsis.
// Styles: "Marquee" in metro.css.

export const MARQUEE_REST_MS = 2600;
export const MARQUEE_RAMP_MS = 700; // getting up to pace, and coming down from it
export const MARQUEE_EM_PER_S = 1.8; // the pace, in the text's own size

export const marquees = new WeakMap<
	HTMLElement,
	{ key: string; off: () => void }
>();

/**
 * Fit `el`'s text: left to wrap if `lines` of it are enough, a marquee if
 * not. The text is `el`'s one child element (a span around whatever it is),
 * which the marquee puts a second copy of beside. Call it again whenever
 * the text or the room for it changes, and when the type arrives (the same
 * words are another width in the font that stands in until then): it starts
 * over only if something has.
 */
export function marquee(el: HTMLElement | null | undefined, lines = 1) {
	if (SSR || !el) return;
	const text = el.firstElementChild as HTMLElement | null;
	if (!text) return;
	// (the parent's width, not el's own: being a marquee can change that)
	const room = el.parentElement?.clientWidth ?? 0;
	// (and whether the type's arrived: the same words are another width in
	// the font that stands in until it has, so it's fitted again then)
	const fonts = document.fonts?.status ?? "loaded";
	const key = [text.textContent, room, lines, still(), fonts].join("\u0000");
	const was = marquees.get(el);
	if (was?.key === key) return;
	was?.off();
	const done = (off: () => void = () => {}) => marquees.set(el, { key, off });

	// as it comes: does it fit?
	const cs = getComputedStyle(el);
	const size = parseFloat(cs.fontSize);
	const line = parseFloat(cs.lineHeight) || size * 1.2;
	// (its own height, not scrollHeight: with lines set this close, the
	// letters' overhang counts as overflow, and everything would "not fit")
	if (el.offsetHeight <= line * lines + 1) return done();

	// (reduced motion: on the one line it would have had, cut short)
	if (still()) {
		el.classList.add("m-marquee-still");
		return done(() => el.classList.remove("m-marquee-still"));
	}

	el.classList.add("m-marquee");
	// One copy and the gap after it (its padding): how far a loop travels.
	// (As it's laid out, not as it's drawn: a tile can be mid-turn, on its
	// way in, when this is measured, and its text is narrower on screen.)
	const distance = text.offsetWidth;
	const gap = parseFloat(getComputedStyle(text).paddingInlineEnd) || 0;
	if (distance - gap <= el.clientWidth + 0.5) {
		// (on one line there's room for it after all: it's just kept on one)
		el.classList.replace("m-marquee", "m-marquee-fits");
		return done(() => el.classList.remove("m-marquee-fits"));
	}
	const copy = text.cloneNode(true) as HTMLElement;
	copy.setAttribute("aria-hidden", "true");
	for (const link of copy.querySelectorAll<HTMLElement>("a, button"))
		link.tabIndex = -1;
	el.append(copy);

	// One loop: rest, ease up to pace, go, ease down, and it's round. The
	// two eases are a steady acceleration and its mirror (those curves are
	// exactly that), so each covers half what the same time at pace would.
	const pace = (size * MARQUEE_EM_PER_S) / 1000; // px a millisecond
	const ramp = Math.min(MARQUEE_RAMP_MS, distance / pace);
	const eased = (pace * ramp) / 2;
	const going = (distance - 2 * eased) / pace;
	const duration = MARQUEE_REST_MS + 2 * ramp + going;
	const at = [
		0,
		MARQUEE_REST_MS / duration,
		(MARQUEE_REST_MS + ramp) / duration,
		(MARQUEE_REST_MS + ramp + going) / duration,
		1,
	];
	const x = (px: number) => `translate3d(${(-px).toFixed(2)}px, 0, 0)`;
	const travel: Keyframe[] = [
		{ offset: at[0], transform: x(0) },
		{
			offset: at[1],
			transform: x(0),
			easing: "cubic-bezier(0.33, 0, 0.67, 0.33)",
		},
		{ offset: at[2], transform: x(eased) },
		{
			offset: at[3],
			transform: x(distance - eased),
			easing: "cubic-bezier(0.33, 0.67, 0.67, 1)",
		},
		{ offset: at[4], transform: x(distance) },
	];
	// the near edge's fade: there while it moves (--m-fade, in the mask)
	const fade: Keyframe[] = [0, 0, 1, 1, 0].map((on, i) => ({
		offset: at[i],
		"--m-fade": on,
	}));
	const timing = { duration, iterations: Infinity };
	const animations = [
		text.animate(travel, timing),
		copy.animate(travel, timing),
		el.animate(fade, timing),
	];

	const hold = () => animations.forEach((a) => a.pause());
	const go = () => {
		if (el.matches(":hover, :focus-within")) return;
		animations.forEach((a) => a.play());
	};
	const events: [string, () => void][] = [
		["pointerenter", hold],
		["pointerleave", go],
		["focusin", hold],
		["focusout", () => requestAnimationFrame(go)],
	];
	for (const [type, fn] of events) el.addEventListener(type, fn);

	done(() => {
		animations.forEach((a) => a.cancel());
		copy.remove();
		for (const [type, fn] of events) el.removeEventListener(type, fn);
		el.classList.remove("m-marquee");
	});
}

// ---------------------------------------------------------------------------
// Swivel
// ---------------------------------------------------------------------------

/** Swing `el` in around its top edge (toasts, popups). */
export function swivelIn(el: HTMLElement) {
	return play(
		el,
		[
			{
				transformOrigin: "50% 0",
				transform: "perspective(800px) rotateX(-88deg)",
				opacity: 0,
			},
			{ opacity: 1, offset: 0.25 },
			{
				transformOrigin: "50% 0",
				transform: "perspective(800px) rotateX(0deg)",
				opacity: 1,
			},
		],
		{ duration: 380, easing: EASE_OUT }
	).then(() => release(el));
}

/** ...and back out the same way. Holds the last frame: remove `el` after. */
export function swivelOut(el: HTMLElement) {
	return play(
		el,
		[
			{
				transformOrigin: "50% 0",
				transform: "perspective(800px) rotateX(0deg)",
				opacity: 1,
			},
			{ opacity: 1, offset: 0.6 },
			{
				transformOrigin: "50% 0",
				transform: "perspective(800px) rotateX(88deg)",
				opacity: 0,
			},
		],
		{ duration: 240, easing: EASE_IN }
	);
}

/**
 * Change a line of text by turning it over: the old line swivels away
 * around its middle, `update` swaps the words, the new line swivels in.
 */
export async function swapText(el: HTMLElement, update: () => void) {
	const turn = (deg: number, opacity: number): Keyframe => ({
		transform: `perspective(600px) rotateX(${deg}deg)`,
		opacity,
	});
	await play(el, [turn(0, 1), turn(90, 0)], { duration: 150, easing: EASE_IN });
	update();
	await play(el, [turn(-90, 0), turn(0, 1)], {
		duration: 320,
		easing: EASE_OUT,
	});
	release(el);
}
