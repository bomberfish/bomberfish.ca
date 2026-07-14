import { FC, createState, css, Stateful } from "dreamland/core";
import humanizeDuration from "humanize-duration";
import { getLastfm, LastfmProfile, LastfmTrack } from "../lib/siteapi";
import { LastFmIcon } from "./SocialIcons";

type View =
	| { kind: "loading" }
	| { kind: "error"; message: string }
	| { kind: "empty" }
	| { kind: "loaded"; track: LastfmTrack; profile: LastfmProfile | null };

const REFRESH_MS = 60_000;

// Resolve a computed line-height value (which may be "normal", "Npx", or a
// unitless multiplier like "1.1") to a concrete pixel height for the element.
function lineHeightPx(cs: CSSStyleDeclaration): number {
	const fontSize = parseFloat(cs.fontSize);
	const raw = cs.lineHeight;
	if (raw === "normal") return fontSize * 1.2;
	if (raw.endsWith("px")) return parseFloat(raw);
	const n = parseFloat(raw);
	return Number.isFinite(n) ? n * fontSize : fontSize * 1.2;
}

// Floor for the JS font-size shrink — below this the title gets unreadable and
// we'd rather switch to the marquee than keep shrinking.
const TITLE_MIN_PX = 16;

// "3:42" / "1:02:33" style runtime from a millisecond duration.
function formatDuration(ms: number): string {
	const totalSec = Math.max(0, Math.round(ms / 1000));
	const h = Math.floor(totalSec / 3600);
	const m = Math.floor((totalSec % 3600) / 60);
	const s = totalSec % 60;
	const ss = String(s).padStart(2, "0");
	if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${ss}`;
	return `${m}:${ss}`;
}

// Compact "K/M/B" formatter for big counts (listeners, plays). Drops the
// decimal once the rounded value reaches 100 (e.g. "174K" not "174.5K") and
// strips trailing ".0" so we never render "1.0K".
function compactNumber(n: number): string {
	if (n < 1000) return n.toLocaleString();
	const fmt = (v: number, suffix: string) =>
		(v >= 100 ? `${Math.round(v)}` : v.toFixed(1).replace(/\.0$/, "")) + suffix;
	if (n < 1_000_000) return fmt(n / 1000, "K");
	if (n < 1_000_000_000) return fmt(n / 1_000_000, "M");
	return fmt(n / 1_000_000_000, "B");
}

function LastFmCard(this: FC) {
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
			const data = await getLastfm(request.signal, cacheBust);
			if (cancelled || controller !== request) return;
			state.view = data.track
				? { kind: "loaded", track: data.track, profile: data.profile }
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

	// Sizes the lastfm title to at most ~2 lines:
	//   1. Reset overrides, let the CSS clamp drive the natural size.
	//   2. If natural rendering exceeds 2 lines, shrink font-size proportionally
	//      (up to two passes — the first pass usually nails it, the second
	//      stabilises any line-break shifts caused by the new size).
	//   3. If the title still doesn't fit at the 1rem floor, enable marquee
	//      mode: single-line nowrap + a bouncing translateX animation whose
	//      distance and duration are computed from the actual overflow.
	const fitTitle = () => {
		if (!this.root) return;
		const title = this.root.querySelector<HTMLElement>(".lastfm-title");
		const inner = this.root.querySelector<HTMLElement>(".lastfm-title-inner");
		if (!title || !inner) return;

		// Wipe any prior overrides so we measure against the natural CSS size.
		title.classList.remove("is-marquee");
		title.style.removeProperty("font-size");
		title.style.removeProperty("--marquee-distance");
		title.style.removeProperty("--marquee-duration");

		const cs = getComputedStyle(title);
		const naturalSize = parseFloat(cs.fontSize);
		let lh = lineHeightPx(cs);
		let maxHeight = lh * 2 + 0.5;
		let height = title.offsetHeight;
		if (height <= maxHeight) return; // already fits in 1–2 lines

		// Proportional shrink. line-height is a unitless multiplier so it
		// scales with font-size and we have to re-read it after each change.
		let size = naturalSize;
		for (let i = 0; i < 2; i++) {
			const target = Math.max(TITLE_MIN_PX, size * (lh * 2) / height);
			if (Math.abs(target - size) < 0.5) break;
			size = target;
			title.style.fontSize = `${size}px`;
			const cs2 = getComputedStyle(title);
			lh = lineHeightPx(cs2);
			maxHeight = lh * 2 + 0.5;
			height = title.offsetHeight;
			if (height <= maxHeight) return; // fits now
			if (size <= TITLE_MIN_PX + 0.5) break; // hit the floor
		}

		// Still too tall even at the floor → marquee mode.
		title.style.fontSize = `${TITLE_MIN_PX}px`;
		title.classList.add("is-marquee");

		const overflow = inner.scrollWidth - title.clientWidth;
		if (overflow <= 0) {
			// Pathological: text actually fits on one line at the floor size.
			// No animation needed.
			title.classList.remove("is-marquee");
			return;
		}

		// Motion runs across 80% of the animation; the other 20% is split into
		// two end-pauses (see keyframes). Aim for ~40 px/s of perceived motion
		// and clamp the total duration to keep short/long titles both sane.
		const motionSec = overflow / 40;
		const totalSec = Math.min(22, Math.max(6, motionSec / 0.8));
		title.style.setProperty("--marquee-distance", `${overflow}px`);
		title.style.setProperty("--marquee-duration", `${totalSec}s`);
	};

	let rafId = 0;
	const scheduleFit = () => {
		if (typeof requestAnimationFrame === "undefined") return;
		cancelAnimationFrame(rafId);
		rafId = requestAnimationFrame(fitTitle);
	};

	let ro: ResizeObserver | null = null;
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

		// Tag the card so the fade-in rules apply. We do this imperatively
		// instead of in the JSX because dreamland's SSR hydration strips
		// any static or reactive class binding on this element. Removing
		// it after the initial reveal is enough to gate refreshes — fresh
		// DOM nodes inserted later won't match the rule.
		this.root?.classList.add("is-initial");

		load();
		const id = setInterval(() => {
			refreshWhenVisible();
		}, REFRESH_MS);
		document.addEventListener("visibilitychange", refreshWhenVisible);

		// Re-fit when the card's column width changes (responsive resize).
		if (typeof ResizeObserver !== "undefined") {
			ro = new ResizeObserver(scheduleFit);
			ro.observe(this.root);
		}

		// View changes (new track, refresh, error→ok) replace the title node
		// inside the reactive subtree, so re-run fit on the new node. Also
		// arms a one-shot timer on the first transition out of "loading"
		// that strips .is-initial — without it, every refresh would replay
		// the fade-in (since fresh DOM nodes restart CSS animations). 1s
		// is long enough for the slowest animation (the 0.9s bleed) to
		// finish before the gate disappears.
		let firstTransitionDone = false;
		use(state.view).listen((v) => {
			if (!firstTransitionDone && v.kind !== "loading") {
				firstTransitionDone = true;
				initialTimer = window.setTimeout(() => {
					if (!cancelled) this.root?.classList.remove("is-initial");
				}, 1000);
			}
			scheduleFit();
		});

		return () => {
			cancelled = true;
			controller?.abort();
			clearInterval(id);
			document.removeEventListener("visibilitychange", refreshWhenVisible);
			ro?.disconnect();
			cancelAnimationFrame(rafId);
			clearTimeout(initialTimer);
		};
	};

	const fallbackUrl = "https://www.last.fm/user/bmbrfsh";

	return (
		<div class="livecard lastfm-card background-container">
			<p class="livecard-header">
				<span class="livecard-icon"><LastFmIcon /></span>
				<span class="livecard-platform">last.fm</span>
				{use(state.view).map((v) =>
					v.kind === "loaded" ? (
						<>
							{v.profile?.totalScrobbles != null ? (
								<span class="livecard-stat">
									{" "}• {v.profile.totalScrobbles.toLocaleString()} total scrobbles
								</span>
							) : null}
							{v.track.nowPlaying ? (
								<span class="livecard-badge">now playing</span>
							) : null}
						</>
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
						v.kind === "loaded" && v.track.url ? v.track.url : fallbackUrl
					)}
					target="_blank"
					rel="me"
					class="livecard-topbtn"
				>
					<span class="material-symbols">open_in_new</span>
				</a>
			</p>

			{use(state.view).map((v) => {
				if (v.kind === "loading") return <p class="livecard-status">loading…</p>;
				if (v.kind === "error")
					return <p class="livecard-status">couldn't load ({v.message})</p>;
				if (v.kind === "empty")
					return <p class="livecard-status">no recent scrobbles</p>;

				const t = v.track;
				const hasStats =
					t.duration != null ||
					(t.userPlayCount != null && t.userPlayCount > 0) ||
					(t.listeners != null && t.listeners > 0) ||
					t.loved;
				return (
					<div class="lastfm-track">
						{t.image ? (
							<>
								<img class="lastfm-art-bleed" src={t.image} alt="" loading="lazy" />
								<img class="lastfm-art" src={t.image} alt="" loading="lazy" />
							</>
						) : null}
						<div class="lastfm-meta">
							<a class="lastfm-title-link" href={t.url}>
								<h3 class="lastfm-title">
									<span class="lastfm-title-inner">{t.name}</span>
								</h3>
							</a>
							<p class="lastfm-artist">
								{t.artistUrl ? (
									<a href={t.artistUrl}>{t.artist}</a>
								) : t.artist}
								{t.album ? (
									<span class="lastfm-album">
										{" – "}
										{t.albumUrl ? (
											<a href={t.albumUrl}>{t.album}</a>
										) : t.album}
									</span>
								) : null}
							</p>
							{hasStats ? (
								<p class="lastfm-stats">
									{t.duration != null ? (
										<span class="lastfm-stat" title="duration">
											<span class="material-symbols">schedule</span>
											{formatDuration(t.duration)}
										</span>
									) : null}
									{t.userPlayCount != null && t.userPlayCount > 0 ? (
										<span
											class="lastfm-stat"
											title={
												t.userPlayCount === 1
													? "1 play by me"
													: `${t.userPlayCount.toLocaleString()} plays by me`
											}
										>
											<span class="material-symbols">play_arrow</span>
											{t.userPlayCount.toLocaleString()}
										</span>
									) : null}
									{t.listeners != null && t.listeners > 0 ? (
										<span
											class="lastfm-stat"
											title={`${t.listeners.toLocaleString()} listeners on last.fm`}
										>
											<span class="material-symbols">headphones</span>
											{compactNumber(t.listeners)}
										</span>
									) : null}
									{t.loved ? (
										<span
											class="lastfm-stat lastfm-stat-loved"
											title="loved"
											aria-label="loved track"
										>
											<span class="material-symbols">favorite</span>
										</span>
									) : null}
								</p>
							) : null}
							{!t.nowPlaying && t.playedAt ? (
								<p class="lastfm-when">
									{humanizeDuration(
										Date.now() - new Date(t.playedAt).getTime(),
										{ largest: 1, round: true }
									)}{" "}
									ago
								</p>
							) : null}
						</div>
					</div>
				);
			})}
		</div>
	);
}

// Shared .livecard / .livecard-* styles live in src/style.css so they apply
// here without re-declaration. Only lastfm-track-specific styles below.
LastFmCard.style = css`
	:scope {
		overflow: hidden;
		contain: paint layout;
		display: flex;
		flex-direction: column;
	}

	.lastfm-track {
		display: flex;
		gap: 1rem;
		align-items: center;
		margin-block: auto;
	}

	.lastfm-meta {
		min-width: 0;
		/* must be explicit: container-type: inline-size adds size containment,
		   which hides children from the flex sizing algo, so without flex: 1
		   the column collapses to 0 width */
		flex: 1 1 0;
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		/* establish a containment context so children can size against the
		   actual meta column width (~55% of the card) instead of the viewport */
		container-type: inline-size;
	}

	/* applies to the <h1> title too, not just <p>, so long words break */
	.lastfm-meta :is(p, h1) {
		margin: 0;
		overflow-wrap: anywhere;
	}

	/* title/artist/album are three independent links: inherit the visual
	   styles set on the surrounding text rather than the global link color,
	   and only show the underline/accent affordance on hover */
	.lastfm-meta a {
		color: inherit;
		text-decoration: none;
		transition: color 0.2s ease, text-decoration-color 0.2s ease;
	}

	.lastfm-meta a:hover,
	.lastfm-meta a:focus-visible {
		color: var(--supertext);
		text-decoration: underline;
		text-decoration-color: var(--supertext);
		text-decoration-thickness: 2px;
	}

	/* the title's <a> wraps a heading so it needs to be block to wrap properly
	   and not eat extra space */
	.lastfm-title-link {
		display: block;
	}

	.lastfm-art {
		width: 40%;
		height: auto;
		aspect-ratio: 1;
		object-fit: cover;
		flex-shrink: 0;
		border: 1px solid var(--surface2);
	}

	.lastfm-art-bleed {
		height: 100%;
		position: absolute;
		left: 0;
		top: 0;
		z-index: -1;
		transform: translateX(-28%) translateY(-2%) scale(2);
		transform-origin: left center;
		filter: brightness(0.75) contrast(1.1) saturate(1.3) blur(0.8px);
		mask-image: linear-gradient(105deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.15) 40%, transparent 72%);
	}

	.lastfm-title {
		color: var(--supertext);
		margin-block: 0;
		/* fluid baseline driven by the meta column width. JS may override
		   font-size inline if the natural value wraps to >2 lines. */
		font-size: clamp(1.25rem, 13cqi, 2.25rem);
		line-height: 1.1;
		font-variation-settings: "ELSH" 85;
	}

	/* When a title still doesn't fit two lines even at the floor font size,
	   the component switches to single-line marquee mode. The mask fades the
	   text at the clip edges so it doesn't pop in/out abruptly. */
	.lastfm-title.is-marquee {
		white-space: nowrap;
		overflow: hidden;
		hyphens: none;
		text-wrap: nowrap;
		-webkit-mask-image: linear-gradient(
			90deg,
			transparent 0,
			#000 0.75rem,
			#000 calc(100% - 0.75rem),
			transparent 100%
		);
		mask-image: linear-gradient(
			90deg,
			transparent 0,
			#000 0.75rem,
			#000 calc(100% - 0.75rem),
			transparent 100%
		);
	}

	.lastfm-title.is-marquee .lastfm-title-inner {
		display: inline-block;
		animation: lastfm-title-marquee var(--marquee-duration, 10s) ease-in-out
			infinite alternate;
		will-change: transform;
	}

	/* Pause while the user is reading / interacting. */
	.lastfm-title.is-marquee:hover .lastfm-title-inner,
	.lastfm-title.is-marquee:focus-within .lastfm-title-inner {
		animation-play-state: paused;
	}

	/* alternate + the 10% pauses on each end give a smooth bounce that lingers
	   long enough on each side to actually read the start/end of the title. */
	@keyframes lastfm-title-marquee {
		0%, 10% {
			transform: translateX(0);
		}
		90%, 100% {
			transform: translateX(calc(-1 * var(--marquee-distance, 0px)));
		}
	}

	/* The global prefers-reduced-motion rule kills the animation; fall back to
	   plain ellipsis so the title is still readable as truncation. */
	@media (prefers-reduced-motion: reduce) {
		.lastfm-title.is-marquee {
			text-overflow: ellipsis;
		}
	}

	.lastfm-artist {
		color: var(--text);
		font-size: clamp(1rem, 6cqi, 1.3rem);
		line-height: 1.25;
	}
	.lastfm-album {
		color: var(--text1);
		font-size: clamp(0.9rem, 5.2cqi, 1.15rem);
	}
	.lastfm-when {
		color: var(--subtext2);
		margin-top: 0.2rem !important;
		font-size: 0.85rem;
	}

	/* Footer stats row — lives at the bottom of the meta column so it fills the
	   leftover space beneath title/artist/when. margin-top: auto pushes it down
	   regardless of how short the metadata block above ends up. */
	.lastfm-stats {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.3rem 0.55rem;
		margin: 0;
		margin-top: auto !important;
		padding-top: 0.4rem;
		color: var(--subtext2);
		font-size: 0.8rem;
		line-height: 1.4;
		/* numbers feel more "stat-like" when monowidth */
		font-variant-numeric: tabular-nums;
	}

	.lastfm-stat {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		white-space: nowrap;
	}

	/* "/" separator between consecutive stats. Sibling-only selector means
	   conditionally-hidden stats don't leave dangling slashes. */
	.lastfm-stat + .lastfm-stat::before {
		content: "/";
		color: var(--subtext1);
		margin-right: 0.3rem;
	}

	.lastfm-stats .material-symbols {
		font-size: 1rem;
		color: var(--subtext1);
	}

	/* Loved indicator: filled heart, warm rose-red that reads on both light and
	   dark themes (FILL axis works on the variable Material Symbols font). */
	.lastfm-stat-loved {
		color: hsl(354, 70%, 64%);
	}

	.lastfm-stat-loved .material-symbols {
		color: inherit;
		font-variation-settings: "FILL" 1;
	}
`;

export default LastFmCard;
