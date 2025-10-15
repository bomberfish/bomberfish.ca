import { Component, css } from "dreamland/core";
import Header from "../components/Header";
import ProjectCardDetails from "../types/Project";

const ProjectView: Component<{ project: ProjectCardDetails }, {}> =
	function () {
		return (
			<main>
				<Header />
				<article>
					<section id="image">
						<img src={this.project.img} />
					</section>
					<section id="details">
						<h2 class="name">{this.project.title}</h2>
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
		gap: 2rem;
		flex-grow: 1;
	}

	#image {
		display: flex;
		align-content: center;
		margin: 0;
		padding: 0;
	}

	#details {
		width: 100%;
	}

	img {
		max-width: min(40rem, 50vw);
		width: auto;
		max-height: 100%;
		border-radius: 0.5rem;
		margin: 0;
		padding: 0;
	}

	@media (max-width: 680px) or (orientation: portrait) {
		#details {
			width: unset;
		}

		article {
			flex-direction: column;
		}

		img {
			width: 100%;
		}
	}
`;

export default ProjectView;
