// Shared pieces of the social post cards (MastodonCard, TwitterCard): the
// fetch/refresh loop, the card header and the post's pictures, author, body
// and counts. Plain functions rather than components, so the cards render the
// exact same DOM (and hydrate the same) as when this was inlined in each.
// Their styles are the "Social post cards" section of src/style.css.

import { ComponentChild, createState, FC, Stateful } from "dreamland/core";
import { ago, compactAgo } from "../lib/format";
import { ProgressBar, ProgressRing, runProgressBar } from "metro-dreamland";
import { wsrvFormat, wsrvPicture } from "./WsrvPicture";

export type FeedView<T> =
	| { kind: "loading" }
	| { kind: "error"; message: string }
	| { kind: "empty" }
	| { kind: "loaded"; item: T };

export type FeedState<T> = Stateful<{ view: FeedView<T>; refreshing: boolean }>;

// Fetches the card's post on mount, every refreshMs while the tab's visible,
// and on the refresh button. Sets the card's cx.mount.
export function liveFeed<T>(
	card: FC,
	fetchItem: (signal: AbortSignal, cacheBust: boolean) => Promise<T | null>,
	refreshMs: number
) {
	const state: FeedState<T> = createState({
		view: { kind: "loading" } as FeedView<T>,
		refreshing: false,
	});

	let cancelled = false;
	let controller: AbortController | null = null;
	// Pointers whose listeners have to last as long as the card does.
	// Dreamland holds a listener weakly, by way of its pointer: one made in
	// mount() on a page that was hydrated belongs to nothing, and unless
	// something holds on to it, it's gone at the next garbage collection (a
	// few seconds in), and the listener with it, without a word.
	const held: unknown[] = [];

	// Fetching, or done: the refresh button goes by state.refreshing, and
	// so does the line of dots along the card's top edge, if there's
	// something showing already (a first load has the ring) and the fetch
	// goes on a while: runProgressBar. Told here and not by listening for
	// the state to change: see `held`, above.
	const fetching = (busy: boolean) => {
		state.refreshing = busy;
		runProgressBar(
			card.root?.querySelector<HTMLElement>(".livecard-progress"),
			busy && state.view.kind !== "loading"
		);
	};

	const load = async (cacheBust = false) => {
		if (import.meta.env.SSR) return;
		controller?.abort();
		const request = new AbortController();
		controller = request;
		fetching(true);
		try {
			const item = await fetchItem(request.signal, cacheBust);
			if (cancelled || controller !== request) return;
			state.view = item ? { kind: "loaded", item } : { kind: "empty" };
		} catch (e: unknown) {
			if (cancelled || controller !== request) return;
			if (e instanceof DOMException && e.name === "AbortError") return;
			state.view = {
				kind: "error",
				message: e instanceof Error ? e.message : "unknown_error",
			};
		} finally {
			if (!cancelled && controller === request) {
				controller = null;
				fetching(false);
			}
		}
	};

	const onRefresh = (e: MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		if (state.refreshing) return;
		// Restart the spin animation on every click — remove → reflow →
		// re-add so a second click within the 0.5s window kicks fresh
		// instead of being ignored as a no-op class toggle.
		const btn = e.currentTarget as HTMLElement;
		btn.classList.remove("spin");
		void btn.offsetWidth;
		btn.classList.add("spin");
		load(true);
	};

	let initialTimer = 0;
	const refreshWhenVisible = () => {
		if (
			document.visibilityState === "visible" &&
			card.root?.isConnected &&
			!state.refreshing
		) {
			load();
		}
	};

	card.cx.mount = () => {
		if (import.meta.env.SSR) return;
		cancelled = false;

		// Tag the card so the fade-in rules apply. Set imperatively because
		// JSX-side class binding (static or reactive) doesn't survive
		// dreamland's SSR hydration on this element.
		card.root?.classList.add("is-initial");

		load();
		const id = setInterval(() => {
			refreshWhenVisible();
		}, refreshMs);
		document.addEventListener("visibilitychange", refreshWhenVisible);

		// First transition out of "loading" arms a one-shot timer that
		// strips .is-initial — without it, every periodic or manual refresh
		// would replay the fade-in (since fresh DOM nodes restart CSS
		// animations). 1s is long enough for the slowest animation (the
		// 0.9s bleed) to finish before the gate disappears.
		let firstTransitionDone = false;
		// (its pointer goes in `held`: without that, a load slow enough to
		// have a garbage collection in it would leave .is-initial on for
		// good, and the content would come up afresh at every refresh)
		const view = use(state.view);
		held.push(view);
		view.listen((v) => {
			if (!firstTransitionDone && v.kind !== "loading") {
				firstTransitionDone = true;
				initialTimer = window.setTimeout(() => {
					if (!cancelled) card.root?.classList.remove("is-initial");
				}, 1000);
			}
		});

		return () => {
			cancelled = true;
			held.length = 0;
			controller?.abort();
			clearInterval(id);
			document.removeEventListener("visibilitychange", refreshWhenVisible);
			clearTimeout(initialTimer);
		};
	};

	return { state, onRefresh };
}

