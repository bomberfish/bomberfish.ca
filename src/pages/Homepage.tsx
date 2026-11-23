import { FC, css } from "dreamland/core";
import { WebButton, ButtonList, showCopiedToast } from "../components/Buttons";
import Footer from "../components/Footer";
import ContactCard from "../components/ContactCard";
import LastFmCard from "../components/LastFmCard";
import TwitterCard from "../components/TwitterCard";
import GithubCard from "../components/GithubCard";
import MastodonCard from "../components/MastodonCard";
import { EmailIcon, DiscordIcon, SignalIcon } from "../components/SocialIcons";
import ProjectTile from "../components/ProjectTile";
import {
	Link,
	Panorama,
	PanoramaHeading,
	PanoramaSection,
	PanoramaTitle,
	PanoramaTrack,
	Tile,
	TileBack,
	TileCount,
	TileFront,
	TileIcon,
	TileLabel,
	Tiles,
} from "../metro-dreamland";
import { projects } from "../Projects";
import { reported } from "../lib/weather/index";
import { blogPosts, coverStyle, formatPostDate } from "../lib/blog";

const featuredProjects = projects
	.filter((project) => project.featured)
	.sort((a, b) => (a.featuredPosition || 0) - (b.featuredPosition || 0))
	.slice(0, 3);

// the newest of the rest, as small tiles beside the featured ones
const recentProjects = projects
	.filter((project) => !project.featured)
	.slice(0, 4);

const latestPosts = blogPosts.slice(0, 3);

// Under whoami, where the window has a row to spare (see .about-nav): three
// start tiles that pan along to the sections further off. They're anchors
// to those sections ("#projects"), and the address takes the # like any
// anchor's would, so a section can be linked to and opened at; metro-dreamland
// does the panning (data-m-pan). Each turns over, like the project tiles, to
// say how much is waiting there. The count of ways to get in touch is the
// number of ContactCards in that section.
const jumps = [
	{
		to: "projects",
		icon: "construction",
		label: "things i've made",
		count: `${projects.length}`,
		of: "projects",
	},
	{
		to: "contact",
		icon: "email",
		label: "get in touch",
		count: "3",
		of: "ways to reach me",
	},
	{
		to: "blog",
		icon: "article",
		label: "blog",
		count: `${blogPosts.length}`,
		of: "posts",
	},
];

// The arrow after a section's heading that says the heading goes somewhere:
// Metro's own arrow in a ring, which is one glyph of Segoe UI Symbol. U+E0AA
// is the Windows 8 back button's glyph (U+E071, which is what the site's
// back button is: see SiteNav) pointing the other way. Microsoft never gave
// either a name, so they're asked for by codepoint. (.m-ring-arrow in
// style.css sizes the glyph to its box.)
function MoreArrow(this: FC) {
	return (
		<span class="m-ring-arrow more-arrow" aria-hidden="true">
			<span class="material-symbols">{"\uE0AA"}</span>
		</span>
	);
}

