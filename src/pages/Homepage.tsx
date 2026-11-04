import { FC, css } from "dreamland/core";
import { WebButton, ButtonList, CopiedToast } from "../components/Buttons";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import ContactCard from "../components/ContactCard";
import LastFmCard from "../components/LastFmCard";
import TwitterCard from "../components/TwitterCard";
import GithubCard from "../components/GithubCard";
import MastodonCard from "../components/MastodonCard";
import { EmailIcon, DiscordIcon, SignalIcon } from "../components/SocialIcons";
import ProjectCard from "../components/ProjectCard";
import TransitionLink from "../components/TransitionLink";
import { projects } from "../Projects";

const featuredProjects = projects
	.filter((project) => project.featured)
	.sort((a, b) => (a.featuredPosition || 0) - (b.featuredPosition || 0))
	.slice(0, 3);

function Homepage(this: FC) {
	return (
		<main>
			<title>bomberfish.ca</title>
			<div class="layout-container">
				<Navbar active="home" />
				<div class="main-content">
					<section class="about-section" id="about">
						<div class="about-text">
							<h1>
								<span class="emoji">👋</span>hiya!
							</h1>
							{/* floated beside the paragraphs (before them, so it can be),
							    or placed in the grid in narrow portrait */}
							<a href="/me.png" target="_blank" rel="noopener" class="pfp-link">
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
							<p>
								i'm an 18 y/o high school student from waterloo, canada, and
								sometimes i make <code>use(ful|less)</code> things.
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
								i'm also somewhat active in the ios modding and jailbreak scene,
								so say hi if you see me around!
							</p>
						</div>
					</section>
					<section class="live-section" id="status">
						<div class="live-grid">
							<h3 class="live-heading">what i'm up to</h3>
							<div class="live-stack">
								<LastFmCard />
								<TwitterCard />
								<MastodonCard />
								<GithubCard />
							</div>
							<h3 class="more-heading" id="contact-me">
								get in touch:
							</h3>
							<div class="contact-list" aria-labelledby="contact-me">
								<ContactCard
									contact={{
										platform: "email",
										username: "me@bomberfish.ca",
										url: "mailto:me@bomberfish.ca",
									}}
								>
									<EmailIcon />
								</ContactCard>
								<ContactCard
									contact={{
										platform: "discord",
										username: "@bomberfish",
										url: "https://discordapp.com/users/470637062870269952",
									}}
								>
									<DiscordIcon />
								</ContactCard>
								<ContactCard
									contact={{
										platform: "signal",
										username: "@one.337",
										url: "https://signal.me/#eu/Hj17C2gxd-rMfhgGYLZADiwtnP9y1xDF9waDfQxJudgShHBOqThJXLLHV4ZPmPny",
									}}
								>
									<SignalIcon />
								</ContactCard>
							</div>
						</div>
					</section>
					<section class="projects-section" id="projects">
						<div class="projects-heading">
							<h3>(some) things i've made</h3>
							<TransitionLink href="/projects" class="projects-more">
								all projects →
							</TransitionLink>
						</div>
						<div class="projects-row">
							{featuredProjects.map((project) => (
								<ProjectCard project={project} compact />
							))}
						</div>
					</section>
					<br />
					<section class="buttons-section">
						<div class="mine">
							<WebButton
								src="/button.gif"
								title="Click to copy my button! (HTML code)"
								on:click={(e: MouseEvent) => {
									e.preventDefault();
									try {
										navigator.clipboard.writeText(
											'<a href="https://bomberfish.ca/?ref=button" referrerpolicy="unsafe-url" >\n<img src="https://bomberfish.ca/button.gif" alt="BomberFish" title="BomberFish" />\n</a>'
										);
										document.body.appendChild(<CopiedToast />);
									} catch {
										console.error(e);
									}
								}}
							/>
							<subt style="font-size: 0.8em; margin-left: 0.5em;">
								(click to copy code! hotlinking is strongly encouraged, i might
								change it at any time!)
							</subt>
						</div>
						<ButtonList />
					</section>
				</div>
				<Footer />
			</div>
		</main>
	);
}

