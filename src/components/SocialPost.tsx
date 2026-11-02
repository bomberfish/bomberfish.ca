// Shared pieces of the social post cards (MastodonCard, TwitterCard): the
// fetch/refresh loop, the card header and the post's author, body and
// counts. Plain functions rather than components, so the cards render the
// exact same DOM (and hydrate the same) as when this was inlined in each.
// Their styles are the "Social post cards" section of src/style.css.

import { ComponentChild, createState, FC, Stateful } from "dreamland/core";
import humanizeDuration from "humanize-duration";
import { compactAgo } from "../lib/ago";
import { wsrvPicture } from "./WsrvPicture";

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

	const load = async (cacheBust = false) => {
		if (import.meta.env.SSR) return;
		controller?.abort();
		const request = new AbortController();
		controller = request;
		state.refreshing = true;
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
				state.refreshing = false;
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
		use(state.view).listen((v) => {
			if (!firstTransitionDone && v.kind !== "loading") {
				firstTransitionDone = true;
				initialTimer = window.setTimeout(() => {
					if (!cancelled) card.root?.classList.remove("is-initial");
				}, 1000);
			}
		});

		return () => {
			cancelled = true;
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
		</p>
	);
}

// the card body for anything but a loaded post; null once there is one
export function feedStatus<T>(v: FeedView<T>) {
	if (v.kind === "loading") return <p class="livecard-status">loading…</p>;
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
		<a class="social-post-header" href={a.url} target="_blank" rel="me">
			{a.avatar
				? wsrvPicture(a.avatar, {
						class: "social-post-avatar",
						alt: a.avatarAlt,
						loading: "lazy",
					})
				: null}
			<div class="social-post-header-info">
				<p class="social-post-header-name">{a.name}</p>
				<p class="social-post-header-username">{a.handle}</p>
			</div>
		</a>
	);
}

// The post text's container, for the card to fill. Built imperatively per
// render so content set on it (innerHTML) survives state.view → state.view
// transitions, which replace the reactive subtree. `size` (rem, from
// displaySize) switches on the big-type treatment for short posts.
export function postContent(size: number | null) {
	const div = document.createElement("div");
	div.className = "social-post-content" + (size ? " is-short" : "");
	if (size) div.style.setProperty("--post-size", size + "rem");
	return div;
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
	const elapsed = Date.now() - new Date(createdAt).getTime();
	const longForm =
		humanizeDuration(elapsed, { largest: 1, round: true }) + " ago";
	return (
		<p class="social-post-counts">
			{counts}
			<time
				class="social-post-when"
				datetime={createdAt}
				title={longForm}
				aria-label={longForm}
			>
				{compactAgo(elapsed)}
			</time>
		</p>
	);
}
