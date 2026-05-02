import { FC, css } from "dreamland/core";
import { WebButton, ButtonList, CopiedToast } from "../components/Buttons";
import Sidebar from "../components/Sidebar";
import ContactCard from "../components/ContactCard";

function Homepage(this: FC) {
	return (
		<main>
			<title>bomberfish.ca</title>
			<div class="layout-container">
				<Sidebar active="home" />
				<div class="main-content">
					<section class="about-section">
						<a href="/me.png" target="_blank" rel="noopener">
							<img src="/me.min.png" class="pfp" title="my profile picture! click to view full size." width="100" height="100" loading="eager" alt="profile picture" />
						</a>
						<h3>👋 hiya!</h3>
						<p>
							i'm hariz (he/they), a 17 y/o high school student from
							waterloo, canada.
						</p>
						<p>
							i sometimes make <code>use(ful|less)</code> projects, among
							other stuff :3
						</p>
						<p>i used to be involved in the ios jailbreak scene, but i've mostly moved on to other things by now. currently, i'm interested in webdev, UI/UX, embedded systems, and pcb design.</p>
						<p>
							i'm fluent in swift and javascript, and i'm decent at java and most of the C dialects.
						</p>
						<p> 
							i'm also part of{" "}
							<a href="https://mercurywork.shop" target="_blank">
								mercury workshop
							</a>
							, a collective of software developers best known for the{" "}
							<a href="https://sh1mmer.me" target="_blank">
								sh1mmer
							</a>{" "}
							chromebook exploit.
						</p>
					</section>

					<section class="contact-section">
						<h3>get in touch:</h3>
						<div class="card-section">
							<ContactCard contact={{ platform: "email", username: "me@bomberfish.ca", url: "mailto:me@bomberfish.ca", note: "please don't send me unsolicited remote job offers. please." }} />
							<ContactCard contact={{ platform: "discord", username: "@bomberfish", url: "https://discordapp.com/users/470637062870269952", note: "friend requests are subject to some pretty strong vibe-checking." }} />
							<ContactCard contact={{ platform: "signal", username: "@one.337", url: "https://signal.me/#eu/Hj17C2gxd-rMfhgGYLZADiwtnP9y1xDF9waDfQxJudgShHBOqThJXLLHV4ZPmPny", note: "not unless you're absolutely unable to use other methods of communication!" }} />
						</div>
						<h3>socials:</h3>
						<div class="card-section">
							<ContactCard contact={{ platform: "github", username: "bomberfish", url: "https://github.com/bomberfish", note: "where i host most of my code." }} />
							<ContactCard contact={{ platform: "fediverse", username: "@fish@wetdry.world", url: "https://wetdry.world/@fish", note: "follow me on the fediverse, a decentralized social network." }} />
							<ContactCard contact={{ platform: "X", username: "@bomberfish77", url: "https://x.com/bomberfish77", note: "i'm not the most frequent poster, but i still use the platform regularly." }} />
							<ContactCard contact={{ platform: "bluesky", username: "@bomberfish.ca", url: "https://bsky.app/profile/bomberfish.ca", note: "a bridged mirror from my fediverse account." }} />
							<ContactCard contact={{platform: "last.fm", username: "bmbrfsh", url: "https://www.last.fm/user/bmbrfsh", note: "laugh at my bad taste in music if you want to."}} />
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
								(click to copy code! hotlinking strongly encouraged!)
							</subt>
						</div>
						<ButtonList />
					</section>
				</div>
			</div>
		</main>
	);
}

Homepage.style = css`

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

	.main-content {
		width: 820px;
		width: clamp(520px, 36vw - 1rem, 820px);
		max-height: min(60vh, 40rem);
	}

	.pfp {
		float: left;
		width: 100px;
		height: 100px;
		border: 2px solid var(--surface3);
		margin: 0.25rem 1rem 0.5rem 0;
		shape-outside: margin-box;
	}

	.contact-section h3 {
		margin: 0;
		font-size: 1.2rem;
	}

	.buttons-section {
		background: var(--base);
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
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;

		margin-block: 1rem;

		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
	}

	@media (orientation: portrait) {
		.pfp {
			float: none;
			display: block;
			margin: 1rem auto;
		}

		.about-section {
			text-align: center;
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
				<a href="https://github.com/bomberfish" target="_blank" rel="me" referrer-policy="unsafe-url" class="contact-item">github</a>
				<span class="tooltip">bomberfish</span>
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
			<span class="sep">/</span>
			<span class="tooltip-wrapper">
				<a href="https://signal.me/#eu/Hj17C2gxd-rMfhgGYLZADiwtnP9y1xDF9waDfQxJudgShHBOqThJXLLHV4ZPmPny" target="_blank" rel="me" referrer-policy="unsafe-url" class="contact-item">signal</a>
				<span class="tooltip">@one.337</span>
			</span>
			{/* add more links here! */}
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
