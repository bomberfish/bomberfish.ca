import type { Kept } from "./continuum";
import {
	EASE_IN,
	EASE_IN_OUT,
	EASE_OUT,
	IN_MS,
	OUT_MS,
	AWAY,
	TOWARDS,
	all,
	norm,
	onScreen,
	play,
} from "./core";
import { takePull } from "./swipe";

// ---------------------------------------------------------------------------
// Turnstile and feather
// ---------------------------------------------------------------------------

// A keyframe maker for `el` turned `deg` around the screen's left edge.
// The hinge and the vanishing point both belong to the screen, not to the
// element (so every tile of a feather turns around the same pole): the
// transform origin is put at the centre of the viewport, where the
// perspective then looks from, and the turn is wrapped in a shift that
// moves the hinge to the left edge. The perspective scales with the
// viewport so a 2000px monitor swings like the 480px phone did, instead of
// its far edge coming through the camera.
export function hinge(el: Element) {
	const r = el.getBoundingClientRect();
	const w = innerWidth;
	const distance = Math.max(900, w * 2);
	const origin = `${w / 2 - r.left}px ${innerHeight / 2 - r.top}px`;
	return (deg: number, extra?: Keyframe): Keyframe => ({
		transformOrigin: origin,
		transform:
			`perspective(${distance}px) translateX(${-w / 2}px) ` +
			`rotateY(${deg}deg) translateX(${w / 2}px)`,
		...extra,
	});
}

export function swingOut(
	el: Element,
	back: boolean,
	delay = 0,
	at = hinge(el)
) {
	return play(
		el,
		[
			at(0, { opacity: 1 }),
			{ opacity: 1, offset: 0.55 },
			at(back ? AWAY : TOWARDS, { opacity: 0 }),
		],
		{ duration: OUT_MS, delay, easing: EASE_IN }
	);
}

export function swingIn(el: Element, back: boolean, delay = 0, at = hinge(el)) {
	return play(
		el,
		[
			at(back ? TOWARDS : AWAY, { opacity: 0 }),
			{ opacity: 1, offset: 0.2 },
			at(0, { opacity: 1 }),
		],
		{ duration: IN_MS, delay, easing: EASE_OUT }
	);
}

// What takes part in a feather: the page's [data-m-feather] pieces that
// are on screen right now (outermost ones only).
export function pieces(page: Element): HTMLElement[] {
	const found = Array.from(
		page.querySelectorAll<HTMLElement>("[data-m-feather]")
	).filter((el) => onScreen(el.getBoundingClientRect()));
	return found.filter((el) => !found.some((o) => o !== el && o.contains(el)));
}

// Per-piece delays. Leaving, the sweep runs from the far side of the
// screen towards the hinge, and whatever was tapped (`last`) hangs on a
// beat after everything else; arriving, it runs outwards from the hinge.
export function beats(
	items: HTMLElement[],
	leaving: boolean,
	last?: Element | null
) {
	const w = innerWidth;
	const key = (el: Element) => {
		const r = el.getBoundingClientRect();
		const x = r.left + r.width / 2;
		const y = r.top + r.height / 2;
		return (leaving ? w - x : x) + y * 0.35;
	};
	const order = items
		.map((el) => ({ el, k: key(el) }))
		.sort((a, b) => a.k - b.k);
	const spread = Math.min(220, 38 * Math.max(0, order.length - 1));
	const delays = new Map<Element, number>();
	order.forEach(({ el }, i) =>
		delays.set(el, order.length > 1 ? (i / (order.length - 1)) * spread : 0)
	);
	if (last) {
		const tapped = items.find((el) => el.contains(last));
		if (tapped) delays.set(tapped, spread + 90);
	}
	return delays;
}

// the whole page blinks out once its pieces have gone (anything that isn't
// a piece: scrollbars, stray text)
export const vanish = (page: Element) =>
	play(page, [{ opacity: 0 }, { opacity: 0 }], { duration: 1 });

export async function featherOut(
	page: Element,
	back: boolean,
	source?: Element | null
) {
	const items = pieces(page);
	if (!items.length) return swingOut(page, back);
	const delays = beats(items, true, source);
	// (every hinge measured before anything moves: once one piece is on its
	// way, measuring the next has the browser work the page out again, and
	// with forty tiles that's the hitch at the start of a page change)
	const hinges = items.map(hinge);
	await all(
		items.map((el, i) => swingOut(el, back, delays.get(el), hinges[i]))
	);
	await vanish(page);
}

