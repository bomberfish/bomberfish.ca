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
						<a href="/me.png" target="_blank" rel="noopener">
							<img src="/me.min.png" class="pfp" title="my profile picture! click to view full size." alt="profile picture" />
						</a>
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
						<p>
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

	.about-section::after {
		content: "";
		display: table;
		clear: both;
	}

	.about-section h2 {
		margin: 0 0 0.5rem 0;
		font-size: 1.4rem;
	}

	.about-section p {
		font-size: 0.95rem;
		line-height: 1.5;
		margin: 0 0 0.5rem 0;
	}

	.main-content {
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
		.pfp {
			float: none;
			display: block;
			margin: 0 auto 1rem auto;
		}

		.about-section {
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
