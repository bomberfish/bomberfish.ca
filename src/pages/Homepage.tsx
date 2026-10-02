import { FC, css } from "dreamland/core";
import { WebButton, ButtonList, CopiedToast } from "../components/Buttons";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import ContactCard from "../components/ContactCard";
import LastFmCard from "../components/LastFmCard";
import TwitterCard from "../components/TwitterCard";
import GithubCard from "../components/GithubCard";
import MastodonCard from "../components/MastodonCard";
import {
	EmailIcon,
	DiscordIcon,
	SignalIcon,
} from "../components/SocialIcons";

function Homepage(this: FC) {
	return (
		<main>
			<title>bomberfish.ca</title>
			<div class="layout-container">
				<Navbar active="home" />
				<div class="main-content">
					<section class="about-section background-container" id="about">
						<div class="about-text">
							<h1>
								<span class="emoji">👋</span>hiya!
							</h1>
							<p>
								i'm a 17 y/o high school student from waterloo,
								canada, and sometimes i make <code>use(ful|less)</code> things.
							</p>
							<p>
								at the moment, you can find me building beautiful web-adjacent
								stuff at{" "}
								<a href="https://puter.com" target="_blank">
									puter technologies inc,
								</a>{" "}
								where i get to work on stuff that really pushes the web platform
								to its limits!
							</p>
							<p>
								my native languages are swift and javascript, though i'm also
								decent at java and most of the C dialects.
							</p>
							<p>
								beyond my day-to-day, i'm part of{" "}
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
								i also used to be really involved in the ios modding and
								jailbreak scene, so say hi if you recognize me from those
								circles!
							</p>
						</div>
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
	.about-section {
		margin-bottom: 0.75rem;
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: 1.25rem;
	}

	.about-text {
		flex: 1 1 auto;
		min-width: 0;
	}

	.about-text > *:first-child {
		margin-top: 0;
	}

	.about-text > *:last-child {
		margin-bottom: 0;
	}

	.pfp-link {
		flex-shrink: 0;
		display: block;
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

	.about-section::after {
		content: "";
		display: table;
		clear: both;
	}

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
		background: var(--mantle);
		border: 1px solid var(--surface2);
		padding: 0.75rem;
		margin-top: auto;
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

	/* 8-col grid: row 2 = two cards (3 cols each) + contacts (2 cols),
	   row 3 = github (5 cols) + mastodon (3 cols, same as lastfm), so nothing is left
	   empty under the contact cards */
	.live-grid {
		display: grid;
		grid-template-columns: repeat(8, minmax(0, 1fr));
		align-items: stretch;
		gap: 1rem;
		margin-block: 1rem;
	}

	.live-grid > .live-heading {
		grid-column: 1 / 7;
		grid-row: 1;
	}

	.live-grid > .more-heading {
		grid-column: 7 / 9;
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
		grid-column: 1 / 4;
		grid-row: 2;
	}

	.live-stack > :global(.livecard:nth-child(2)) {
		grid-column: 4 / 7;
		grid-row: 2;
	}

	.live-stack > :global(.livecard:nth-child(3)) {
		grid-column: 6 / 9;
		grid-row: 3;
	}

	.live-stack > :global(.livecard:nth-child(4)) {
		grid-column: 1 / 6;
		grid-row: 3;
	}

	.live-grid > .contact-list {
		grid-column: 7 / 9;
		grid-row: 2;
		display: flex;
		flex-direction: column;
		align-self: start;
		gap: 0.75rem;
		min-width: 0;
	}

	.contact-list > :global(.contact-card) {
		flex: 0 0 auto;
		min-height: 0;
	}

	@media (max-width: 55rem) {
		.live-grid {
			grid-template-columns: 1fr;
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

	@media (max-width: 40rem) {
		.live-grid {
			gap: 0.875rem;
		}

		.buttons-section {
			padding-inline: 0.625rem;
		}
	}

	@media (orientation: portrait) {
		.about-section {
			flex-direction: column-reverse;
			text-align: center;
		}

		.pfp {
			width: 150px;
			height: 150px;
			margin: 0.5rem auto;
		}
	}
`;
export default Homepage;