export function feedHeader<T>(opts: {
	icon: ComponentChild;
	platform: string;
	state: FeedState<T>;
	onRefresh: (e: MouseEvent) => void;
	followers: (item: T) => number | null;
	url: (item: T) => string | null;
	fallbackUrl: string;
}) {
	const { state } = opts;
	return (
		<p class="livecard-header">
			<span class="livecard-icon">{opts.icon}</span>
			<span class="livecard-platform">{opts.platform}</span>
			{use(state.view).map((v) =>
				v.kind === "loaded" ? (
					<span class="livecard-stat">
						{" "}
						• {(opts.followers(v.item) || 0).toLocaleString()} followers
					</span>
				) : null
			)}
			<button
				type="button"
				class="livecard-topbtn livecard-refresh"
				class:refreshing={use(state.refreshing)}
				title="refresh"
				aria-label="refresh"
				on:click={opts.onRefresh}
			>
				<span class="material-symbols">refresh</span>
			</button>
			<a
				href={use(state.view).map(
					(v) => (v.kind === "loaded" && opts.url(v.item)) || opts.fallbackUrl
				)}
				target="_blank"
				rel="me"
				class="livecard-topbtn"
			>
				<span class="material-symbols">open_in_new</span>
			</a>
			{/* (runs while the card's fetching: runProgressBar, in mount) */}
			<span class="livecard-progress">
				<ProgressBar label="refreshing" />
			</span>
		</p>
	);
}

// the card body for anything but a loaded post; null once there is one
export function feedStatus<T>(v: FeedView<T>) {
	if (v.kind === "loading")
		return (
			<p class="livecard-status">
				<ProgressRing size="medium" />
			</p>
		);
	if (v.kind === "error")
		return <p class="livecard-status">couldn't load ({v.message})</p>;
	if (v.kind === "empty") return <p class="livecard-status">no recent posts</p>;
	return null;
}

export function postAuthor(a: {
	url: string;
	avatar: string | null;
	avatarAlt: string;
	name: string;
	handle: string;
}) {
	return (
		<a class="feed-post-header" href={a.url} target="_blank" rel="me">
			{a.avatar
				? wsrvPicture(a.avatar, {
						class: "feed-post-avatar",
						alt: a.avatarAlt,
						loading: "lazy",
					})
				: null}
			<div class="feed-post-header-info">
				<p class="feed-post-header-name">{a.name}</p>
				<p class="feed-post-header-username">{a.handle}</p>
			</div>
		</a>
	);
}

/** A picture or a clip that came with a post. */
export interface PostShot {
	kind: "image" | "video" | "gifv";
	src: string;
	/** (a clip's still, shown until it plays) */
	poster?: string | null;
	alt?: string | null;
	width?: number | null;
	height?: number | null;
	/**
	 * A clip whose host won't give it to a page on some other site (X's: it
	 * goes by the Referer header, and answers 403). It's played in a frame
	 * of its own, which can ask without one: see framedClip.
	 */
	noReferrer?: boolean;
}

/** Which of a post's attachments are something to look at, four at most. */
export function shotsOf<T extends { type: string }>(attachments: T[]) {
	return attachments
		.filter((a) => ["image", "video", "gifv"].includes(a.type))
		.slice(0, 4);
}

// How wide the pictures are for their height, where the tile leaves that to
// them: one picture keeps its own shape (within reason: nothing taller than
// 4:5 or wider than 2:1), and more than one share a 16:9.
function shotsRatio(shots: PostShot[]) {
	const [only] = shots;
	if (shots.length > 1 || !only.width || !only.height) return 16 / 9;
	return Math.min(2, Math.max(0.8, only.width / only.height));
}

