import { Component, css } from "dreamland/core";
import Header from "../components/Header";
import ProjectCardDetails from "../types/Project";

const ProjectView: Component<{ project: ProjectCardDetails }, {}> =
	function () {
		return (
			<main>
				<title>{this.project.title} – bomberfish.ca</title>
				<Header />
				<article>
					<section id="image">
						<img src={this.project.img} />
					</section>
					<section id="details">
						<h1 class="name">{this.project.title}</h1>
						<p class="description">{this.project.largeDesc}</p>
						<ul class="compact">
							{this.project.links?.map((link) => (
								<li>
									<a href={link.url} target="_blank" rel="noopener">
										{link.name}
									</a>
								</li>
							))}
						</ul>
					</section>
				</article>
			</main>
		);
	};

ProjectView.style = css`
	article {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: center;
		gap: 0;
		flex-grow: 1;
		width: min(50rem, 70vw);
	}

	#image {
		display: flex;
		align-content: center;
		align-items: center;
		justify-content: center;
		margin: 0;
		padding: 0;
		position: relative;
		overflow: hidden;
		/* aspect-ratio: 16 / 9; */
		max-height: 40vh;
		min-width: min(50rem, 70vw);
		object-fit: contain;
		object-position: 0 0;
	}

	#details {
		width: 100%;
		padding-inline: 0.5rem;
		transform: translateY(-0.5rem);
	}

	img {
		max-width: min(50rem, 70vw);
		width: auto;
		border-radius: 0;
		margin: 0;
		padding: 0;
		object-position: 0 0;
	}

	/* #details {
		width: unset;
	} */

	article {
		flex-direction: column;
	}

	img {
		width: 100%;
		max-width: unset;
	}

	#image img {
		mask-image: linear-gradient(
			to bottom,
			rgba(0, 0, 0, 1) 70%,
			rgba(0, 0, 0, 0) 98%
		);
		-webkit-mask-image: linear-gradient(
			to bottom,
			rgba(0, 0, 0, 1) 70%,
			rgba(0, 0, 0, 0) 98%
		);
		mask-mode: alpha;
		-webkit-mask-mode: alpha;
	}

	#image::after {
		content: "";
		position: absolute;
		left: -10%;
		bottom: -10%;
		height: 20%;
		width: 120%;
		pointer-events: none;
		mask-image: linear-gradient(
			to bottom,
			rgba(0, 0, 0, 0) 0%,
			rgba(0, 0, 0, 1) 100%
		);
		mask-mode: alpha;
		-webkit-mask-mode: alpha;
		backdrop-filter: blur(18px);
		-webkit-backdrop-filter: blur(18px);
	}
`;

export default ProjectView;
