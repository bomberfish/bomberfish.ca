import { Component, css } from "dreamland/core";
import { WebButton, ButtonList, CopiedToast } from "../components/Buttons";
import Sidebar from "../components/Sidebar";

const Homepage: Component<{}, {}> = function () {
	return (
		<main>
			<title>bomberfish.ca</title>
			<div class="layout-container">
				<Sidebar active="home" />
				<div class="main-content">
					<section class="about-section">
						<div class="about-header">
							<img src="/me.png" class="pfp" title="my profile picture!" />
							<div class="about-text">
								<h2>about me!</h2>
								<p>
									i'm hariz (he/they), a 17 y/o high school student living in
									waterloo, canada.
								</p>
								<p>
									i sometimes make <code>use(ful|less)</code> projects, among
									other stuff :3
								</p>
								<p>
									i'm interested in webdev, frontend design, embedded systems, and
									hardware.
								</p>
							</div>
						</div>
						<p class="about-full">
							i'm fluent in javascript, swift, and c++, and i'm also part of{" "}
							<a href="https://mercurywork.shop" target="_blank">
								mercury workshop
							</a>
							, a software development collective best known for the{" "}
							<a href="https://sh1mmer.me" target="_blank">
								sh1mmer
							</a>{" "}
							chromebook exploit.
						</p>
					</section>

					<section class="contact-section">
						<h2>get in touch!</h2>
						<ContactLinks />
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
										navigator.clipboard.writeText('<a href="https://bomberfish.ca">\n<img src="https://bomberfish.ca/button.gif" alt="BomberFish" title="BomberFish" />\n</a>');
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
};

Homepage.style = css`

	.about-section {
		display: flex;
		flex-direction: column;
	}

	.about-header {
		display: flex;
		gap: 1rem;
		align-items: flex-start;
	}

	.pfp-link {
		flex-shrink: 0;
	}

	.pfp-link:after {
		display: none !important;
	}

	.pfp {
		width: 100px;
		height: 100px;
		border: 2px solid var(--surface3);
		margin-top: 0.35rem;
	}

	.about-text {
		flex: 1;
	}

	.about-text h2 {
		margin: 0 0 0.5rem 0;
		font-size: 1.4rem;
	}

	.about-text p {
		font-size: 0.95rem;
		line-height: 1.5;
	}

	.about-full {
		font-size: 0.95rem;
		line-height: 1.5;
	}

	.contact-section h2 {
		margin: 0 0 0.25rem 0;
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

	@media (orientation: portrait) {
		.about-header {
			flex-direction: column;
			align-items: center;
			text-align: center;
		}

		.about-text {
			text-align: center;
		}
	}
`;

export const ContactLinks: Component<{}, {}> = function () {
	return (
		<span class="contact-links">
			<a href="mailto:me@bomberfish.ca" class="contact-item">email</a>
			<span class="sep">/</span>
			<a href="https://github.com/BomberFish" target="_blank" rel="me noopener noreferrer" class="contact-item">github</a>
			<span class="sep">/</span>
			<a href="https://wetdry.world/@fish" target="_blank" rel="me noopener noreferrer" class="contact-item">fediverse</a>
			<span class="sep">/</span>
			<a href="https://x.com/bomberfish77" target="_blank" rel="me noopener noreferrer" class="contact-item">X</a>
			<span class="sep">/</span>
			<a href="https://bsky.app/profile/bomberfish.ca" target="_blank" rel="noopener noreferrer" class="contact-item">bluesky</a>
		</span>
	);
};

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