Homepage.style = css`
	/* Text on the left, the picture on the right, vertically centred on
	   the whole text block. The picture sits right after the heading in the
	   markup (narrow portrait floats it, below), so this is a grid on the
	   text block rather than a row of the two: everything in the first
	   column, the picture in the second, across all the rows. */
	.about-section {
		margin-bottom: 0.75rem;
		display: flow-root;
	}

	.about-text {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		column-gap: 1.25rem;
	}

	.about-text > * {
		grid-column: 1;
	}

	.about-text > *:first-child {
		margin-top: 0;
	}

	.about-text > *:last-child {
		margin-bottom: 0;
	}

	.pfp-link {
		display: block;
		grid-column: 2 !important;
		/* every row there is (the empty extra ones are 0 tall) */
		grid-row: 1 / span 20;
		align-self: center;
	}

	h1 .emoji {
		font-size: 0.7em;
		padding-right: 0.15em;
	}

	h1 {
		display: flex;
		align-items: center;
		font-variation-settings: "ELSH" 80 !important;
		transition: font-variation-settings 0.3s ease-in-out;
	}

	h1:hover {
		font-variation-settings: "ELSH" 35 !important;
	}

	h1 span.emoji {
		display: inline-block;
		transition: transform 0.3s cubic-bezier(0.5, 1.3, 0.86, 1.09);
	}

	h1:hover span.emoji {
		transform: rotate(-15deg);
	}

	/* .about-section::after {
		content: "";
		display: table;
		clear: both;
	} */

	.about-section p {
		font-size: 0.95rem;
		line-height: 1.5;
		margin: 0 0 0.5rem 0;
	}

	.pfp {
		display: block;
		width: 220px;
		height: 220px;
		border: 2px solid var(--surface3);
	}

	#contact-me {
		line-height: clamp(1.2rem, 1vw + 1rem, 1.75rem);
		font-variation-settings: "ELSH" 95;
	}

	.buttons-section {
		background: var(--card-bg);
		padding: 0.75rem;
		margin-top: auto;
		contain: paint;
		/* the marquee, the per-button animations and the gifs stop being
		   rendered while this is off screen; auto remembers its real height */
		content-visibility: auto;
		contain-intrinsic-size: auto 10rem;
	}

	.mine {
		display: flex;
		align-items: center;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid var(--surface2);
		margin-bottom: 0.5rem;
	}

	.live-section h3 {
		margin: 0;
	}

	/* 16-col grid: row 2 = last.fm (7 cols, the widest: it has the preview
	   player) + twitter (6) + contacts (3); row 3 = github (10) + mastodon (6,
	   same width as twitter), so nothing is left empty under the contacts */
	.live-grid {
		display: grid;
		grid-template-columns: repeat(16, minmax(0, 1fr));
		align-items: stretch;
		gap: 1rem;
		margin-block: 1rem;
	}

	.live-grid > .live-heading {
		grid-column: 1 / 14;
		grid-row: 1;
	}

	.live-grid > .more-heading {
		grid-column: 14 / 17;
		grid-row: 1;
		font-size: 1.1rem;
		align-self: end;
	}

	/* the wrapper only exists for semantics; its cards join the grid */
	.live-stack {
		display: contents;
	}

	.live-stack > :global(.livecard) {
		min-width: 0;
		width: auto;
		min-height: 18rem;
	}

	.live-stack > :global(.livecard:nth-child(1)) {
		grid-column: 1 / 8;
		grid-row: 2;
	}

	.live-stack > :global(.livecard:nth-child(2)) {
		grid-column: 8 / 14;
		grid-row: 2;
	}

	.live-stack > :global(.livecard:nth-child(3)) {
		grid-column: 11 / 17;
		grid-row: 3;
	}

	.live-stack > :global(.livecard:nth-child(4)) {
		grid-column: 1 / 11;
		grid-row: 3;
	}

	.live-grid > .contact-list {
		grid-column: 14 / 17;
		grid-row: 2;
		display: flex;
		flex-direction: column;
		/* fill the row's height, cards sharing it equally */
		align-self: stretch;
		gap: 0.75rem;
		min-width: 0;
	}

	/* .live-grid prefix outranks ContactCard's own min-height: 100%
	   (same specificity otherwise, and its stylesheet loads later), which
	   made each card as tall as the whole column */
	.live-grid > .contact-list > :global(.contact-card) {
		flex: 1 1 0;
		min-height: 0;
	}

	.projects-heading {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.projects-heading h3 {
		margin: 0;
	}

	.projects-row {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(20rem, 1fr));
		gap: 1rem;
	}

	/* in-between widths (iPhone Duo's inner screen in landscape is 890px,
	   small laptops, tablets): the 16-col grid gets too cramped for the
	   player and the contacts column, so go to two columns, with the
	   contacts as a row underneath */
	@media (min-width: 55.0625rem) and (max-width: 70rem) {
		.live-grid {
			grid-template-columns: minmax(0, 7fr) minmax(0, 6fr);
		}

		.live-grid > .live-heading {
			grid-column: 1 / -1;
		}

		.live-stack > :global(.livecard:nth-child(1)) {
			grid-column: 1;
			grid-row: 2;
		}

		.live-stack > :global(.livecard:nth-child(2)) {
			grid-column: 2;
			grid-row: 2;
		}

		.live-stack > :global(.livecard:nth-child(3)) {
			grid-column: 2;
			grid-row: 3;
		}

		.live-stack > :global(.livecard:nth-child(4)) {
			grid-column: 1;
			grid-row: 3;
		}

		.live-grid > .more-heading {
			grid-column: 1 / -1;
			grid-row: 4;
			align-self: start;
		}

		.live-grid > .contact-list {
			grid-column: 1 / -1;
			grid-row: 5;
			flex-direction: row;
		}

		.live-grid > .contact-list > :global(.contact-card) {
			min-width: 0;
			min-height: auto;
		}
	}

	@media (max-width: 55rem) {
		.live-grid {
			grid-template-columns: 1fr;
		}

		/* the fill-the-column flex above needs the grid row's height; in
		   one column there's none, and the cards collapsed to nothing */
		.live-grid > .contact-list > :global(.contact-card) {
			flex: none;
			min-height: auto;
		}

		.live-grid > .live-heading,
		.live-grid > .more-heading,
		.live-grid > .contact-list,
		.live-stack > :global(.livecard) {
			grid-column: 1 !important;
			grid-row: auto !important;
		}

		.live-grid > .more-heading {
			align-self: start;
		}

		.live-stack > :global(.livecard) {
			min-height: 0 !important;
		}
	}

	/* wide enough for the three contacts side by side (iPhone Duo inner
	   screen, tablets) but still a single column of cards */
	@media (min-width: 36rem) and (max-width: 55rem) {
		.live-grid > .contact-list {
			flex-direction: row;
		}

		.live-grid > .contact-list > :global(.contact-card) {
			flex: 1 1 0;
			min-width: 0;
		}
	}

	@media (max-width: 40rem) {
		.live-grid {
			gap: 0.875rem;
		}

		.buttons-section {
			padding-inline: 0.625rem;
		}
	}

	/* portrait but roomy (iPhone Duo inner screen, tablets): keep the
	   picture beside the text, just smaller */
	@media (orientation: portrait) and (min-width: 36rem) {
		.pfp {
			width: 160px;
			height: 160px;
		}
	}

	/* Narrow portrait: still floated, so every paragraph is one run of
	   lines the browser can justify and hyphenate as a whole (the text
	   wraps round the picture and carries on full width below), but lifted
	   up beside the heading. A float can't start above the content before
	   it, so it's pulled up with a negative top margin: the heading's box
	   (font-size x 1.18 line-height) plus its 0.75rem margin, less the
	   ~0.18em above its lettering = 1 heading font-size + 0.75rem, using
	   the heading's own size (h1 in style.css). */
	@media (orientation: portrait) and (max-width: 35.9375rem) {
		.about-section {
			text-align: justify;
		}

		.about-text {
			display: block;
		}

		.about-section p {
			hyphens: auto;
		}

		.pfp-link {
			float: right;
			margin: calc(-1 * clamp(2.5rem, 1.75rem + 3.5vw, 4rem) - 0.75rem) 0 0.4rem
				0.9rem;
		}

		.pfp {
			width: clamp(6.5rem, 32vw, 9rem);
			height: clamp(6.5rem, 32vw, 9rem);
		}
	}
`;
export default Homepage;
