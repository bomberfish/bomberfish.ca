import { FC, createState, css, Stateful } from "dreamland/core";
import humanizeDuration from "humanize-duration";
import { compactAgo } from "../lib/ago";
import { getTwitter, Tweet } from "../lib/siteapi";
import { displaySize, visibleLength } from "../lib/postText";
import { XIcon } from "./SocialIcons";

type View =
	| { kind: "loading" }
	| { kind: "error"; message: string }
	| { kind: "empty" }
	| { kind: "loaded"; tweet: Tweet };

const REFRESH_MS = 5 * 60_000;

function compactNum(n: number): string {
	return n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? (n / 1e3).toFixed(1) + "k" : String(n);
}

function TwitterCard(this: FC) {
	const state: Stateful<{ view: View; refreshing: boolean }> = createState({
		view: { kind: "loading" } as View,
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
			const data = await getTwitter(request.signal, cacheBust);
			if (cancelled || controller !== request) return;
			state.view = data.tweet
				? { kind: "loaded", tweet: data.tweet }
				: { kind: "empty" };
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
			this.root?.isConnected &&
			!state.refreshing
		) {
			load();
		}
	};

	this.cx.mount = () => {
		if (import.meta.env.SSR) return;
		cancelled = false;

		// Tag the card so the fade-in rules apply. Set imperatively because
		// JSX-side class binding (static or reactive) doesn't survive
		// dreamland's SSR hydration on this element.
		this.root?.classList.add("is-initial");

		load();
		const id = setInterval(() => {
			refreshWhenVisible();
		}, REFRESH_MS);
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
					if (!cancelled) this.root?.classList.remove("is-initial");
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

	const fallbackUrl = "https://x.com/bomberfish77";

	return (
		<div class="livecard twitter-card background-container">
			<p class="livecard-header">
				<span class="livecard-icon">
					<XIcon />
				</span>
				<span class="livecard-platform">X</span>
				{use(state.view).map((v) =>
					v.kind === "loaded" ? (
						<span class="livecard-stat">
							{" "}
							• {(v.tweet.account.followersCount || 0).toLocaleString()}{" "}
							followers
						</span>
					) : null
				)}
				<button
					type="button"
					class="livecard-topbtn livecard-refresh"
					class:refreshing={use(state.refreshing)}
					title="refresh"
					aria-label="refresh"
					on:click={onRefresh}
				>
					<span class="material-symbols">refresh</span>
				</button>
				<a
					href={use(state.view).map((v) =>
						v.kind === "loaded" && v.tweet.url ? v.tweet.url : fallbackUrl
					)}
					target="_blank"
					rel="me"
					class="livecard-topbtn"
				>
					<span class="material-symbols">open_in_new</span>
				</a>
			</p>

			{use(state.view).map((v) => {
				if (v.kind === "loading")
					return <p class="livecard-status">loading…</p>;
				if (v.kind === "error")
					return <p class="livecard-status">couldn't load ({v.message})</p>;
				if (v.kind === "empty")
					return <p class="livecard-status">no recent posts</p>;

				const s = v.tweet;
				const att = s.attachments[0];
				const elapsed = Date.now() - new Date(s.createdAt).getTime();
				const longForm =
					humanizeDuration(elapsed, { largest: 1, round: true }) + " ago";
				// posts with a link card / quote are secondary content, keep text normal
				const size =
					s.card || s.quote ? null : displaySize(visibleLength(s.text));
				const img = att ?? null;
				const bleedSrc = img ? img.previewUrl || img.url : s.card?.image;
				const renderText = (text: string) => {
					const div = document.createElement("div");
					div.className = "fedi-post-content" + (size ? " is-short" : "");
					if (size) div.style.setProperty("--post-size", size + "rem");
					const re = /(https?:\/\/[^\s]+)/g;
					for (const p of text.split(/\n{2,}/)) {
						const para = document.createElement("p");
						p.split(re).forEach((part, i) => {
							if (i % 2) {
								const a = document.createElement("a");
								a.href = part;
								a.target = "_blank";
								a.rel = "noopener";
								a.textContent = part.replace(/^https?:\/\/(www\.)?/, "");
								para.append(a);
							} else {
								const lines = part.split("\n");
								lines.forEach((l, j) => {
									if (j) para.append(document.createElement("br"));
									para.append(l);
								});
							}
						});
						div.append(para);
					}
					return div;
				};
				return (
					<>
						{bleedSrc ? (
							<div
								class={"fedi-post-bleed fedi-post-bleed-" + (att?.type ?? "image")}
								aria-hidden="true"
							>
								{att && (att.type === "video" || att.type === "gifv") ? (
									<video
										src={att.url}
										poster={att.previewUrl || undefined}
										autoplay
										loop
										muted
										playsinline
									/>
								) : (
									<img src={bleedSrc} alt="" loading="lazy" />
								)}
							</div>
						) : null}
						<div class="post">
							<a
								class="fedi-post-header"
								href={s.account.url}
								target="_blank"
								rel="me"
							>
								{s.account.avatar ? (
									<img
										src={s.account.avatar}
										class="fedi-post-avatar"
										alt=""
										loading="lazy"
									/>
								) : null}
								<div class="fedi-post-header-info">
									<p class="fedi-post-header-name">{s.account.displayName}</p>
									<p class="fedi-post-header-username">
										@{s.account.screenName}
									</p>
								</div>
							</a>
							<div class="fedi-post-body">
								{renderText(s.text)}
								{s.card ? (
									<a
										class="tweet-linkcard"
										href={s.card.url}
										target="_blank"
										rel="noopener"
									>
										<span class="tweet-linkcard-domain">{s.card.domain}</span>
										<span class="tweet-linkcard-title">{s.card.title}</span>
										{s.card.description ? (
											<span class="tweet-linkcard-desc">
												{s.card.description}
											</span>
										) : null}
									</a>
								) : null}
								{s.quote ? (
									<a
										class="tweet-quote"
										href={s.quote.url}
										target="_blank"
										rel="noopener"
									>
										<span class="tweet-quote-author">
											{s.quote.account.displayName}{" "}
											<span class="tweet-quote-handle">
												@{s.quote.account.screenName}
											</span>
										</span>
										<span class="tweet-quote-text">{s.quote.text}</span>
									</a>
								) : null}
							</div>
							<p class="fedi-post-counts">
								<span title="replies">
									<span class="material-symbols">reply</span>
									{s.counts.replies}
								</span>
								<span title="reposts">
									<span class="material-symbols">repeat</span>
									{s.counts.retweets}
								</span>
								<span title="likes">
									<span class="material-symbols">favorite</span>
									{s.counts.likes}
								</span>
								{s.counts.views != null ? (
									<span title="views">
										<span class="material-symbols">visibility</span>
										{compactNum(s.counts.views)}
									</span>
								) : null}
								<time
									class="fedi-post-when"
									datetime={s.createdAt}
									title={longForm}
									aria-label={longForm}
								>
									{compactAgo(elapsed)}
								</time>
							</p>
						</div>
					</>
				);
			})}
		</div>
	);
}

// Shared .livecard / .livecard-* styles live in src/style.css so they apply
// here without re-declaration. Only mastodon-fedi-post-specific styles below.
TwitterCard.style = css`
	:scope {
		display: flex;
		flex-direction: column;
		position: relative;
		overflow: hidden;
	}

	.post {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		flex: 1;
		min-width: 0;
		/* container for cqi-based fluid type sizing in .is-short.
		   position: relative so the post sits above the .fedi-post-bleed
		   (which is at z-index: -1 in the card's stacking context). */
		container-type: inline-size;
		position: relative;
	}

	.fedi-post-header {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		min-width: 0;
		text-decoration: none !important;
		color: inherit;
	}

	.fedi-post-header::after {
		display: none !important;
	}

	.fedi-post-avatar {
		width: 2.5rem;
		height: 2.5rem;
		flex-shrink: 0;
		object-fit: cover;
		border: 1px solid var(--surface2);
		background: var(--surface2);
	}

	.fedi-post-header-info {
		display: flex;
		flex-direction: column;
		min-width: 0;
		line-height: 1.2;
	}

	.fedi-post-header-name {
		margin: 0;
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--text);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.fedi-post-header-username {
		margin: 0;
		font-size: 0.78rem;
		color: var(--subtext1);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.fedi-post-when {
		margin-left: auto;
		flex-shrink: 0;
		color: var(--subtext2);
		letter-spacing: 0.05em;
	}

	.fedi-post-body {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		flex: 1;
		min-width: 0;
	}

	.fedi-post-spoiler {
		margin: 0;
		font-style: italic;
		color: var(--subtext0);
		font-size: 0.85rem;
		padding: 0.35rem 0.5rem;
		border-left: 2px solid var(--surface2);
		background: hsla(var(--surface0-hsl), 0.4);
	}

	.fedi-post-content {
		color: var(--text1);
		font-size: 0.9rem;
		line-height: 1.45;
		overflow-wrap: anywhere;
	}

	/* twitter-style: short, text-only posts get the big-font display
	   treatment. fluid clamp scales with the card column, ELSH adds the
	   chunky stripe weight that h2 uses. */
	.fedi-post-content.is-short {
		color: var(--text);
		font-size: min(var(--post-size, 1.7rem), max(1.05rem, 7.5cqi));
		line-height: 1.25;
		font-variation-settings: "ELSH" 93;
		font-synthesis: weight;
		font-weight: 50;
		text-rendering: geometricPrecision;
		text-wrap: balance;
		hyphens: auto;
	}

	.fedi-post-content :global(p) {
		margin: 0 0 0.4rem 0;
	}

	.fedi-post-content.is-short :global(p) {
		margin: 0 0 0.5rem 0;
	}

	.fedi-post-content :global(p):last-child {
		margin-bottom: 0;
	}

	.fedi-post-content :global(a) {
		color: var(--accent);
	}

	/* Bleed: visual attachments (image/video/gifv) fill the card behind the
	   post, heavily darkened so the foreground text stays readable. inset is
	   negative so the bleed extends past .background-container's padding all
	   the way to the inside of the card border. */
	.fedi-post-bleed {
		position: absolute;
		inset: -0.7rem;
		z-index: -1;
		pointer-events: none;
		background: var(--crust);
		opacity: 0.67;
	}

	.fedi-post-bleed > :is(img, video) {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
		filter: brightness(0.85) saturate(0.8) contrast(1.2);

	}

	/* dark vignette over the image so edges fade to the card bg, helping
	   header/footer text contrast at any image brightness */
	.fedi-post-bleed::after {
		content: "";
		position: absolute;
		inset: 0;
		background:
			radial-gradient(
				ellipse at center,
				transparent 30%,
				hsla(var(--crust-hsl), 0.55) 100%
			),
			linear-gradient(
				to bottom,
				hsla(var(--crust-hsl), 0.5) 0%,
				transparent 25%,
				transparent 75%,
				hsla(var(--crust-hsl), 0.5) 100%
			);
		pointer-events: none;
	}

	/* audio + unknown have no good "bleed" representation. Render them inline
	   at the bottom of the card instead. */
	.fedi-post-bleed-audio,
	.fedi-post-bleed-unknown {
		position: static;
		inset: auto;
		z-index: auto;
		pointer-events: auto;
		background: none;
		margin-top: 0.5rem;
	}

	.fedi-post-bleed-audio::after,
	.fedi-post-bleed-unknown::after {
		display: none;
	}

	.fedi-post-bleed-audio audio {
		width: 100%;
	}

	.fedi-post-bleed-fallback {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.8rem;
		color: var(--subtext0);
	}

	.tweet-linkcard,
	.tweet-quote {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		padding: 0.5rem 0.65rem;
		border: 1px solid var(--surface2);
		background: hsla(var(--surface0-hsl), 0.5);
		color: inherit;
		text-decoration: none !important;
		font-size: 0.82rem;
		min-width: 0;
	}

	.tweet-linkcard::after,
	.tweet-quote::after {
		display: none !important;
	}

	.tweet-linkcard-domain,
	.tweet-quote-handle {
		color: var(--subtext1);
		font-size: 0.75rem;
	}

	.tweet-linkcard-title,
	.tweet-quote-author {
		font-weight: 600;
		color: var(--text);
	}

	.tweet-linkcard-desc,
	.tweet-quote-text {
		color: var(--subtext0);
		overflow-wrap: anywhere;
		display: -webkit-box;
		-webkit-line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.fedi-post-counts {
		display: flex;
		gap: 1rem;
		margin: 0;
		padding-top: 0.5rem;
		border-top: 1px solid var(--surface2);
		font-size: 0.8rem;
		color: var(--subtext2);
	}

	.fedi-post-counts span {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
	}

	.fedi-post-counts .material-symbols {
		font-size: 1rem;
	}
`;

export default TwitterCard;
