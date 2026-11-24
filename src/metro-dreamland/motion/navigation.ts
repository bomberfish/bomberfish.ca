import { router } from "dreamland/router";
import { keep, type Kept } from "./continuum";
import {
	type MetroConfig,
	SSR,
	config,
	configure,
	flags,
	hostEl,
	isPivot,
	norm,
	pageEl,
	release,
	root,
	still,
} from "./core";
import { material, startMaterial } from "./material";
import { bindPano, pano, panLinks, unbindPano } from "./panorama";
import { startReveal } from "./reveal";
import { startSwipe, swipes } from "./swipe";
import { flipOf, flipTo, hoverFlip, tickTiles } from "./tiles";
import { press, pressTarget, unpress } from "./tilt";
import {
	continuumIn,
	continuumOut,
	featherIn,
	featherOut,
	pivotIn,
	pivotOut,
	swingIn,
	swingOut,
} from "./transitions";

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

export type Kind = "turnstile" | "pivot" | "continuum";

// The site's own history bookkeeping. Every entry carries, in
// history.state (so it survives reloads and coming back from elsewhere):
//
//   idx    its place in the order of entries: tells the browser's back
//          from its forward, and keys the scroll position each entry was
//          left at
//   trail  the pages that led to it and itself, oldest first, for as far
//          back as this visit to the site goes. An entry's trail is what's
//          behind it in the browser's history, which is how the back
//          button knows where you came from (wayBack) and how far back
//          that is. `up` marks a page that was arrived at by going up to
//          it from one inside it.
//
// Positions are also kept per page (`lastAt`), for arriving at a page the
// other way: by going up to it.
export type Spot = { y: number; pano: number };
export type Step = { p: string; up?: 1 };
export type Entry = { idx: number; trail: Step[] };
export const TRAIL_MAX = 40;
export let idx = 0;
export let trail: Step[] = [];
export let path = "";
export let turn = 0; // bumps per navigation; an overtaken one stops animating
export let replaying = false; // our own re-sent popstate, on its way to the router
export const scrolls = new Map<number, Spot>();
export const lastAt = new Map<string, Spot>();

export function remember() {
	const spot = { y: scrollY, pano: pano?.el.scrollLeft ?? 0 };
	scrolls.set(idx, spot);
	lastAt.set(path, spot);
}

export const entry = () => history.state as Partial<Entry> | null;

// Take the history entry the browser is on as where we are. One the site
// didn't make (the first of a visit) has nothing known behind it.
export function readEntry() {
	const here = norm(location.pathname);
	const state = entry();
	idx = state?.idx ?? 0;
	trail =
		Array.isArray(state?.trail) && state.trail.at(-1)?.p === here
			? state.trail
			: [{ p: here }];
}

// Make the entry that's just been pushed (by the router, by jump(), or by
// the browser following a #link) the one after where we were. `up`: it was
// arrived at by going up; `url`: an address to give it while we're at it.
export function stamp(up = false, url?: string) {
	const p = norm(location.pathname);
	trail = [...trail, up ? { p, up: 1 as const } : { p }].slice(-TRAIL_MAX);
	idx += 1;
	history.replaceState({ ...entry(), idx, trail }, "", url || undefined);
}

// As far as going back is concerned these are one place: the same page (its
// #sections), and the pivot's sections, which are one page with three faces.
export const samePlace = (a: string, b: string) =>
	a === b || (isPivot(a) && isPivot(b));

/**
 * Where the back button leads: the page you came to this one from, and how
 * many history entries back that is. null if you didn't come from anywhere
 * on the site: this is where you landed, or you came up to here from a page
 * inside it (going back there would be going down again). Back is then up
 * a level.
 */
export function wayBack(): { steps: number; to: string } | null {
	// (back past everything that's this same place, to where you came in)
	let at = trail.length - 1;
	while (at > 0 && samePlace(trail[at - 1].p, path)) at--;
	if (at === 0 || trail[at].up) return null;
	return { steps: trail.length - at, to: trail[at - 1].p };
}

// How many entries back the nearest visit to a page is, 0 if it isn't behind
// you at all.
export function stepsTo(page: string) {
	for (let at = trail.length - 2; at >= 0; at--)
		if (trail[at].p === page) return trail.length - 1 - at;
	return 0;
}

