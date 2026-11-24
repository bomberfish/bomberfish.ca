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
} from "metro-dreamland";
import { projects } from "../Projects";
import { reported, scene } from "../lib/weather/index";
import { glyphFor, weatherGlyph } from "../components/WeatherGlyph";
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

// Under whoami: three start tiles that pan along (on a phone, scroll down)
// to the sections further off. They're anchors
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

// On a phone those are at the top of the page instead, with one more for the
// section that's first under them: four small tiles in a row, and a small
// tile was only ever its glyph.
const smallJumps = [
	{ to: "status", icon: "headphones", label: "what i'm up to" },
	...jumps,
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
// group of tiles, panning sideways. On a phone it's a phone's start
// screen: the same sections one under another, scrolling down.
function Homepage(this: FC) {
	// What time it is in Waterloo and what it's doing there, at the end of
	// whoami's first paragraph: the time to the second, its colons blinking
	// with the seconds; then a link that says "doing this" (the sky behind
	// the page is the weather), and once Environment Canada's been heard
	// from, says it in words. It goes to the weather's own page. The
	// sentence isn't in the page as it's served: it's written here, so that
	// without scripting (no sky, no weather page, no clock that goes) there's
	// nothing of it at all.
	let shown = false; // this page has been on screen
	const sayWeather = () => {
		const line = this.root?.querySelector<HTMLElement>(".weather-line");
		if (line && !line.firstChild) {
			line.append(
				"right now it's ",
				(<time class="clock" />) as Node,
				" there, and it's ",
				(
					<Link href="/weather" class="weather-now">
						doing this
					</Link>
				) as Node,
				"."
			);
			startClock();
		}
		const link = line?.querySelector<HTMLElement>(".weather-now");
		// (left the page: stop listening. Not just "not on the page", though:
		// a page is made before it's put there.)
		if (this.root?.isConnected) shown = true;
		else if (shown) {
			window.removeEventListener("weatherchange", sayWeather);
			return;
		}
		tellWeather();
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
	// The clock: Waterloo's time (whoever's reading), on the 24-hour clock,
	// written out again at the turn of every second. Its colons blink in step with the seconds
	// (lit for the first half of each, a CSS animation started on the
	// second), and stay lit for anyone who's asked for less motion.
	let ticking = 0;
	const CLOCK = new Intl.DateTimeFormat("en-CA", {
		timeZone: "America/Toronto",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hourCycle: "h23",
	});
	const tick = () => {
		const clock = this.root?.querySelector<HTMLTimeElement>("time.clock");
		// (left the page: stop, until it's back)
		if (!clock?.isConnected) {
			ticking = 0;
			return;
		}
		const now = new Date();
		const parts = CLOCK.formatToParts(now);
		const text = (type: string) =>
			parts.find((p) => p.type === type)?.value ?? "";
		const sep = () => <span class="clock-sep">:</span>;
		clock.replaceChildren(
			text("hour"),
			sep() as Node,
			text("minute"),
			sep() as Node,
			text("second")
		);
		clock.dateTime = now.toISOString();
		ticking = window.setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
	};
	const startClock = () => {
		if (ticking) return;
		ticking = window.setTimeout(tick, 0);
	};

	// ...and on a phone, where the top of the page is a start screen's tiles
	// (.home-start, below), the weather has one: the picture for it, the
	// temperature in a tile's big light figures, and what it's doing as the
	// tile's name. It's the sky's weather (what's behind the page, real or
	// picked), and goes to the weather's page. Made here, like the
	// sentence: there's no weather without scripting.
	const tellWeather = () => {
		const start = this.root?.querySelector<HTMLElement>(".home-start");
		if (!start) return;
		let tile = start.querySelector<HTMLElement>(".weather-tile");
		if (!tile) {
			tile = (
				<Tile to="/weather" color="accent" class="weather-tile" w={2} h={2}>
					<span class="weather-tile-glyph" />
					<TileCount />
					<TileLabel>waterloo</TileLabel>
				</Tile>
			) as HTMLElement;
			start.querySelector(".me-tile")?.after(tile);
		}
		const sky = scene();
		const temperature = sky.temperature ?? reported()?.temperature ?? null;
		tile
			.querySelector(".weather-tile-glyph")!
			.replaceChildren(
				weatherGlyph(
					glyphFor(sky.kind, sky.condition, sky.intensity, sky.day < 0.35)
				) as Node
			);
		tile.querySelector(".tile-count")!.textContent =
			temperature == null ? "" : `${Math.round(temperature)}°`;
		const words = sky.condition?.toLowerCase();
		tile.querySelector(".tile-label")!.textContent = words || "waterloo";
		tile.setAttribute(
			"aria-label",
			`the weather in waterloo${words ? `: ${words}` : ""}`
		);
	};
	this.cx.mount = () => {
		if (import.meta.env.SSR) return;
		sayWeather();
		startClock();
		window.addEventListener("weatherchange", sayWeather);
	};

	const [lead, ...otherPosts] = latestPosts;

	// The 88x31s: my own button (click it for its code) over the two rows
	// of everyone else's going by. They're on the page twice, and each
	// layout shows one: under "jump to" in whoami's column on the start
	// screen, and as a section of their own at the foot of the page on a
	// phone, where everything under whoami is a scroll further from the
	// tiles. (The footer's the same: under whoami's column there, under
	// everything here.)
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
						{/* A phone's start screen begins with its tiles: me (a
							    phone had a tile by that name, your picture on it),
							    the weather (put in by tellWeather, above), and a row
							    of small ones that scroll down to the sections. */}
						<Tiles class="home-start">
							<Tile
								href="/me.png"
								target="_blank"
								rel="noopener"
								class="me-tile"
								w={2}
								h={2}
								title="my profile picture! click to view full size."
							>
								<span class="tile-image">
									<picture>
										<source type="image/webp" srcset="/me.480px.webp" />
										<img
											src="/me.480px.jpg"
											class="pfp"
											width="220"
											height="220"
											loading="eager"
											alt="profile picture"
										/>
									</picture>
								</span>
								<TileLabel>me!</TileLabel>
							</Tile>
							{smallJumps.map((j) => (
								<Tile
									href={`#${j.to}`}
									color="accent"
									class="small-tile"
									w={1}
									h={1}
									title={j.label}
									aria-label={j.label}
									data-m-pan
								>
									<TileIcon>
										<span class="material-symbols">{j.icon}</span>
									</TileIcon>
								</Tile>
							))}
						</Tiles>
						<PanoramaHeading class="whoami">whoami</PanoramaHeading>
						{/* The text, and "jump to" and the 88x31s under it (the
							    layouts are below). */}
						<div class="about-column">
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
				<div class="home-foot">
					<Footer />
				</div>
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

	/* Waterloo's time, in figures that don't jostle as they change; its
	   colons blink with the seconds (redrawn at the turn of each, so the
	   blink starts there: lit, then out for the second half) */
	/* (:global: they're written in after the page is made, outside its scope) */
	:global(.clock) {
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	:global(.clock .clock-sep) {
		animation: clock-blink 1s steps(1, end) infinite;
	}

	@keyframes clock-blink {
		50% {
			opacity: 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		:global(.clock .clock-sep) {
			animation: none;
		}
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

	/* "jump to" with its three tiles goes under the text, and on the start
	   screen the 88x31s under that. The two layouts are further down; this
	   is what they share. */
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
	   A column that scrolls down, so nothing has to fit a height: whoami's
	   text at its own size, then "jump to" (whose tiles scroll on down the
	   page), then the tiles, a section after a section; the 88x31s and the
	   footer at the foot of it all. */
	@media not all and (min-width: 37.5rem) and (min-height: 36rem) {
		/* The start tiles: me and the weather, a medium tile each, and
		   the four small ones, under them or (eight across) beside. Each
		   is given its place, further down, where it's known there'll be
		   a weather tile to go beside me: left to place themselves the
		   small ones would fill that corner, and move when it arrived.
		   Without scripting it never does, and they do fill it: a medium
		   tile and four small, as start screens began. */
		.home-start {
			margin-bottom: 1.5rem;
		}

		/* (a small tile is its glyph and nothing else: all of the tile is
		   the glyph's to be in the middle of) */
		.home-start :global(.small-tile) :global(.tile-icon) {
			inset: 0;
			font-size: min(2.5rem, calc(var(--u) * 0.48));
		}

		/* the weather's: its picture in the top corner, the figures over
		   the name */
		.home-start :global(.weather-tile) :global(.weather-glyph) {
			top: 0.55rem;
			left: 0.6rem;
			width: min(3rem, calc(var(--u) * 0.6));
			height: auto;
			aspect-ratio: 24 / 26;
			stroke-width: 1.2;
		}

		.home-start :global(.weather-tile) :global(.tile-count) {
			position: absolute;
			left: 0.6rem;
			bottom: 1.45rem;
			font-family: var(--font-display);
			font-size: min(4rem, calc(var(--u) * 0.8));
			font-weight: 200;
			line-height: 1;
			letter-spacing: -0.04em;
		}

		.about-text {
			max-width: 36rem;
		}

		/* ("jump to" is those small tiles, here; and the 88x31s' place
		   and the footer's is the foot of the page) */
		.about-nav,
		.about-buttons.buttons-section,
		.pano-item.about-section > :global(footer) {
			display: none;
		}

		.home-foot {
			padding: 0.75rem var(--pano-margin) 0;
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

	/* The start tiles' places (see .home-start, above): phone mode's
	   conditions again, with scripting. Four across, the small ones are
	   the third row; eight across, the far half of the first. (.tiles as
	   well, to outrank the panorama's own rule for a tile's place.) */
	@media (scripting: enabled) and (max-width: 37.49rem),
		(scripting: enabled) and (max-height: 35.99rem) {
		.home-start.tiles :global(.me-tile) {
			grid-area: 1 / 1 / span 2 / span 2;
		}

		.home-start.tiles :global(.weather-tile) {
			grid-area: 1 / 3 / span 2 / span 2;
		}

		.home-start.tiles :global(.small-tile) {
			grid-row: 3;
		}
	}

	@media (scripting: enabled) and (min-width: 30rem) and (max-height: 35.99rem) {
		.home-start.tiles :global(.small-tile) {
			grid-row: 1;
		}

		.home-start.tiles :global(.small-tile:nth-last-child(4)) {
			grid-column: 5;
		}

		.home-start.tiles :global(.small-tile:nth-last-child(3)) {
			grid-column: 6;
		}

		.home-start.tiles :global(.small-tile:nth-last-child(2)) {
			grid-column: 7;
		}

		.home-start.tiles :global(.small-tile:nth-last-child(1)) {
			grid-column: 8;
		}
	}

	/* ---- start mode: four rows of tiles (see "Panorama" in metro-dreamland/metro.css) ---- */
	@media (min-width: 37.5rem) and (min-height: 36rem) {
		/* (these are a phone's: see above. .tiles as well, to outrank
		   the rule that makes one a grid.) */
		.home-start.tiles,
		.buttons-item,
		.home-foot {
			display: none;
		}

		/* The column's on the same four rows as the tiles beside it, top
		   edge to bottom edge, and three things share it: the text; "jump
		   to" (a section heading's line and the gap under it, 2.9375rem)
		   with its row of tiles; and the 88x31s, three rows of buttons tall
		   (mine, then everyone else's two, with the room under each that
		   its buttons dip into as they go by). Whatever height those don't
		   use is the space between them, half above "jump to" and half
		   under its tiles (the two margin-top: auto). The text is fitted to
		   what it may have at most (data-m-fit: a longer bio
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
