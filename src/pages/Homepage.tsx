import { Component, css } from "dreamland/core";
import { TopNav } from "../components/Header";
import { WebButton, ButtonList, CopiedToast } from "../components/Buttons";
import { Link } from "dreamland/router";
import Footer from "../components/Footer";

const Homepage: Component<{}, {}> = function () {
	return (
		<main>
			{/* <Header /> */}
			<header class="frontpage-header">
			<TopNav />
			<div class="title">
				<a href="/me.png" target="_blank">
					<img src="/pfp-display.gif" class="pfp" title="my profile picture. click to view full color version." />
				</a>
				<h1>bomber<br/>fish.ca</h1>
			</div>
			</header>
				<article>
					<h2>about me</h2>
					<div>
						<section id="about">
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
								<a href="https://mercurywork.shop" target="blank">
									mercury workshop
								</a>
								, a software development collective best known for the{" "}
								<a href="https://sh1mmer.me" target="blank">
									sh1mmer
								</a>{" "}
								chromebook exploit.
							</p>
						</section>
					</div>

					<section>
						<h2>get in touch!</h2>
						{/* i feel like having to explain this is a total ux fail but oh well */}
						<subt>
							(hover for relevant info, underlined items are also hyperlinks)
						</subt>
						<ul class="compact">
							<li>
								<span class="tooltip-wrapper">
									<a href="mailto:me@bomberfish.ca">email</a>
									<span class="tooltip">me@bomberfish.ca</span>
								</span>
							</li>
							<li>
								<span class="tooltip-wrapper">
									<a
										href="https://github.com/BomberFish"
										target="_blank"
										rel="me noopener noreferrer"
									>
										github
									</a>
									<span class="tooltip">@bomberfish</span>
								</span>
							</li>
							<li>
								<span class="tooltip-wrapper">
									<a
										href="https://wetdry.world/@fish"
										target="_blank"
										rel="me noopener noreferrer"
									>
										fediverse
									</a>
									<span class="tooltip">@fish@wetdry.world</span>
								</span>
							</li>
							<li>
								<span class="tooltip-wrapper">
									<a
										href="https://x.com/bomberfish77"
										target="_blank"
										rel="me noopener noreferrer"
									>
										X
									</a>
									<span class="tooltip">@bomberfish77</span>
								</span>
							</li>
							<li>
								<span class="tooltip-wrapper">
									<a
										href="https://bsky.app/profile/bomberfish.ca"
										target="_blank"
										rel="noopener noreferrer"
									>
										bluesky
									</a>
									<span class="tooltip">@bomberfish.ca</span>
								</span>
							</li>
							<li>
								<span class="tooltip-wrapper">
									<a
										href="https://matrix.to/#/@me:bomberfish.ca"
										target="_blank"
										rel="me noopener noreferrer"
									>
										matrix
									</a>
									<span class="tooltip">@me:bomberfish.ca</span>
								</span>
							</li>
							<li>
								<span class="tooltip-wrapper">
									discord
									<span class="tooltip">@bomberfish</span>
								</span>
							</li>
							<li>
								<span class="tooltip-wrapper">
									<a
										href="https://signal.me/#eu/Hj17C2gxd-rMfhgGYLZADiwtnP9y1xDF9waDfQxJudgShHBOqThJXLLHV4ZPmPny"
										target="_blank"
										rel="me noopener noreferrer"
									>
										signal
									</a>
									<span class="tooltip">@one.337</span>
								</span>
							</li>
						</ul>
					</section>
					<br />
					<section id="buttons">
						<div>
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
								(click to copy)
							</subt>
						</div>
						{/* <br /> */}
						<ButtonList />
					</section>
					<Footer />
				</article>
			<div></div>
		</main>
	);
};

Homepage.style = css`
	li {
		margin-bottom: 0.5rem;
	}

	article {
		max-width: calc(100% - 20rem);
	}

	.buttons > div {
		display: flex; 
		align-items: center; 
		height: max(31px,2.25rem); 
		margin-bottom: 0.5rem;
	}

	.pfp {
		/* aspect-ratio: 1/1; */
		/* width: clamp(30rem, 15vw, 8rem); */
		height: 100%;
		max-width: 100%;
		z-index: 1;
		/* position: absolute;
		top: 0;
		left: 0;
		object-fit: cover; */
		z-index: 1;
		image-rendering: pixelated;
	}

	@media (max-width: 960px) or (orientation: portrait) {
		.title {
			flex-direction: column;
		}

		article {
			max-width: 100%;
			width: 100%;
			padding: 0 0.5rem;
		}

		.img-wrapper {
			margin-inline: auto;
		}

		.contact-list > li {
			white-space: normal;
		}
	}

	#buttons {
		width: 100%;
	}
`;

export default Homepage;