// A clip: a <video> that starts by itself, silent, and goes round and
// round (or, with reduced motion, waits on its still to be played).
function clipVideo(
	doc: Document,
	shot: PostShot,
	poster: string | undefined,
	still: boolean
) {
	const video = doc.createElement("video");
	// (the property: a <video> made by script isn't muted by being given the
	// attribute, and one that isn't either may not start by itself or starts
	// with its sound on)
	video.muted = true;
	video.playsInline = true;
	if (poster) video.poster = poster;
	if (still) video.preload = "none";
	else video.autoplay = video.loop = true;
	video.src = shot.src;
	return video;
}

// What's in the frame a clip is given when its host has to be asked
// without a referrer: room for the video, and that instruction. A <video>
// can't be told to leave the referrer off, only a document can, so the
// clip has a document of its own. It's still this site's (srcdoc), so the
// video in it is ours to play and pause from out here.
const CLIP_FRAME =
	'<!doctype html><meta name="referrer" content="no-referrer">' +
	"<style>html,body{height:100%;margin:0;overflow:hidden}" +
	"video{display:block;width:100%;height:100%;object-fit:cover}</style><body>";

function framedClip(
	make: (doc: Document) => HTMLVideoElement,
	ready: (video: HTMLVideoElement) => void
) {
	const frame = document.createElement("iframe");
	frame.className = "feed-media-frame";
	// (nothing to get to in it: the picture's link is what's there to press,
	// and the buttons are out here)
	frame.tabIndex = -1;
	frame.setAttribute("aria-hidden", "true");
	frame.srcdoc = CLIP_FRAME;
	// (again if it's ever moved in the page: a frame starts over when it is)
	frame.addEventListener("load", () => {
		const doc = frame.contentDocument;
		if (!doc?.body || doc.querySelector("video")) return;
		const video = make(doc);
		doc.body.append(video);
		ready(video);
	});
	return frame;
}

// A clip's own buttons, for its corner: play or pause, and its sound on or
// off. Rings, like an app bar's. Each shows what pressing it will do, and
// goes by what the clip is actually doing (it starts by itself, and stops
// when it's scrolled away or the tab's hidden, whatever was last pressed).
// `attach` gives them their clip, which a framed one isn't there to be
// until its frame is.
function clipButtons() {
	let video: HTMLVideoElement | null = null;
	const glyph = (name: string) =>
		(<span class="material-symbols">{name}</span>) as unknown as HTMLElement;
	const press = (act: (video: HTMLVideoElement) => void) => (e: MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		if (video) act(video);
	};
	const playGlyph = glyph("play_arrow");
	const soundGlyph = glyph("volume_off");
	const play = (
		<button
			type="button"
			class="feed-media-kind"
			aria-label="play"
			on:click={press((v) => {
				if (v.paused || v.ended) v.play().catch(() => {});
				else v.pause();
			})}
		>
			{playGlyph}
		</button>
	) as unknown as HTMLElement;
	const sound = (
		<button
			type="button"
			class="feed-media-kind"
			aria-label="sound on"
			on:click={press((v) => {
				v.muted = !v.muted;
			})}
		>
			{soundGlyph}
		</button>
	) as unknown as HTMLElement;
	const sync = () => {
		if (!video) return;
		const going = !video.paused && !video.ended;
		playGlyph.textContent = going ? "pause" : "play_arrow";
		play.setAttribute("aria-label", going ? "pause" : "play");
		soundGlyph.textContent = video.muted ? "volume_off" : "volume_up";
		sound.setAttribute("aria-label", video.muted ? "sound on" : "sound off");
	};
	return {
		el: (
			<span class="feed-media-controls">
				{play}
				{sound}
			</span>
		),
		attach(clip: HTMLVideoElement) {
			video = clip;
			for (const type of ["play", "playing", "pause", "ended", "volumechange"])
				clip.addEventListener(type, sync);
			sync();
		},
	};
}

