import { Component, css } from "dreamland/core";
import Sidebar from "../components/Sidebar";
import ProjectCardDetails from "../types/Project";

const ProjectView: Component<{ project: ProjectCardDetails }, {}> =
	function () {
		return (
			<main>
				<title>{this.project.title} – bomberfish.ca</title>
				<div class="layout-container">
					<Sidebar active="projects" />
					<div class="main-content">
						<section id="image">
							<img src={this.project.img} />
						</section>
						<section id="details">
							<h1 class="name">{this.project.title}</h1>
							<p class="description">{this.project.largeDesc}</p>
							<ul class="compact">
								{this.project.links?.map((link) => (
									<li>
										<a href={link.url} class="link" target="_blank" rel="noopener">
											<span class="material-symbols">{link.icon}</span>
											{link.name}
										</a>
									</li>
								))}
							</ul>
						</section>
					</div>
				</div>
			</main>
		);
	};

ProjectView.style = css`
	#image {
		display: flex;
		align-content: center;
		align-items: center;
		justify-content: center;
		margin: 0;
		padding: 0;
		position: relative;
		overflow: hidden;
		max-height: 40vh;
	}

	#image img {
		width: 100%;
		height: auto;
		object-fit: contain;
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
	}

	#details {
		width: 100%;
	}

	.material-symbols {
		vertical-align: middle;
		padding-right: 0.3rem;
		font-size: 1.2rem;
		padding-bottom: 0.1rem;
	}
`;

export default ProjectView;
