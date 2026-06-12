import { FC, createState, css, Stateful } from "dreamland/core";
import humanizeDuration from "humanize-duration";
import { getMastodon, MastodonStatus } from "../lib/siteapi";
import { MastodonIcon } from "./SocialIcons";

type View =
	| { kind: "loading" }
	| { kind: "error"; message: string }
	| { kind: "empty" }
	| { kind: "loaded"; status: MastodonStatus };

const REFRESH_MS = 5 * 60_000;

// Compact "X ago" formatter (mastodon-style: "5s", "41m", "3h", "2d", "4w",
// "1y"). Tooltips/aria-label still get the long humanized form for clarity.
function compactAgo(ms: number): string {
	const s = Math.max(0, Math.round(ms / 1000));
	if (s < 60) return `${s}s`;
	const m = Math.round(s / 60);
	if (m < 60) return `${m}m`;
	const h = Math.round(m / 60);
	if (h < 24) return `${h}h`;
	const d = Math.round(h / 24);
	if (d < 7) return `${d}d`;
	const w = Math.round(d / 7);
	if (w < 52) return `${w}w`;
	const y = Math.round(d / 365);
	return `${y}y`;
}

function MastodonCard(this: FC) {
	const state: Stateful<{ view: View; refreshing: boolean }> = createState({
		view: { kind: "loading" } as View,
		refreshing: false,
	});

	let cancelled = false;
	let controller: AbortController | null = null;

	const load = async (cacheBust = false) => {
		if (import.meta.env.SSR) return;
		controller?.abort();
		controller = new AbortController();
		state.refreshing = true;
		try {
			const data = await getMastodon(controller.signal, cacheBust);
			if (cancelled) return;
			state.view = data.status
				? { kind: "loaded", status: data.status }
				: { kind: "empty" };
		} catch (e: unknown) {
			if (cancelled) return;
			if (e instanceof DOMException && e.name === "AbortError") return;
			state.view = {
				kind: "error",
				message: e instanceof Error ? e.message : "unknown_error",
			};
		} finally {
			if (!cancelled) state.refreshing = false;
		}
	};

	const onRefresh = (e: MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		if (state.refreshing) return;
		load(true);
	};

	this.cx.mount = () => {
		if (import.meta.env.SSR) return;
		cancelled = false;
		load();
		const id = setInterval(() => load(), REFRESH_MS);
		return () => {
			cancelled = true;
			controller?.abort();
			clearInterval(id);
		};
	};

	// Build a div whose innerHTML is the upstream Mastodon status content (raw
	// HTML). Trusted: it comes from the user's own mastodon instance, proxied
	// through their own worker. Built imperatively per-render so the content
	// survives state.view → state.view transitions (re-renders replace the
	// reactive subtree, which would otherwise wipe an externally-set
	// innerHTML).
	const renderContent = (html: string, isShort: boolean) => {
		const div = document.createElement("div");
		div.className = "fedi-post-content" + (isShort ? " is-short" : "");
		div.innerHTML = html;
		return div;
	};

	const fallbackUrl = "https://wetdry.world/@fish";

	return (
		<div class="livecard mastodon-card background-container">
			<p class="livecard-header">
				<span class="livecard-icon">
					<MastodonIcon />
				</span>
				<span class="livecard-platform">fediverse</span>
				{use(state.view).map((v) =>
					v.kind === "loaded" ? (
						<span class="livecard-stat">
							{" "}
							• {(v.status.account.followersCount || 0).toLocaleString()}{" "}
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
						v.kind === "loaded" && v.status.url ? v.status.url : fallbackUrl
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

				const s = v.status;
				const att = s.attachments[0];
				const elapsed = Date.now() - new Date(s.createdAt).getTime();
				const longForm =
					humanizeDuration(elapsed, { largest: 1, round: true }) + " ago";
				// twitter-style: short posts get the big-font display treatment,
				// regardless of whether they have an attachment. (with a bleed bg,
				// the chunky text reads as a poster overlay.) strip tags to get a
				// rough plain-length (mastodon content is just <p>/<a>/<br>, so a
				// regex is fine here)
				const plainLength = s.content.replace(/<[^>]+>/g, "").trim().length;
				const isShort = plainLength > 0 && plainLength <= 100;
				return (
					<>
						{att ? (
							<div
								class={"fedi-post-bleed fedi-post-bleed-" + att.type}
								aria-hidden="true"
							>
								{(function () {
									switch (att.type) {
										case "image":
											return (
												<img
													src={att.url}
													alt={att.description || ""}
													loading="lazy"
												/>
											);
										// videos render muted/looped as a moving bg; the
										// user opens the post URL to view with audio
										case "video":
										case "gifv":
											return (
												<video src={att.url} autoplay loop muted playsinline />
											);
										case "audio":
											return <audio src={att.url} controls />;
										default:
											return (
												<span class="fedi-post-bleed-fallback">
													<span class="material-symbols">attachment</span>
													{s.attachments.length}{" "}
													{s.attachments.length === 1
														? "attachment"
														: "attachments"}
												</span>
											);
									}
								})()}
							</div>
						) : null}
						<div class="post">
							<a
								class="fedi-post-header"
								href={s.account.url}
								target="_blank"
								rel="me"
							>
								<img
									src={s.account.avatar}
									class="fedi-post-avatar"
									alt={s.account.avatarDescription || ""}
									loading="lazy"
								/>
								<div class="fedi-post-header-info">
									<p class="fedi-post-header-name">{s.account.displayName}</p>
									<p class="fedi-post-header-username">
										@{s.account.acct}@wetdry.world
									</p>
								</div>
							</a>
							<div class="fedi-post-body">
								{s.spoilerText ? (
									<p class="fedi-post-spoiler">{s.spoilerText}</p>
								) : null}
								{renderContent(s.content, isShort)}
							</div>
							<p class="fedi-post-counts">
								<span title="replies">
									<span class="material-symbols">reply</span>
									{s.counts.replies}
								</span>
								<span title="boosts">
									<span class="material-symbols">repeat</span>
									{s.counts.reblogs}
								</span>
								<span title="favourites">
									<span class="material-symbols">star</span>
									{s.counts.favourites}
								</span>
								{s.attachments.length ? (
									<span>
										<span class="material-symbols">attachment</span>
										{s.attachments.length}{" "}
										{s.attachments.length === 1 ? "attachment" : "attachments"}
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
MastodonCard.style = css`
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
		font-size: clamp(1.15rem, 7.5cqi, 1.7rem);
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
	}

	.fedi-post-bleed > :is(img, video) {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
		filter: brightness(0.45) saturate(0.9) contrast(1.15);
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

export default MastodonCard;
