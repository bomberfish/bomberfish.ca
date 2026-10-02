import { FC, createState, css, Stateful } from "dreamland/core";
import { getGithub, GithubResponse } from "../lib/siteapi";
import { GitHubIcon } from "./SocialIcons";

type View =
	| { kind: "loading" }
	| { kind: "error"; message: string }
	| { kind: "empty" }
	| { kind: "loaded"; data: GithubResponse };

const REFRESH_MS = 5 * 60_000;

function GithubCard(this: FC) {
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
			const data = await getGithub(request.signal, cacheBust);
			if (cancelled || controller !== request) return;
			state.view = data.profile
				? { kind: "loaded", data }
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

	const fallbackUrl = "https://github.com/bomberfish";

	return (
		<div class="livecard github-card background-container">
			<p class="livecard-header">
				<span class="livecard-icon">
					<GitHubIcon />
				</span>
				<span class="livecard-platform">github</span>
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
						v.kind === "loaded" && v.data.profile.url ? v.data.profile.url : fallbackUrl
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

				const { profile: p, pinned, contributions: c } = v.data;
				const stat = (n: number, label: string, cls = "") => (
					<span class={"gh-stat " + cls}>
						<b>{n.toLocaleString()}</b>
						{label}
					</span>
				);
				return (
					<>
						<div class="gh-bleed" aria-hidden="true">
							<div class="gh-grid">
								{c.weeks.flat().map((d) => (
									<span
										class={"gh-day gh-l" + d.level}
										style={`grid-row:${new Date(d.date).getUTCDay() + 1}`}
									/>
								))}
							</div>
						</div>
						<div class="post">
						<div class="gh-top">
						<div class="gh-about">
						<a class="gh-profile" href={p.url} target="_blank" rel="me">
							<img
								src={p.avatar}
								class="gh-avatar"
								alt=""
								loading="lazy"
							/>
							<div class="gh-profile-info">
								<p class="gh-name">{p.name || p.login}</p>
								<p class="gh-login">
									@{p.login}
									{p.pronouns ? <span> · {p.pronouns}</span> : null}
								</p>
							</div>
						</a>
						{p.bio ? <p class="gh-bio">{p.bio}</p> : null}
						<p class="gh-meta">
							{p.location ? (
								<span>
									<span class="material-symbols">location_on</span>
									{p.location}
								</span>
							) : null}
							{p.company ? (
								<span>
									<span class="material-symbols">business</span>
									{p.company}
								</span>
							) : null}
						</p>
						</div>
						<p class="gh-stats">
							{stat(c.total, "contributions this year", "gh-stat-hero")}
							{stat(p.followers, "followers")}
							{stat(p.following, "following")}
							{stat(p.publicRepos, "repos")}
						</p>
						</div>
						<div class="gh-pinned">
							{pinned.slice(0, 2).map((r) => (
								<a
									class="gh-repo"
									href={r.url}
									target="_blank"
									rel="noopener"
								>
									<span class="gh-repo-name">{r.name}</span>
									{r.description ? (
										<span class="gh-repo-desc">{r.description}</span>
									) : null}
									<span class="gh-repo-meta">
										{r.language ? (
											<span>
												<span
													class="gh-lang"
													style={`background:${r.language.color || "var(--subtext1)"}`}
												/>
												{r.language.name}
											</span>
										) : null}
										<span>
											<span class="material-symbols">star</span>
											{r.stars}
										</span>
									</span>
								</a>
							))}
						</div>
						</div>
					</>
				);
			})}
		</div>
	);
}