// (a piece with something landing in it, a kept thing from the last page,
// doesn't swing: what lands is aimed at where the piece is, so it has to be
// there already. It comes up out of nothing where it stands.)
export const appear = (el: Element) =>
	play(el, [{ opacity: 0 }, { opacity: 1 }], {
		duration: IN_MS,
		easing: "ease-out",
	});

export function featherIn(page: Element, back: boolean, kept?: Kept | null) {
	const items = pieces(page);
	if (!items.length) return swingIn(page, back);
	const delays = beats(items, false);
	const hinges = items.map(hinge);
	return all(
		items.map((el, i) =>
			kept?.lands(el)
				? appear(el)
				: swingIn(el, back, delays.get(el), hinges[i])
		)
	);
}

// ---------------------------------------------------------------------------
// Continuum
// ---------------------------------------------------------------------------

// The page feathers out around what was tapped, which sinks; what's kept
// of it (its title, its picture: data-m-keep) isn't in the page any more by
// then but over it, and stays where it was...
export async function continuumOut(page: Element, source?: Element | null) {
	const row = source?.closest<HTMLElement>("[data-m-feather]") ?? null;
	if (!row) return featherOut(page, false, source);
	const rest = pieces(page).filter((el) => el !== row);
	const delays = beats(rest, true);
	const hinges = rest.map(hinge);
	await all([
		...rest.map((el, i) => swingOut(el, false, delays.get(el), hinges[i])),
		play(
			row,
			[
				{ transform: "translate3d(0, 0, 0)", opacity: 1 },
				{ transform: "translate3d(0, 2.5rem, 0)", opacity: 0 },
			],
			{ duration: OUT_MS + 120, easing: EASE_IN }
		),
	]);
	await vanish(page);
}

// ...and then travels to its place on the new page, which rises under it.
export function continuumIn(page: Element, kept?: Kept | null) {
	if (!kept?.any) return swingIn(page, false);
	const items = pieces(page);
	if (!items.length) return appear(page);
	let n = 0;
	return all(
		items.map((el) =>
			kept.lands(el)
				? appear(el)
				: play(
						el,
						[
							{ transform: "translate3d(0, 3.5rem, 0)", opacity: 0 },
							{ opacity: 1, offset: 0.4 },
							{ transform: "translate3d(0, 0, 0)", opacity: 1 },
						],
						{
							duration: IN_MS,
							delay: 40 + Math.min(n++, 8) * 30,
							easing: EASE_OUT,
						}
					)
		)
	);
}

// ---------------------------------------------------------------------------
// Pivot
// ---------------------------------------------------------------------------

// The strip of headers is one line that goes round: [projects, blog, about]
// with "blog" picked becomes [blog, about, projects]. So going on, the strip
// slides left until the one that was picked is at the front, the headers
// that were ahead of it fading as they go off (they come back in at the far
// end); going back it slides right, and the ones that go off the far end
// come in at the front. Either way the headers that are on both strips end
// the way out exactly where the next page has them, and in its colours, so
// that when the page under them changes they don't move at all: the next
// page only has to bring in the ones that went round. (`stays`: which those
// are not, by their words.) The content leaves the same way, faster.
// `dir` is 1 forwards (everything goes left), -1 back.
export let stays: Set<string> | null = null;

export const headerKey = (el: Element) => (el.textContent ?? "").trim();

