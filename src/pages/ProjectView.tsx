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
						<div class="project-view-container">
							<section id="image">
								<a href={this.project.img}><img title="Click to open full-size" alt={this.project.title} src={this.project.img} /><img hidden class="blur" src={this.project.img} /></a>
								
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
				</div>
			</main>
		);
	};

ProjectView.style = css`
    .main-content {
		width: 884px;
		width: clamp(584px, 40vw - 1rem, 884px);
		min-height: min(60vh, 70rem);
		display: flex;
		align-content: center;
		align-items: center;
		justify-content: center;
	}

	/* .project-view-container {
		max-height: 60%;
	} */

	#image {
		display: flex;
		align-content: center;
		align-items: center;
		justify-content: center;
		margin: 0;
		padding: 0;
		position: relative;
		overflow: visible;
		width: 100%;
	}

	#image > a > img {
		width: 100%;
		height: auto;
	}

	#image .blur {
		display: block;
		position: absolute;
		top: .5%;
		left: 50%;
		transform: translateX(-50%);
		width: auto;
		height: 100%;
		filter: blur(12px) contrast(1.5) brightness(0.8) opacity(0.225);
		overflow: visible;
		z-index: -1;
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