// The home page is a panorama (metro-dreamland's <Panorama>; see "Panorama" in its metro.css):
// the name across the top, and under it the sections side by side, each a
// group of tiles, panning sideways.
function Homepage(this: FC) {
	// What it's doing in Waterloo, at the end of whoami's first paragraph:
	// a sentence whose link says "doing this" (the sky behind the page is
	// the weather), and once Environment Canada's been heard from, says it
	// in words. It goes to the weather's own page. The sentence isn't in
	// the page as it's served: it's written here, so that without
	// scripting (no sky, no weather page) there's nothing of it at all.
	let shown = false; // this page has been on screen
	const sayWeather = () => {
		const line = this.root?.querySelector<HTMLElement>(".weather-line");
		if (line && !line.firstChild) {
			line.append(
				"right now it's ",
				(
					<Link href="/weather" class="weather-now">
						doing this
					</Link>
				) as Node,
				" there."
			);
		}
		const link = line?.querySelector<HTMLElement>(".weather-now");
		// (left the page: stop listening. Not just "not on the page", though:
		// a page is made before it's put there.)
		if (this.root?.isConnected) shown = true;
		else if (shown) {
			window.removeEventListener("weatherchange", sayWeather);
			return;
		}
		const now = reported();
		if (!link || !now || !now.condition) return;
		const words = now.condition.toLowerCase();
		// ("9° and cloudy", but "9° with light rain")
		const joiner =
			/^(mainly |mostly |partly )?(clear|sunny|cloudy|overcast)$/.test(words)
				? "and"
				: "with";
		link.textContent =
			now.temperature == null
				? words
				: `${Math.round(now.temperature)}° ${joiner} ${words}`;
	};
	this.cx.mount = () => {
		if (import.meta.env.SSR) return;
		sayWeather();
		window.addEventListener("weatherchange", sayWeather);
	};

	const [lead, ...otherPosts] = latestPosts;

	// The 88x31s: my own button (click it for its code) over the two rows
	// of everyone else's going by. They're on the page twice, and each
	// layout shows one: under "jump to" in whoami's column on the start
	// screen, where there's room for them there, and as a section of their
	// own at the end of the strip on a phone, where there isn't.
	const buttons = (where: string) => (
		<div class={`buttons-section ${where}`} data-m-feather>
			<div class="mine">
				<WebButton
					src="/button.gif"
					title="Click to copy my button! (HTML code)"
					on:click={(e: MouseEvent) => {
						e.preventDefault();
						try {
							navigator.clipboard.writeText(
								'<a href="https://bomberfish.ca/?ref=button" referrerpolicy="unsafe-url" >\n<img src="https://bomberfish.ca/button.gif" alt="bomberfish.ca" title="bomberfish.ca" />\n</a>'
							);
							showCopiedToast();
						} catch {
							console.error(e);
						}
					}}
				/>
				<subt>
					(click to copy code! hotlinking is strongly encouraged, i might change
					it at any time!)
				</subt>
			</div>
			<ButtonList />
		</div>
	);

	return (
		<main class="pano-page" data-m-page="pano">
			<title>bomberfish.ca</title>
			<Panorama>
				<PanoramaTitle class="page-header home-title">
					<a
						href="/me.png"
						target="_blank"
						rel="noopener"
						class="pfp-link"
						data-m-tilt
						data-m-feather
					>
						<picture>
							<source type="image/webp" srcset="/me.480px.webp" />
							<img
								src="/me.480px.jpg"
								class="pfp"
								title="my profile picture! click to view full size."
								width="220"
								height="220"
								loading="eager"
								alt="profile picture"
							/>
						</picture>
					</a>
					<h1 data-m-feather>
						<a href="#about" title="back to the start" data-m-pan>
							bomberfish
							{/* (the rest of the address, set back: the name's the title) */}
							<span class="title-tld">.ca</span>
						</a>
					</h1>
				</PanoramaTitle>

				<PanoramaTrack>
					<PanoramaSection class="about-section" id="about">
						<PanoramaHeading class="whoami">whoami</PanoramaHeading>
						{/* The text, and "jump to" and the 88x31s to go with it:
							    under it if the column has the height for all three,
							    and if not, beside it (data-m-fit-stack: metro-dreamland
							    finds out which, where it isn't the stylesheet's to
							    say; the layouts are below). */}
						<div class="about-column" data-m-fit-stack>
							<div class="about-text" data-m-feather data-m-fit>
								<p>
									i'm an 18 y/o high school student from waterloo, canada, and
									sometimes i make <code>use(ful|less)</code> things.{" "}
									<span class="weather-line" />
								</p>
								<p>
									my native languages are swift and javascript, though i'm also
									decent at java and all the usual C-family languages.
								</p>
								<p>
									i'm also a part of{" "}
									<a href="https://mercurywork.shop" target="_blank">
										mercury workshop
									</a>
									, a collective of software developers best known for the{" "}
									<a href="https://sh1mmer.me" target="_blank">
										sh1mmer
									</a>{" "}
									chromebook exploit. (fun fact: i actually made the current
									iteration of the group's website too!)
								</p>
								<p>
									i'm also somewhat active in the ios modding and jailbreak
									scene, so say hi if you see me around!
								</p>
							</div>
							<div class="about-more">
								<nav class="about-nav" aria-labelledby="jump-to">
									<PanoramaHeading id="jump-to">jump to…</PanoramaHeading>
									<div class="about-nav-tiles">
										{jumps.map((j) => (
											<Tile
												href={`#${j.to}`}
												class="nav-tile"
												w={1}
												h={1}
												flip
												data-m-pan
											>
												<TileFront color="accent">
													<TileIcon>
														<span class="material-symbols">{j.icon}</span>
													</TileIcon>
													<TileLabel>{j.label}</TileLabel>
												</TileFront>
												<TileBack color="accent">
													<TileCount>{j.count}</TileCount>
													<TileLabel>{j.of}</TileLabel>
												</TileBack>
											</Tile>
										))}
									</div>
								</nav>
								{buttons("about-buttons")}
							</div>
						</div>
						<Footer />
					</PanoramaSection>

					<PanoramaSection class="live-section" id="status">
						<PanoramaHeading class="live-heading">
							what i'm up to
						</PanoramaHeading>
						<Tiles class="live-stack">
							<LastFmCard />
							<MastodonCard />
							<TwitterCard />
							<GithubCard />
						</Tiles>
					</PanoramaSection>

					<PanoramaSection class="projects-section" id="projects">
						<PanoramaHeading>
							<Link href="/projects">
								(some) things i've made
								<MoreArrow />
							</Link>
						</PanoramaHeading>
						<Tiles class="projects-row">
							{featuredProjects.map((project, i) => (
								<ProjectTile
									project={project}
									w={i ? 2 : 4}
									h={2}
									pw={4}
									ph={2}
									eager
								/>
							))}
							{recentProjects.map((project) => (
								<ProjectTile
									project={project}
									w={1}
									h={1}
									pw={2}
									ph={2}
									small
								/>
							))}
							<Tile
								to="/projects"
								color="accent"
								class="projects-more"
								w={2}
								h={2}
								pw={4}
								ph={1}
							>
								<TileCount>{projects.length}</TileCount>
								<TileLabel>all projects →</TileLabel>
							</Tile>
						</Tiles>
					</PanoramaSection>

					<PanoramaSection class="contact-section" id="contact">
						<PanoramaHeading class="more-heading" id="contact-me">
							get in touch
						</PanoramaHeading>
						<Tiles class="contact-list" aria-labelledby="contact-me">
							<ContactCard
								color="c-accent"
								w={2}
								h={2}
								pw={4}
								ph={2}
								contact={{
									platform: "email",
									username: "me@bomberfish.ca",
									url: "mailto:me@bomberfish.ca",
								}}
							>
								<EmailIcon />
							</ContactCard>
							<ContactCard
								color="c-blurple"
								w={2}
								h={1}
								pw={2}
								ph={2}
								contact={{
									platform: "discord",
									username: "@bomberfish",
									url: "https://discordapp.com/users/470637062870269952",
								}}
							>
								<DiscordIcon />
							</ContactCard>
							<ContactCard
								color="c-cobalt"
								w={2}
								h={1}
								pw={2}
								ph={2}
								contact={{
									platform: "signal",
									username: "@one.337",
									url: "https://signal.me/#eu/Hj17C2gxd-rMfhgGYLZADiwtnP9y1xDF9waDfQxJudgShHBOqThJXLLHV4ZPmPny",
								}}
							>
								<SignalIcon />
							</ContactCard>
						</Tiles>
					</PanoramaSection>

					<PanoramaSection class="blog-section" id="blog">
						<PanoramaHeading>
							<Link href="/blog">
								see my (relatively dead) blog
								<MoreArrow />
							</Link>
						</PanoramaHeading>
						<Tiles class="blog-tiles">
							{lead ? (
								<Tile
									to={`/blog/${lead.slug}`}
									color="magenta"
									class={`post-tile lead${lead.image ? " has-cover" : ""}`}
									w={4}
									h={2}
									pw={4}
									ph={2}
									style={coverStyle(lead.image)}
								>
									{lead.image ? (
										<span class="tile-cover" aria-hidden="true" />
									) : (
										false
									)}
									<span class="post-tile-text">
										<span
											class="post-tile-title"
											data-m-keep={`post:${lead.slug}`}
										>
											{lead.title}
										</span>
										{lead.description ? (
											<span class="post-tile-desc">{lead.description}</span>
										) : (
											false
										)}
									</span>
									<TileLabel>{formatPostDate(lead.date)}</TileLabel>
								</Tile>
							) : (
								false
							)}
							{otherPosts.map((post) => (
								<Tile
									to={`/blog/${post.slug}`}
									color="magenta"
									class="post-tile"
									w={2}
									h={2}
									pw={2}
									ph={2}
								>
									<span class="post-tile-text">
										<span
											class="post-tile-title"
											data-m-keep={`post:${post.slug}`}
										>
											{post.title}
										</span>
									</span>
									<TileLabel>{formatPostDate(post.date)}</TileLabel>
								</Tile>
							))}
						</Tiles>
					</PanoramaSection>

					<PanoramaSection class="buttons-item" id="buttons">
						<PanoramaHeading>88×31</PanoramaHeading>
						{buttons("")}
					</PanoramaSection>
				</PanoramaTrack>
			</Panorama>
		</main>
	);
}

Homepage.style = css`
	/* ---- whoami: the one section that's just type ---- */
	.about-text {
		font-size: 0.975rem;
		line-height: 1.5;
		color: var(--text);
	}

	.about-text > :first-child {
		margin-top: 0;
	}

	.about-text > :last-child {
		margin-bottom: 0;
	}

	.about-text p {
		margin: 0 0 0.75rem 0;
	}

	/* the site's footer goes under it: at the foot of the column, however
	   much of the column the text leaves over. (.pano-item as well, here
	   and below, to outrank the footer's own rules for its padding.) */
	.about-section {
		display: flex;
		flex-direction: column;
	}

	.pano-item.about-section > :global(footer) {
		margin-top: auto;
		padding-top: 1.5rem;
	}

	/* "jump to" with its three tiles, and the 88x31s, go with the text:
	   under it where the column has the height for all three (the start
	   screen, and a phone or a narrow window that's tall enough), and as a
	   column of their own beside it where it hasn't (most phones). Those
	   two layouts are further down; this is what they share. On a phone on
	   its side there's the height for neither: "jump to" isn't shown, and
	   the 88x31s are a section of their own at the end of the strip. */
	.about-section {
		/* (a button's height, as components/Buttons.tsx has it, and how far
		   one dips as it goes by: groove, in style.css) */
		--btn-h: max(31px, 2.3rem);
		--btn-dip: max(7.75px, 0.625rem);
		--btn-gap: 0.4rem;
		--btns-h: calc(
			3 * var(--btn-h) + 2 * var(--btn-dip) + var(--btn-gap) + 0.15rem
		);
	}

	/* (neither is a box until a layout makes it one: what's in them is the
	   section's, or the column's) */
	.about-column,
	.about-more {
		display: contents;
	}

	.about-nav {
		flex: none;
	}

	.about-nav-tiles {
		display: grid;
		grid-auto-flow: column;
		grid-auto-columns: var(--u);
		grid-template-rows: var(--u);
		gap: var(--g);
		justify-content: start;
	}

	/* The 88x31s, with the text, as three rows one under another: my own
	   button with its note beside it, then the two rows of everyone else's
	   going by, each as wide as the column. No box round them here, and no
	   heading. */
	/* (both its classes: it's .buttons-section's rules, further down, that
	   these are instead of) */
	.about-buttons.buttons-section {
		display: flex;
		flex-direction: column;
		gap: var(--btn-gap);
		box-sizing: border-box;
		flex: none;
		min-width: 0;
		height: var(--btns-h);
		padding: 0;
		background: none;
		box-shadow: none;
		-webkit-backdrop-filter: none;
		backdrop-filter: none;
		contain-intrinsic-size: auto 8.7rem;
	}

	.about-buttons .mine {
		flex: none;
		flex-direction: row;
		align-items: center;
		gap: 0.75rem;
		min-width: 0;
		height: var(--btn-h);
		margin: 0;
		padding: 0;
		border: 0;
	}

	.about-buttons .mine subt {
		min-width: 0;
		font-size: 0.72rem;
		line-height: 1.2;
		text-wrap: balance;
	}

	/* (the two rows. Each stays as wide as its buttons come to, and isn't
	   stretched or squeezed to the column: how fast a row goes by is half
	   its own width every so many seconds, so a row made a column wide
	   crawls, and jumps when it comes round. With reduced motion they
	   don't go by, they wrap, and it's this that scrolls. It's the list's
	   own element, which has no class to go by that it keeps.) */
	.about-buttons > :global(:last-child) {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.15rem;
		flex: 1;
		min-width: 0;
		min-height: 0;
		overflow-x: hidden;
		overflow-y: auto;
		scrollbar-width: none;
	}

	.about-buttons :global(.webbtns) {
		flex: none;
		max-width: none;
		margin-block: 0 var(--btn-dip);
	}

	/* (the section of their own: only on a phone on its side) */
	@media not all and (max-height: 30rem) {
		.buttons-item {
			display: none;
		}
	}

	/* ---- (some) things i've made ----
	   (One class to a :global(): with a space inside one, ":global(.a .b)",
	   the scoping sometimes loses the space and the rule matches nothing.) */
	.projects-row :global(.projects-more) :global(.tile-count),
	.nav-tile :global(.tile-count) {
		position: absolute;
		top: 0.2rem;
		left: 0.6rem;
		font-family: var(--font-display);
		/* (no taller than the tile, on a phone small enough for that) */
		font-size: min(4.5rem, calc(var(--u) * 0.9));
		font-weight: 300;
		line-height: 1;
		letter-spacing: -0.04em;
	}

	/* ---- blog ---- */
	.blog-tiles :global(.post-tile) {
		overflow: hidden;
		isolation: isolate;
	}

	.blog-tiles :global(.post-tile-text) {
		position: absolute;
		inset: 0.5rem 0.7rem 1.7rem;
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		overflow: hidden;
	}

	.blog-tiles :global(.post-tile-title) {
		font-family: var(--font-display);
		/* (smaller with the tile, on a small phone) */
		font-size: min(1.45rem, calc(var(--u) * 0.29));
		font-weight: 300;
		line-height: 1.12;
		letter-spacing: -0.015em;
		text-wrap: balance;
	}

	.blog-tiles :global(.lead) :global(.post-tile-title) {
		font-size: 2rem;
		font-weight: 300;
		letter-spacing: -0.02em;
		line-height: 1.08;
	}

	.blog-tiles :global(.post-tile-desc) {
		font-size: 0.9rem;
		line-height: 1.3;
		color: var(--subtext0);
	}

	/* ---- 88x31 ---- */
	.buttons-section {
		background: var(--grain), var(--card-bg);
		box-shadow: var(--glass-rim);
		/* (acrylic, like the tiles: --frost and the rest, in style.css) */
		-webkit-backdrop-filter: var(--frost);
		backdrop-filter: var(--frost);
		padding: 0.75rem;
		contain: paint;
		overflow: hidden;
		/* the marquee, the per-button animations and the gifs stop being
		   rendered while this is off screen; auto remembers its real height */
		content-visibility: auto;
		contain-intrinsic-size: auto 10rem;
	}

	.mine {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid var(--surface3);
		margin-bottom: 0.5rem;
	}

	.mine subt {
		font-size: 0.8rem;
	}

	/* ---- phone mode (see "Panorama" in metro-dreamland/metro.css) ----
	   whoami is a column of the strip like any other: as tall as the strip
	   and no taller, since nothing scrolls down. So the text has to fit the
	   height it's got, whatever it says and whatever the screen: at its
	   own size in one column if that'll do, a little smaller if that will,
	   and otherwise in as many columns as it takes, evened out. Nothing
	   here knows which: metro-dreamland tries them in that order (data-m-fit)
	   and says so with --fit-scale and --fit-cols, and these rules lay it
	   out from those. The footer keeps its place under the first column. */
	@media not all and (min-width: 60rem) and (min-height: 36rem) {
		/* (heights given outright, like the rest of the strip's: the text's
		   columns need to be told theirs) */
		.about-section {
			--foot-h: 4rem;
		}

		.about-text {
			--scale: var(--fit-scale, 1);
			--cols: var(--fit-cols, 1);
			flex: none;
			box-sizing: border-box;
			width: calc(
				var(--cols) * var(--sec-w) + (var(--cols) - 1) * var(--pano-gap)
			);
			height: calc(var(--body-h) - var(--foot-h));
			font-size: calc(0.975rem * var(--scale));
			/* (a little tighter as it gets smaller) */
			line-height: calc(1.5 - (1 - var(--scale)) * 0.8);
			/* auto, one column, isn't columns at all: the text just runs down */
			column-count: var(--fit-cols, auto);
			column-gap: var(--pano-gap);
			column-fill: balance;
			orphans: 2;
			widows: 2;
			/* What it does if it's never fitted (no script): scroll, sooner
			   than lose the end of it. Fitted, there's nothing to scroll. */
			overflow: auto;
			overscroll-behavior: contain;
			scrollbar-width: none;
		}

		.about-text::-webkit-scrollbar {
			display: none;
		}

		.about-text p {
			margin-bottom: calc(0.75rem * var(--scale));
		}

		.pano-item.about-section > :global(footer) {
			flex: none;
			box-sizing: border-box;
			width: var(--sec-w);
			height: var(--foot-h);
			margin-top: 0;
			padding: 0.4rem 0 0;
			overflow: hidden;
		}

		/* (its two lines closer together than a page's footer has them) */
		.pano-item.about-section > :global(footer) :global(:is(a, .splash)) {
			padding-block: 0.2rem;
		}

		/* "jump to" and the 88x31s. Beside the text, as the column after
		   it: somewhere the strip comes to rest, its heading up on the line
		   the sections' headings are on, its three tiles the column's
		   width between them... */
		.about-section {
			--about-gap: 1.25rem;
		}

		.about-column {
			display: flex;
			flex: none;
			gap: var(--pano-gap);
			height: calc(var(--body-h) - var(--foot-h));
		}

		.about-more {
			display: flex;
			flex-direction: column;
			flex: none;
			box-sizing: border-box;
			width: var(--sec-w);
			margin-top: calc(-1 * var(--heading-h));
			scroll-snap-align: start;
		}

		.about-nav-tiles {
			--u: calc((var(--sec-w) - 2 * var(--g)) / 3);
		}

		/* (a third of a phone's column isn't wide enough for "ways to
		   reach me" on one line: these labels may take two, and the glyph
		   over them moves up to leave them the room) */
		.about-nav-tiles .tile-label {
			white-space: normal;
			text-wrap: balance;
		}

		.about-nav-tiles .tile-icon {
			inset: 0 0 1.9rem;
		}

		.about-buttons {
			margin-top: var(--about-gap);
		}

		/* ...or under it, where the column's tall enough for all three
		   with the text at (or near) its own size. metro-dreamland tries that
		   first and says so (data-m-fit-stack); the text has what height
		   the other two leave, and the same space is over "jump to" as
		   under its tiles (less, as on the start screen, the room a line of
		   type has of its own: the text's under its baseline, the heading's
		   over its capitals). */
		.about-column[data-m-stacked] {
			flex-direction: column;
			gap: 0;
		}

		.about-column[data-m-stacked] .about-text {
			flex: 0 1 auto;
			height: auto;
			min-height: 0;
		}

		.about-column[data-m-stacked] .about-more {
			margin-top: calc(var(--about-gap) - 0.34rem - 0.59rem);
			scroll-snap-align: none;
		}

		.buttons-item {
			width: var(--sec-w);
		}

		/* (with reduced motion the buttons don't scroll past in two rows,
		   they wrap, into more than a column is tall: the one thing in
		   the strip left to scroll down, and only then) */
		.buttons-section {
			box-sizing: border-box;
			max-height: var(--body-h);
			overflow-y: auto;
			overscroll-behavior-y: contain;
		}

		/* "all projects" is one row tall here: its count goes at the far
		   end of it, clear of the label */
		.projects-row :global(.projects-more) :global(.tile-count) {
			top: 0;
			right: 0.7rem;
			left: auto;
			line-height: var(--u);
		}
	}

	/* ---- a phone on its side: no room for them with the text at all ---- */
	@media (max-height: 30rem) {
		.about-column {
			display: contents;
		}

		.about-more {
			display: none;
		}
	}

	/* ---- start mode: four rows of tiles (see "Panorama" in metro-dreamland/metro.css) ---- */
	@media (min-width: 60rem) and (min-height: 36rem) {
		/* The column's on the same four rows as the tiles beside it, top
		   edge to bottom edge, and three things share it: the text; "jump
		   to" (a section heading's line and the gap under it, 2.9375rem)
		   with its row of tiles; and the 88x31s, three rows of buttons tall
		   (mine, then everyone else's two, with the room under each that
		   its buttons dip into as they go by). Whatever height those don't
		   use is the space between them, half above "jump to" and half
		   under its tiles (the two margin-top: auto). The text is fitted to
		   what it may have at most (data-m-fit, as on a phone: a longer bio
		   comes out a little smaller before it comes out too long), which
		   is what leaves each space --about-gap at the least. The footer
		   goes under it all, in the strip's bottom margin, on one line to
		   fit there. */
		.about-section {
			--about-h: calc(4 * var(--u) + 3 * var(--g));
			--about-gap: 0.7rem;
			/* The two spaces are to look the same, and the upper one is
			   between two lines of type, which have room of their own in
			   them that the lower (a tile's edge to a button's) hasn't:
			   under the last line's baseline, in em of the text, and over
			   the heading's capitals (it's 1.75rem). The text's box is taken
			   to end that much sooner than it does, so the space is
			   measured from where the type is. */
			--about-ink-text: 0.31em;
			--about-ink-heading: 0.57rem;
		}

		.about-column {
			display: flex;
			flex-direction: column;
			flex: none;
			width: 27rem;
			height: var(--about-h);
		}

		.about-text {
			flex: none;
			box-sizing: border-box;
			width: 27rem;
			max-height: calc(
				var(--about-h) - 2.9375rem - var(--u) - var(--btns-h) - 2 *
					var(--about-gap) + var(--about-ink-text) + var(--about-ink-heading)
			);
			margin-bottom: calc(
				-1 * var(--about-ink-text) - var(--about-ink-heading)
			);
			font-size: calc(0.9rem * var(--fit-scale, 1));
			line-height: 1.4;
		}

		.about-text p {
			margin-bottom: 0.55rem;
		}

		.about-nav,
		.about-buttons {
			margin-top: auto;
		}

		/* (as wide as the text and no wider, whatever the splash says) */
		.pano-item.about-section > :global(footer) {
			box-sizing: border-box;
			width: 27rem;
			margin-top: 0;
			padding: 0.45rem 0 0;
		}

		/* (centred, not on a baseline: the splash line clips what's too
		   long, and a box that clips has its baseline at its bottom edge) */
		.pano-item.about-section > :global(footer) :global(subt) {
			flex-direction: row;
			align-items: center;
			gap: 0.9rem;
		}

		.pano-item.about-section > :global(footer) :global(.tooltip-wrapper) {
			flex: none;
		}

		/* (a long one is cut short with an ellipsis; they're all a click
		   away from another) */
		.pano-item.about-section > :global(footer) :global(.splash) {
			flex: 0 1 auto;
			min-width: 0;
			white-space: nowrap;
		}
	}
`;
export default Homepage;
