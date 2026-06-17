import { FC, css } from "dreamland/core";
import { WebButton, ButtonList, CopiedToast } from "../components/Buttons";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import ContactCard from "../components/ContactCard";
import LastFmCard from "../components/LastFmCard";
import MastodonCard from "../components/MastodonCard";
import {
	EmailIcon,
	DiscordIcon,
	SignalIcon,
	GitHubIcon,
	XIcon,
	BlueskyIcon,
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
							<h1 class="home-title"><span class="emoji">👋</span>hiya!</h1>
							<p>
								i'm hariz (he/they), a 17 y/o high school student from
								waterloo, canada, and sometimes i make <code>use(ful|less)</code> things.
							</p>
							<p>
								at the moment, you can find me building beautiful web-adjacent stuff at <a href="https://puter.com" target="_blank">puter technologies inc,</a> where i get to work on stuff that really pushes the web platform to its limits!
							</p>
							<p>
								my native languages are swift and javascript, though i'm also decent at java and most of the C dialects.
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
								chromebook exploit. (fun fact: i actually made the current iteration of the group's website too!)
							</p>
							<p>i also used to be really involved in the ios modding and jailbreak scene, so say hi if you recognize me from those circles!</p>
						</div>
						<a href="/me.png" target="_blank" rel="noopener" class="pfp-link">
							<picture>
								<source type="image/webp" srcset="/me.480px.webp" />
								<img src="/me.480px.jpg" class="pfp" title="my profile picture! click to view full size." width="220" height="220" loading="eager" alt="profile picture" />
							</picture>
						</a>
					</section>
					<section class="live-section" id="status">
						<div class="live-grid">
							<h3 class="live-heading">what i'm up to</h3>
							<div class="live-stack">
								<LastFmCard />
								<MastodonCard />
							</div>
							<h3 class="more-heading" id="more-socials-heading">more socials:</h3>
							<div class="contact-list" id="socials" aria-labelledby="more-socials-heading">
								<ContactCard compact contact={{ platform: "github", username: "bomberfish", url: "https://github.com/bomberfish" }}>
									<GitHubIcon />
								</ContactCard>
								<ContactCard compact contact={{ platform: "X", username: "@bomberfish77", url: "https://x.com/bomberfish77" }}>
									<XIcon />
								</ContactCard>
								<ContactCard compact contact={{ platform: "bluesky", username: "@bomberfish.ca", url: "https://bsky.app/profile/bomberfish.ca" }}>
									<BlueskyIcon />
								</ContactCard>
							</div>
						</div>
					</section>
					<section class="contact-section" id="contact-me">
						<h3>get in touch:</h3>
						<div class="card-section">
							<ContactCard contact={{ platform: "email", username: "me@bomberfish.ca", url: "mailto:me@bomberfish.ca", note: "please don't send me unsolicited remote job offers. please." }}>
								<EmailIcon />
							</ContactCard>
							<ContactCard contact={{ platform: "discord", username: "@bomberfish", url: "https://discordapp.com/users/470637062870269952", note: "friend requests are subject to some pretty strong vibe-checking." }}>
								<DiscordIcon />
							</ContactCard>
							<ContactCard contact={{ platform: "signal", username: "@one.337", url: "https://signal.me/#eu/Hj17C2gxd-rMfhgGYLZADiwtnP9y1xDF9waDfQxJudgShHBOqThJXLLHV4ZPmPny", note: "not unless you're absolutely unable to use other methods of communication!" }}>
								<SignalIcon />
							</ContactCard>
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
										navigator.clipboard.writeText('<a href="https://bomberfish.ca/?ref=button" referrerpolicy="unsafe-url" >\n<img src="https://bomberfish.ca/button.gif" alt="BomberFish" title="BomberFish" />\n</a>');
										document.body.appendChild(<CopiedToast />);
									} catch {
										console.error(e);
									}
								}}
							/>
							<subt style="font-size: 0.8em; margin-left: 0.5em;">
								(click to copy code! hotlinking is strongly encouraged, i might change it at any time!)
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
		margin-bottom: .75rem;
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
		font-variation-settings: "ELSH" 80!important;
		transition: font-variation-settings 0.3s ease-in-out;
	}

	h1:hover {
		font-variation-settings: "ELSH" 35!important;
	}

	h1 span.emoji {
		display: inline-block;
		transition: transform 0.3s cubic-bezier(.5,1.3,.86,1.09);
	}

	h1:hover span.emoji {
		transform: rotate(-15deg);
	}

	.about-section::after {
		content: "";
		display: table;
		clear: both;
	}

	.about-section h3 {
		margin: 0 0 0.5rem 0;
		font-size: 1.4rem;
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

	.contact-section h3 {
		margin: 0;
	}

	.contact-section h3 + .card-section {
		margin-top: 0.75rem;
	}

	#more-socials-heading {
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

	.card-section {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 17rem), 1fr));
		align-items: stretch;
		gap: 1rem;
		margin-block: 1rem;
	}

	.live-section h3 {
		margin: 0;
	}

	.live-grid {
		display: grid;
		grid-template-columns: minmax(0, 3fr) minmax(0, 1fr);
		grid-template-rows: auto 1fr;
		align-items: stretch;
		gap: 1rem;
		margin-block: 1rem;
	}

	.live-grid > .live-heading {
		grid-column: 1;
		grid-row: 1;
	}

	.live-grid > .more-heading {
		grid-column: 2;
		grid-row: 1;
		font-size: 1.1rem;
		align-self: end;
	}

	.live-grid > .live-stack {
		grid-column: 1;
		grid-row: 2;
	}

	.live-grid > .contact-list {
		grid-column: 2;
		grid-row: 2;
	}

	.live-stack {
		display: flex;
		flex-direction: row;
		gap: 1rem;
		min-width: 0;
		min-height: 18rem;
	}

	.live-stack > :global(.livecard) {
		flex: 1 1 0;
		min-width: 0;
		width: auto;
	}

	.contact-list {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		min-width: 0;
	}

	.contact-list > :global(.contact-card.compact) {
		flex: 1 1 0;
		min-height: 0;
	}

	@media (max-width: 70rem) {
		.card-section {
			grid-template-columns: repeat(auto-fit, minmax(min(100%, 15.5rem), 1fr));
		}

		.live-grid {
			grid-template-columns: minmax(0, 2.2fr) minmax(0, 1fr);
		}
	}

	@media (max-width: 55rem) {
		.live-grid {
			grid-template-columns: 1fr;
			grid-template-rows: auto;
		}

		.live-grid > .live-heading,
		.live-grid > .more-heading,
		.live-grid > .live-stack,
		.live-grid > .contact-list {
			grid-column: 1;
			grid-row: auto;
		}

		.live-grid > .more-heading {
			align-self: start;
		}

		/* in single-column mode .contact-list has no tall sibling forcing it
		   to stretch, so flex:1 1 0 collapses cards to ~content height. let
		   them size to their content instead. */
		.contact-list > :global(.contact-card.compact) {
			flex: 0 0 auto;
		}
	}

	@media (max-width: 40rem) {
		.card-section {
			grid-template-columns: 1fr;
			gap: 0.875rem;
		}

		.live-grid {
			gap: 0.875rem;
		}

		.live-stack {
			flex-direction: column;
			/* in column mode the 18rem becomes "stack of 2 must share 18rem of
			   height", which clips card content. row-mode floor only. */
			min-height: 0;
		}

		.live-stack > :global(.livecard) {
			/* let each card grow to fit its content instead of fighting over
			   the parent's height — overflow:hidden on lastfm-card otherwise
			   lets it shrink to 0 */
			flex: 0 0 auto;
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

export function ContactLinks(this: FC) {
	return (
		<span class="contact-links">
			<span class="tooltip-wrapper">
				<a href="mailto:me@bomberfish.ca" class="contact-item">email</a>
				<span class="tooltip">me@bomberfish.ca</span>
			</span>
			<span class="sep">/</span>
			<span class="tooltip-wrapper">
				<a href="https://wetdry.world/@fish" target="_blank" rel="me" referrer-policy="unsafe-url" class="contact-item">fediverse</a>
				<span class="tooltip">@fish@wetdry.world</span>
			</span>
			<span class="sep">/</span>
			<span class="tooltip-wrapper">
				<a href="https://x.com/bomberfish77" target="_blank" rel="me" referrer-policy="unsafe-url" class="contact-item">X</a>
				<span class="tooltip">@bomberfish77</span>
			</span>
			<span class="sep">/</span>
			<span class="tooltip-wrapper">
				<a href="https://bsky.app/profile/bomberfish.ca" target="_blank" rel="me" referrer-policy="unsafe-url" class="contact-item">bluesky</a>
				<span class="tooltip">@bomberfish.ca</span>
			</span>
		</span>
	);
}

ContactLinks.style = css`
	:scope {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.25rem;
	}

	.contact-item {
		text-decoration: underline !important;
	}

	.contact-item:after {
		display: none !important;
	}

	.sep {
		color: var(--subtext2);
		margin: 0 0.25rem;
	}
`;


export default Homepage;