// The post's pictures, as a picture tile has them: edge to edge and as they
// are, nothing over them and nothing done to them. Two to four are a mosaic
// (side by side; one tall and two; two by two). A clip plays on its own,
// silent and round and round, as a live tile's would, with its own buttons
// in the corner. Each picture is a link to `href` (the post, which is where
// it has a full size); what's laid over one is beside that link, never in
// it, so pressing a button is only ever pressing the button. Where the post
// is marked sensitive they're blurred past recognising until asked for.
// Null if there aren't any; the card lays it out (.feed-media, in
// style.css), over the post or under it.
export function postMedia(
	shots: PostShot[],
	opts: { href: string | null; sensitive?: boolean }
) {
	if (!shots.length) return null;
	// (the cards only ever render a post in the browser, once it's fetched)
	const still =
		typeof matchMedia === "function" &&
		matchMedia("(prefers-reduced-motion: reduce)").matches;
	const show = (e: MouseEvent) => {
		const veil = e.currentTarget as HTMLElement;
		veil.parentElement?.removeAttribute("data-veiled");
		veil.remove();
	};
	const cell = (shot: PostShot) => {
		const clip = shot.kind !== "image";
		const poster = shot.poster ? wsrvFormat(shot.poster, "jpg") : undefined;
		// (a GIF has no buttons: it says what it is, and is all link)
		const buttons = shot.kind === "video" ? clipButtons() : null;
		let what: unknown;
		if (!clip) {
			what = wsrvPicture(shot.src, { alt: shot.alt || "", loading: "lazy" });
		} else if (shot.noReferrer) {
			what = framedClip(
				(doc) => clipVideo(doc, shot, poster, still),
				(video) => buttons?.attach(video)
			);
		} else {
			const video = clipVideo(document, shot, poster, still);
			buttons?.attach(video);
			what = video;
		}
		// (a picture with a description is named by it; anything else needs
		// telling what it is)
		const label =
			shot.kind === "image" && shot.alt
				? undefined
				: clip
					? shot.alt || "a clip in the post"
					: "a picture in the post";
		return (
			<div class="feed-media-cell">
				{opts.href ? (
					<a
						class="feed-media-link"
						href={opts.href}
						target="_blank"
						rel="noopener"
						aria-label={label}
					>
						{what}
					</a>
				) : (
					what
				)}
				{shot.kind === "gifv" ? (
					<span class="feed-media-kind is-gif">GIF</span>
				) : null}
				{buttons?.el}
			</div>
		);
	};
	return (
		<div
			class="feed-media"
			data-n={`${shots.length}`}
			data-veiled={opts.sensitive ? "" : undefined}
			style={`--ar: ${shotsRatio(shots).toFixed(4)}`}
		>
			{shots.map(cell)}
			{opts.sensitive ? (
				<button type="button" class="feed-media-veil" on:click={show}>
					<span class="material-symbols">visibility</span>
					<span>sensitive</span>
					<span class="feed-media-veil-show">show</span>
				</button>
			) : null}
		</div>
	);
}

// The post text's container, for the card to fill. Built imperatively per
// render so content set on it (innerHTML) survives state.view → state.view
// transitions, which replace the reactive subtree. `size` (rem, from
// displaySize) switches on the big-type treatment for short posts, and is
// the biggest its type gets: how big it is in the end is whatever lets all
// of it be read in the room there is (fitPost), which it works out once it's
// on the page and again whenever its tile changes size.
export function postContent(size: number | null) {
	const div = document.createElement("div");
	div.className = "feed-post-content" + (size ? " is-short" : "");
	if (size) {
		div.dataset.short = "";
		div.style.setProperty("--post-size", size + "rem");
	}
	if (typeof ResizeObserver !== "undefined") {
		let card: Element | null = null;
		const watch = new ResizeObserver(() => {
			if (!div.isConnected) {
				// (gone with the render it was made for)
				if (card) watch.disconnect();
				return;
			}
			if (!card) {
				// from here on it's the tile that's watched, whose size is
				// nothing to do with the type's (its own changes with every
				// fit, which would be a loop)
				card = div.closest(".tile, .livecard") ?? div.parentElement;
				watch.unobserve(div);
				if (card) watch.observe(card);
				void document.fonts?.ready.then(() => fitPost(div));
			}
			fitPost(div);
		});
		watch.observe(div);
	}
	return div;
}

// The smallest a post's type goes, in rem: the headline type of a short
// post, and plain text.
const HEADLINE_MIN = 1;
const TEXT_MIN = 0.75;