export function pivotOut(
	page: Element,
	dir: 1 | -1,
	source?: Element | null,
	to?: string
) {
	stays = null;
	const strip = page.querySelector<HTMLElement>("[data-m-pivot]");
	const contents = Array.from(
		page.querySelectorAll<HTMLElement>("[data-m-content]")
	);
	if (!strip || !contents.length) return swingOut(page, dir < 0);
	const headers = Array.from(strip.children) as HTMLElement[];
	const lead = headers[0];
	// the header it's going to: the one that was pressed, or the one that
	// leads to where this is going
	const at = headers.findIndex((el, i) =>
		i === 0
			? false
			: source && strip.contains(source)
				? el.contains(source)
				: to != null &&
					el instanceof HTMLAnchorElement &&
					norm(el.pathname) === to
	);
	const target = at > 0 ? headers[at] : null;
	const moves: (Promise<void> | false | null | undefined)[] = [];
	if (target && lead) {
		const rects = headers.map((el) => el.getBoundingClientRect());
		const gap = rects.length > 1 ? rects[1].left - rects[0].right : 0;
		// forwards, the picked one comes to the front; back, it and what's
		// after it go round to the front, and the rest make room for them
		const shift =
			dir > 0
				? rects[0].left - rects[at].left
				: rects[rects.length - 1].right - rects[at].left + gap;
		const going = dir > 0 ? headers.slice(0, at) : headers.slice(at);
		stays = new Set(headers.filter((el) => !going.includes(el)).map(headerKey));
		const bright = getComputedStyle(lead);
		const dim = getComputedStyle(
			headers.find((el, i) => i > 0 && el !== target) ?? target
		);
		const tone = (el: Element, style: CSSStyleDeclaration) =>
			play(el, [{}, { color: style.color, textShadow: style.textShadow }], {
				duration: OUT_MS,
				easing: "ease-in-out",
			});
		moves.push(
			play(
				strip,
				[
					{ transform: "translate3d(0, 0, 0)" },
					{ transform: `translate3d(${shift}px, 0, 0)` },
				],
				{ duration: OUT_MS + 80, easing: EASE_IN_OUT }
			),
			...going.map((el) =>
				play(el, [{ opacity: 1 }, { opacity: 0 }], {
					duration: OUT_MS * 0.7,
					easing: EASE_IN,
				})
			),
			// (forwards the picked one lights up as it gets to the front;
			// back, the one at the front dims as it gives the place up)
			dir > 0 ? tone(target, bright) : tone(lead, dim)
		);
		// (the page stays in sight while the next one's fetched: its strip
		// is what's on screen until that one's is, in the same place)
		page.setAttribute("data-m-stay", "");
	} else {
		moves.push(
			play(
				strip,
				[
					{ transform: "translate3d(0, 0, 0)" },
					{ transform: `translate3d(${-dir * 140}px, 0, 0)` },
				],
				{ duration: OUT_MS, easing: EASE_IN_OUT }
			),
			lead &&
				play(lead, [{ opacity: 1 }, { opacity: 0 }], {
					duration: OUT_MS * 0.7,
					easing: EASE_IN,
				})
		);
	}
	// (swiped here, the content's already part of the way: ./swipe.ts)
	const pull = takePull();
	return all([
		...moves,
		...contents.map((content) =>
			play(
				content,
				[
					{ transform: `translate3d(${pull}px, 0, 0)`, opacity: 1 },
					{ opacity: 1, offset: 0.4 },
					{
						transform: `translate3d(${-dir * innerWidth * 0.4}px, 0, 0)`,
						opacity: 0,
					},
				],
				{ duration: OUT_MS, easing: EASE_IN }
			)
		),
	]);
}

// The headers that went round come in at their end of the new strip (the
// rest are where the last page left them, and stay), and the content comes
// in from the same side: piece by piece, each a little later and from a
// little further off, which is the pivot's slide-in.
export function pivotIn(page: Element, dir: 1 | -1) {
	const strip = page.querySelector<HTMLElement>("[data-m-pivot]");
	const contents = Array.from(
		page.querySelectorAll<HTMLElement>("[data-m-content]")
	);
	const stayed = stays;
	stays = null;
	if (!strip || !contents.length) return swingIn(page, dir < 0);
	const from = (px: number): Keyframe[] => [
		{ transform: `translate3d(${dir * px}px, 0, 0)`, opacity: 0 },
		{ opacity: 1, offset: 0.3 },
		{ transform: "translate3d(0, 0, 0)", opacity: 1 },
	];
	const headers = Array.from(strip.children);
	const entering = stayed
		? headers.filter((el) => !stayed.has(headerKey(el)))
		: headers.slice(1);
	// (back, they come in from the left, the nearest to its place first)
	if (dir < 0) entering.reverse();
	// the content's pieces that are on screen, top to bottom; a content
	// block with none of its own comes in whole
	const inside = pieces(page).filter((el) =>
		contents.some((c) => c.contains(el))
	);
	const items = [
		...inside,
		...contents.filter(
			(c) =>
				!inside.some((el) => c.contains(el)) &&
				onScreen(c.getBoundingClientRect())
		),
	].sort(
		(a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top
	);
	const far = Math.min(innerWidth * 0.35, 420);
	return all([
		...entering.map((el, i) =>
			play(el, from(90 + i * 40), {
				duration: IN_MS + 60,
				delay: i * 30,
				easing: EASE_OUT,
			})
		),
		...items.map((el, i) =>
			play(el, from(far + Math.min(i, 14) * 24), {
				duration: IN_MS + 140,
				delay: 50 + Math.min(i, 14) * 26,
				easing: EASE_OUT,
			})
		),
	]);
}