// The element a "#hash" names, if it's on the page that's showing.
export function sectionOf(hash: string) {
	let id = hash.replace(/^#/, "");
	try {
		id = decodeURIComponent(id);
	} catch {
		// (a stray %: take it as it's written)
	}
	const target = id ? document.getElementById(id) : null;
	return target && pageEl()?.contains(target) ? target : null;
}

// Put the page at the #section its address names, if it names one: the
// panorama pans to a section of its own, anything else scrolls into view.
export function land(smooth = false) {
	const target = sectionOf(location.hash);
	if (!target) return false;
	if (pano?.to(target, smooth)) return true;
	target.scrollIntoView({
		behavior: smooth && !still() ? "smooth" : "auto",
		block: "start",
	});
	return true;
}

// ...or failing that, at its start; or `spot`, where it was left.
export function settle(smooth: boolean, spot?: Spot) {
	const behavior = smooth && !still() ? "smooth" : "auto";
	if (spot) {
		pano?.el.scrollTo({ left: spot.pano, behavior });
		scrollTo(0, spot.y);
	} else if (!land(smooth)) {
		pano?.el.scrollTo({ left: 0, behavior });
		scrollTo({ top: 0, behavior });
	}
}

/**
 * Go to another #section of the page that's showing ("" for its start).
 * The address takes the #, as a new history entry, so the browser's back
 * button undoes the jump; and "/#projects" opened cold starts there (see
 * metroReady).
 */
export function jump(hash: string) {
	if (hash !== location.hash) {
		remember();
		history.pushState(null, "", hash || location.pathname + location.search);
		stamp();
	}
	settle(true);
}

// The back button says where it's going: its href is the page it'll take
// you to (which is also where a new tab opened from it goes).
export function pointBack(page: Element | null) {
	const link = page?.querySelector<HTMLAnchorElement>("a[data-m-back]");
	if (!link) return;
	link.setAttribute("href", wayBack()?.to ?? link.dataset.mBack ?? "/");
}

// Wait for the router to have put a different page in the outlet.
export function swapped(from: Element | null): Promise<HTMLElement | null> {
	if (pageEl() !== from) return Promise.resolve(pageEl());
	return new Promise((resolve) => {
		const done = () => {
			watch.disconnect();
			clearTimeout(timer);
			resolve(pageEl());
		};
		const watch = new MutationObserver(() => {
			if (pageEl() !== from) done();
		});
		watch.observe(hostEl(), {
			childList: true,
			subtree: true,
		});
		const timer = setTimeout(done, 900);
	});
}

export function leave(
	page: Element,
	kind: Kind,
	back: boolean,
	source?: Element | null,
	to?: string
) {
	if (kind === "pivot") return pivotOut(page, back ? -1 : 1, source, to);
	if (kind === "continuum" && !back) return continuumOut(page, source);
	// going back, the page leaves in one piece; going on, in pieces
	return back ? swingOut(page, true) : featherOut(page, false, source);
}

export function arrive(
	page: Element,
	kind: Kind,
	back: boolean,
	kept?: Kept | null
) {
	if (kind === "pivot") return pivotIn(page, back ? -1 : 1);
	if (kind === "continuum" && !back) return continuumIn(page, kept);
	// tiles come back (and the start screen always arrives) piece by piece;
	// a page you open comes round in one
	return back || page.matches('[data-m-page="pano"]')
		? featherIn(page, back, kept)
		: swingIn(page, back);
}

// Can a kept thing be seen, for all that it's on screen? Not on the face
// of a flip tile that's turned away.
export function faceUp(el: HTMLElement) {
	const face = el.closest(".tile-face");
	if (!face) return true;
	const flipped = !!face.closest(".tile")?.classList.contains("is-flipped");
	return face.classList.contains("tile-back") ? flipped : !flipped;
}

// Set a page up once it's in the document: the panorama's layers, and
// where it's scrolled to (`at`: back where it was; "top": a fresh visit).
export function adopt(page: Element | null, at?: Spot | "top") {
	if (page) bindPano(page);
	else unbindPano();
	pointBack(page);
	if (!at) return;
	if (pano) pano.el.scrollLeft = at === "top" ? 0 : at.pano;
	scrollTo(0, at === "top" ? 0 : at.y);
}

export async function transition(
	swap: () => unknown,
	opts: {
		kind: Kind;
		back: boolean;
		source?: Element | null;
		// the path it's going to, where that's known
		to?: string;
		// put the page back where it was: "entry", as this history entry
		// was left (back/forward); "page", as the page was last left (up)
		restore?: "entry" | "page";
	}
) {
	const mine = ++turn;
	const from = pageEl();
	remember();
	release();
	unpress();
	flags.busy = true;
	// what's on both pages stays on screen through all of this (continuum):
	// taken out of the page before it starts to go
	// (going on, only what's in the thing that was pressed; going back,
	// whatever there is, since the page before may have its other end)
	const kept = keep(opts.back || opts.source ? from : null, {
		within: opts.back ? null : opts.source,
		visible: faceUp,
	});
	try {
		if (from) await leave(from, opts.kind, opts.back, opts.source, opts.to);
		// overtaken on the way out (a second click): that one takes it from
		// here, this page change doesn't happen
		if (mine !== turn) return;
		// the next page stays out of sight until it makes its entrance
		root().classList.add("m-swapping");
		try {
			await swap();
		} catch (error) {
			console.error(error);
		}
		const to = await swapped(from);
		from?.removeAttribute("data-m-stay");
		if (mine !== turn) return;
		release();
		path = norm(location.pathname);
		readEntry();
		const spot =
			opts.restore === "entry"
				? scrolls.get(idx)
				: opts.restore === "page"
					? lastAt.get(path)
					: undefined;
		adopt(to, spot ?? "top");
		// (a fresh visit to "/somewhere#there" starts there)
		if (!spot) land();
		// (the page is laid out and where it'll be, and hasn't moved yet:
		// the moment to aim what was kept at its place in it)
		await kept.ready(to);
		if (mine !== turn) return;
		const flight = kept.into(to);
		const entrance = to
			? arrive(to, opts.kind, opts.back, kept)
			: Promise.resolve();
		root().classList.remove("m-swapping");
		await Promise.all([entrance, flight]);
		if (mine === turn) release();
	} finally {
		from?.removeAttribute("data-m-stay");
		kept.end();
		if (mine === turn) {
			flags.busy = false;
			root().classList.remove("m-swapping");
		}
	}
}

export function kindOf(source: Element | null | undefined, to: string): Kind {
	const hint = source?.closest<HTMLElement>("[data-m-nav]")?.dataset.mNav;
	if (hint === "pivot" && !isPivot(to)) return "turnstile";
	if (hint === "pivot" || hint === "continuum") return hint;
	// (something to keep in what was pressed: that's a continuum, said or not)
	return source?.querySelector("[data-m-keep]") ? "continuum" : "turnstile";
}

/**
 * Go to another page of the site, animated. `source` is what was clicked:
 * it picks the transition (its data-m-nav, or a feather it leaves last).
 *
 * Two kinds of link lead back rather than on, and play as a step back:
 *
 *   data-m-back  The back button. It goes back to where you came from: the
 *                page you got here from, wherever that was (wayBack). Only
 *                if you didn't come from anywhere on the site (you opened
 *                this page from outside, or climbed up to it) does it go up
 *                a level instead, to its href.
 *   data-m-up    A link up to a particular page (the breadcrumbs).
 *
 * Either way, if the page it leads to is behind you in the browser's
 * history, it goes back there: the same as pressing the browser's own back
 * button that many times, so the two never disagree and going in and out
 * of things doesn't pile up history. Otherwise it's a new entry, and the
 * page is put back where it was last left.
 */
export async function navigate(
	href: string,
	source?: Element | null
): Promise<void> {
	if (SSR) return;
	const url = new URL(href, location.href);
	const to = norm(url.pathname);
	const up = source?.closest<HTMLElement>("[data-m-up], [data-m-back]");
	if (up) {
		const steps =
			(up.matches("[data-m-back]") && wayBack()?.steps) || stepsTo(to);
		if (steps) {
			// (onPopState takes it from here)
			history.go(-steps);
			return;
		}
	}
	if (to === path) {
		// the page that's showing: another #section of it, or its start
		jump(url.hash);
		return;
	}
	await transition(
		async () => {
			// (the router's entry is the path alone: the # is put back on)
			if (await router?.navigate(href)) stamp(!!up, url.hash);
		},
		{
			kind: kindOf(source, url.pathname),
			back: !!up,
			source,
			to,
			restore: up ? "page" : undefined,
		}
	);
}

/**
 * On a pivot page, turn to the section after this one in its strip (1) or
 * the one before it (-1), which is the last in the strip: it goes round.
 * What a swipe across the page does (./swipe.ts). It's a page change like
 * picking the header would be, a new entry and all; going back, it plays
 * the other way. False if this isn't a pivot with somewhere to turn to.
 */
export function turnPivot(dir: 1 | -1) {
	const links = Array.from(
		pageEl()?.querySelectorAll<HTMLAnchorElement>(
			'[data-m-pivot] a[data-m-nav="pivot"]'
		) ?? []
	);
	const link = dir > 0 ? links[0] : links[links.length - 1];
	if (!link || flags.busy) return false;
	const href = link.getAttribute("href") ?? "";
	const url = new URL(href, location.href);
	const to = norm(url.pathname);
	if (!isPivot(to) || to === path) return false;
	void transition(
		async () => {
			if (await router?.navigate(href)) stamp(false, url.hash);
		},
		{ kind: "pivot", back: dir < 0, to }
	);
	return true;
}

// The browser's back/forward. The router listens for popstate too and
// swaps the page the moment it fires, which leaves no room for the old
// page to make an exit; so this listener (registered first: startMetro()
// runs before the app hydrates) holds the event back, plays the exit, and
// only then sends the router a popstate of its own.
export function onPopState(e: PopStateEvent) {
	if (replaying) return;
	const next = norm(location.pathname);
	if (next === path) {
		// The same page: another #section of it, and nothing for the router
		// to do. Back or forward between them puts the page where that
		// entry was left.
		remember();
		if (entry()?.idx != null) {
			readEntry();
			pointBack(pageEl());
			settle(true, scrolls.get(idx));
			return;
		}
		// An entry with no idx is one the browser has just made itself (a
		// plain #link it followed, an address edited by hand): it's stamped
		// as the next, and the page goes to the section. Once the browser
		// has done its own scrolling to it, that is, which comes right
		// after this event and would otherwise have the last word: it
		// brings a section into view by whichever edge is nearer, where
		// the panorama wants its start at the margin. (A # that names
		// nothing here moves nothing, as it wouldn't anywhere else.)
		stamp();
		pointBack(pageEl());
		setTimeout(() => land());
		return;
	}
	e.stopImmediatePropagation();
	const target = entry()?.idx ?? 0;
	const goingBack = target <= idx;
	void transition(
		() => {
			replaying = true;
			try {
				dispatchEvent(new PopStateEvent("popstate", { state: history.state }));
			} finally {
				replaying = false;
			}
		},
		{
			kind: isPivot(next) && isPivot(path) ? "pivot" : "turnstile",
			back: goingBack,
			to: next,
			restore: "entry",
		}
	);
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

declare global {
	interface Window {
		__metro?: boolean;
	}
}

/**
 * Listeners. Call before the app hydrates, so the popstate listener is
 * ahead of the router's.
 */
export function startMetro(options?: Partial<MetroConfig>) {
	configure(options);
	if (SSR || window.__metro) return;
	window.__metro = true;
	startMaterial(config.material);
	// (the panorama's own links to its sections come through here)
	panLinks.section = sectionOf;
	panLinks.jump = jump;
	// (and a swipe across a pivot)
	swipes.turn = turnPivot;
	startSwipe();

	path = norm(location.pathname);
	readEntry();
	// (the first entry of a visit is stamped too, so that one without an
	// idx can only be one the browser has made since: see onPopState)
	if (entry()?.idx == null) {
		try {
			history.replaceState({ ...entry(), idx, trail }, "");
		} catch {
			// (not allowed to, somehow: back and forward still work)
		}
	}
	addEventListener("popstate", onPopState, true);
	// a #link followed, where that doesn't come with a popstate
	addEventListener("hashchange", () => {
		if (entry()?.idx != null) return;
		stamp();
		pointBack(pageEl());
		land();
	});

	// scroll positions are restored here (after the exit has played), not
	// by the browser at popstate time, which would jerk the old page
	// around on its way out. A reload still comes back where it was.
	try {
		history.scrollRestoration = "manual";
		const saved = sessionStorage.getItem("metro-scroll");
		sessionStorage.removeItem("metro-scroll");
		const nav = performance.getEntriesByType("navigation")[0] as
			| PerformanceNavigationTiming
			| undefined;
		if (saved && nav?.type === "reload") {
			const at = JSON.parse(saved) as { idx: number; y: number; pano: number };
			if (at.idx === idx) scrolls.set(idx, { y: at.y, pano: at.pano });
		}
		addEventListener("pagehide", () => {
			remember();
			sessionStorage.setItem(
				"metro-scroll",
				JSON.stringify({ idx, ...scrolls.get(idx) })
			);
		});
	} catch {
		// no session storage: a reload starts at the top
	}

	// tilt
	addEventListener(
		"pointerdown",
		(e) => {
			if (e.pointerType === "mouse" && e.button !== 0) return;
			const el = pressTarget(e);
			if (el) press(el, e.clientX, e.clientY);
		},
		{ passive: true }
	);
	for (const type of ["pointerup", "pointercancel", "dragstart", "blur"])
		addEventListener(type, unpress, { passive: true });
	// scrolling under a finger cancels the press like the phone did
	addEventListener("scroll", unpress, { passive: true, capture: true });
	addEventListener("keydown", (e) => {
		if (e.repeat || (e.key !== "Enter" && e.key !== " ")) return;
		const el = pressTarget(e);
		if (!el) return;
		const r = el.getBoundingClientRect();
		press(el, r.left + r.width / 2, r.top + r.height / 2);
	});
	addEventListener("keyup", unpress);

	// live tiles
	// Windows 10's light under the pointer, on the tiles (the drawing of it
	// is with the tile rules in metro.css; the tracking, ./reveal.ts)
	// (reach: as far as the wider of its lights goes, 4.8125rem, and a bit)
	if (!still() && config.reveal)
		startReveal(config.reveal, {
			when: () => material() === "acrylic",
			reach: 5.5 * parseFloat(getComputedStyle(root()).fontSize),
		});
	addEventListener("pointerover", (e) => hoverFlip(e, true), { passive: true });
	addEventListener("pointerout", (e) => hoverFlip(e, false), { passive: true });
	addEventListener("focusin", (e) => {
		const tile = (e.target as Element | null)?.closest?.<HTMLElement>(
			"[data-m-flip]"
		);
		if (!tile || !(e.target as Element).matches(":focus-visible")) return;
		flipOf(tile).hover = true;
		flipTo(tile, true);
	});
	addEventListener("focusout", (e) => {
		const tile = (e.target as Element | null)?.closest?.<HTMLElement>(
			"[data-m-flip]"
		);
		if (!tile || tile.contains(e.relatedTarget as Node | null)) return;
		flipOf(tile).hover = false;
		flipTo(tile, false);
	});
	setInterval(tickTiles, 500);
}

/**
 * The first page. Call once the app has hydrated: sets the page up and, if
 * index.html's boot script is still holding it back (html.m-boot), plays
 * its entrance.
 */
export function metroReady() {
	if (SSR) return;
	const enter = () => {
		const page = pageEl();
		adopt(page, scrolls.get(idx));
		// opened at "/#projects": the page starts at that section (a reload
		// comes back where it was instead)
		if (!scrolls.has(idx)) land();
		const boot = root().classList.contains("m-boot");
		if (page && boot) {
			flags.busy = true;
			const mine = ++turn;
			void arrive(page, "turnstile", false).then(() => {
				if (mine !== turn) return;
				release();
				flags.busy = false;
			});
		}
		root().classList.remove("m-boot");

		// pages can also change hands without coming through here (the
		// router's first render, anything unforeseen): keep the panorama
		// bound to whatever is actually showing
		let seen = page;
		new MutationObserver(() => {
			const now = pageEl();
			if (now === seen) return;
			seen = now;
			if (flags.busy) return;
			path = norm(location.pathname);
			readEntry();
			adopt(now);
		}).observe(hostEl(), {
			childList: true,
			subtree: true,
		});
	};
	// a frame's grace for hydration to finish putting the page together
	requestAnimationFrame(enter);
}