// Size a post's text to its room. From the top: the size its stylesheet
// gives it, if all of it fits at that; then smaller, the biggest that does;
// a headline that doesn't fit even at its smallest becomes plain text, and
// goes through the same again; and only a post that's too long for the
// smallest plain text is cut short, at the last line there's room for.
// ("Fits": its box, .feed-post-body, has no more in it than it can show.
// That box is as tall as the tile leaves it, or under pictures as tall as a
// caption may be, so the one test does for both.)
export function fitPost(content: HTMLElement) {
	const body = content.parentElement;
	if (!body || !content.isConnected) return;
	const rem =
		parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
	// (a line's own ink counts as a pixel or two more than its box, more
	// the bigger the type: that's not something that doesn't fit)
	const over = () =>
		body.scrollHeight - body.clientHeight >
		Math.max(2, parseFloat(getComputedStyle(content).fontSize) * 0.15);
	const plain = (headline: boolean) => {
		content.classList.toggle("is-short", headline);
		content.classList.remove("is-cut");
		content.style.removeProperty("font-size");
		content.style.removeProperty("--lines");
	};
	// the biggest size from `min` rem up to the stylesheet's at which it fits
	const shrink = (min: number) => {
		let hi = parseFloat(getComputedStyle(content).fontSize);
		let lo = min * rem;
		if (!(lo < hi)) return false;
		content.style.fontSize = lo + "px";
		if (over()) return false;
		for (let i = 0; i < 7 && hi - lo > 0.4; i++) {
			const mid = (lo + hi) / 2;
			content.style.fontSize = mid + "px";
			if (over()) hi = mid;
			else lo = mid;
		}
		content.style.fontSize = Math.floor(lo * 4) / 4 + "px";
		return true;
	};
	// A headline fills its lines: where the last of them would be a few
	// words with the rest of the line empty, the type's set a little
	// smaller (a fifth at most) if that takes it up into the lines above.
	const lineCount = () =>
		Math.round(
			content.getBoundingClientRect().height /
				(parseFloat(getComputedStyle(content).lineHeight) || 1)
		);
	const lastLine = () => {
		const range = document.createRange();
		range.selectNodeContents(content);
		const rects = Array.from(range.getClientRects());
		const bottom = Math.max(...rects.map((r) => r.bottom));
		const last = rects.filter((r) => bottom - r.bottom < r.height / 2);
		return (
			(Math.max(...last.map((r) => r.right)) -
				Math.min(...last.map((r) => r.left))) /
			(content.clientWidth || 1)
		);
	};
	const tidy = () => {
		if (content.children.length > 1) return;
		const was = content.style.fontSize;
		const size = parseFloat(getComputedStyle(content).fontSize);
		const lines = lineCount();
		if (lines < 2 || !(lastLine() < 0.6)) return;
		let lo = Math.max(HEADLINE_MIN * rem, size * 0.8);
		let hi = size;
		content.style.fontSize = lo + "px";
		if (lineCount() >= lines) {
			content.style.fontSize = was;
			return;
		}
		for (let i = 0; i < 7 && hi - lo > 0.4; i++) {
			const mid = (lo + hi) / 2;
			content.style.fontSize = mid + "px";
			if (lineCount() >= lines) hi = mid;
			else lo = mid;
		}
		content.style.fontSize = Math.floor(lo * 4) / 4 + "px";
	};
	const headline = "short" in content.dataset;
	plain(headline);
	if (!over()) return headline ? tidy() : undefined;
	if (headline) {
		if (shrink(HEADLINE_MIN)) return tidy();
		plain(false);
		if (!over()) return;
	}
	if (shrink(TEXT_MIN)) return;
	// too long whatever's done: as many lines of the smallest as there's
	// room for, and "…"
	content.style.fontSize = TEXT_MIN * rem + "px";
	const line =
		parseFloat(getComputedStyle(content).lineHeight) || TEXT_MIN * rem * 1.4;
	let lines = Math.max(1, Math.round(content.scrollHeight / line));
	content.classList.add("is-cut");
	content.style.setProperty("--lines", String(lines));
	while (lines > 1 && over())
		content.style.setProperty("--lines", String(--lines));
}

export function postCount(title: string, icon: string, value: ComponentChild) {
	return (
		<span title={title}>
			<span class="material-symbols">{icon}</span>
			{value}
		</span>
	);
}

// the counts row; the post's age goes on the end
export function postCounts(createdAt: string, counts: ComponentChild) {
	const longForm = ago(createdAt);
	return (
		<p class="feed-post-counts">
			{counts}
			<time
				class="feed-post-when"
				datetime={createdAt}
				title={longForm}
				aria-label={longForm}
			>
				{compactAgo(Date.now() - new Date(createdAt).getTime())}
			</time>
		</p>
	);
}