// Shared .livecard / .livecard-* styles live in src/style.css so they apply
// here without re-declaration. Only mastodon-fedi-post-specific styles below.
GithubCard.style = css`
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

	/* contribution graph as a full-bleed translucent backdrop (inset reaches the
	   card border, z-index -1 puts it behind the content) */
	.gh-bleed {
		position: absolute;
		inset: -0.7rem;
		z-index: -1;
		container-type: size;
		overflow: hidden;
		pointer-events: none;
		background: var(--crust);
		opacity: 1;
	}

	/* 7 square rows sized to exactly fill the card height; newest weeks are
	   right-aligned and older ones clip off the left edge */
	.gh-grid {
		--gap: 2px;
		--cell: calc((100cqh - 8 * var(--gap)) / 7);
		position: absolute;
		inset: 0;
		display: grid;
		grid-auto-flow: column;
		grid-template-rows: repeat(7, var(--cell));
		grid-auto-columns: var(--cell);
		gap: var(--gap);
		padding: var(--gap);
		justify-content: end;
	}

	.gh-bleed::after {
		content: "";
		position: absolute;
		inset: 0;
		background: linear-gradient(
			to bottom,
			hsla(var(--crust-hsl), 0.2) 0%,
			hsla(var(--crust-hsl), 0.6) 100%
		);
	}

	.gh-day {
		display: block;
		background: hsla(var(--surface1-hsl, var(--surface0-hsl)), 0.45);
	}

	.gh-l1 { background: hsla(var(--accent-hsl), 0.22); }
	.gh-l2 { background: hsla(var(--accent-hsl), 0.4); }
	.gh-l3 { background: hsla(var(--accent-hsl), 0.6); }
	.gh-l4 { background: hsla(var(--accent-hsl), 0.85); }

	/* details on the left, counts on the right. wraps (counts drop under the
	   details) once the card is too narrow for both. */
	.gh-top {
		display: flex;
		flex-wrap: wrap;
		align-items: stretch;
		justify-content: space-between;
		gap: 0.75rem 1.5rem;
		min-width: 0;
	}

	.gh-about {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		flex: 1 1 15rem;
		min-width: 0;
	}

	.gh-top .gh-stats {
		display: grid;
		grid-template-columns: repeat(3, auto);
		/* keep the counts together, bottom-aligned with the details column */
		align-content: end;
		justify-content: end;
		justify-items: end;
		text-align: right;
		gap: 0.5rem 1.25rem;
	}

	.gh-stats .gh-stat {
		align-items: flex-end;
	}

	.gh-stats .gh-stat-hero {
		grid-column: 1 / -1;
		margin-right: 0;
	}

	.gh-profile {
		display: flex;
		align-items: center;
		gap: 0.9rem;
		min-width: 0;
		color: inherit;
		text-decoration: none !important;
	}

	.gh-profile::after {
		display: none !important;
	}

	.gh-avatar {
		width: 4.5rem;
		height: 4.5rem;
		flex-shrink: 0;
		object-fit: cover;
		border: 2px solid var(--surface3);
		background: var(--surface2);
	}

	.gh-profile-info {
		display: flex;
		flex-direction: column;
		min-width: 0;
		line-height: 1.15;
	}

	.gh-name {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 600;
		font-variation-settings: "ELSH" 93;
		color: var(--text);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.gh-login {
		margin: 0.15rem 0 0;
		font-size: 0.9rem;
		color: var(--subtext1);
	}

	.gh-bio {
		margin: 0;
		font-size: 0.95rem;
		line-height: 1.4;
		color: var(--text1);
	}

	.gh-meta {
		display: flex;
		flex-wrap: wrap;
		gap: 0.2rem 0.9rem;
		margin: 0;
		font-size: 0.82rem;
		color: var(--subtext1);
	}

	.gh-meta > span {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
	}

	.gh-meta .material-symbols {
		font-size: 1rem;
	}

	.gh-stats {
		display: flex;
		align-items: flex-end;
		flex-wrap: wrap;
		gap: 1.2rem;
		margin: 0;
		font-size: 0.8rem;
		color: var(--subtext1);
	}

	.gh-stat {
		display: flex;
		flex-direction: column;
		line-height: 1.1;
	}

	.gh-stat-hero {
		margin-right: auto;
	}

	.gh-stat-hero b {
		font-size: 2rem;
		color: var(--accent);
	}

	.gh-stat b {
		font-size: 1.35rem;
		color: var(--text);
		font-variation-settings: "ELSH" 93;
	}

	.gh-pinned {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
		gap: 0.4rem;
		margin-top: auto;
	}

	.gh-repo {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		padding: 0.45rem 0.6rem;
		border: 1px solid var(--surface2);
		background: hsla(var(--surface0-hsl), 0.7);
		color: inherit;
		text-decoration: none !important;
		font-size: 0.8rem;
		min-width: 0;
	}

	.gh-repo::after {
		display: none !important;
	}

	.gh-repo-name {
		font-weight: 600;
		color: var(--accent);
	}

	.gh-repo-desc {
		color: var(--subtext0);
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.gh-repo-meta {
		display: flex;
		gap: 0.6rem;
		margin-top: auto;
		color: var(--subtext1);
		font-size: 0.75rem;
	}

	.gh-repo-meta > span {
		display: inline-flex;
		align-items: center;
		gap: 0.2rem;
	}

	.gh-repo-meta .material-symbols {
		font-size: 0.9rem;
	}

	.gh-lang {
		width: 0.6rem;
		height: 0.6rem;
		border-radius: 50%;
		display: inline-block;
	}

`;

export default GithubCard;
