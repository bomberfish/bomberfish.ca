import { Component, css } from "dreamland/core";
import ProjectCard from "../components/ProjectCard";
import { projects } from "../Projects";
import Sidebar from "../components/Sidebar";

const ProjectList: Component<{}, {}> = function () {
	return (
		<main>
			<title>projects – bomberfish.ca</title>
			<div class="layout-container">
				<Sidebar active="projects" />
				<div class="main-content">
					<h2>projects</h2>
					<p>a collection of my major projects, along with various smaller utilities, experiments, and explorations.</p>
						{/* <h3>featured</h3> */}
					<section class="projects-group">
						{projects
							.filter((project) => project.featured)
							.sort(
								(a, b) => (a.featuredPosition || 0) - (b.featuredPosition || 0)
							)
							.map((project) => (
									<ProjectCard project={project} size="large" />
							))}
					{/* </section>
					<h3>other projects</h3>
					<section class="projects-group"> */}
						{projects
							.filter((project) => !project.featured)
							.map((project) => (
								<ProjectCard project={project} size="small" />
							))}
					</section>
				</div>
			</div>
		</main>
	);
};

ProjectList.style = css`
	.projects-group {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		margin-top: 1rem;
	}

	@supports (display: grid) {
		.projects-group {
			display: grid;
			grid-template-columns: repeat(auto-fit, minmax(20rem, 1fr));
			gap: 1rem;
			margin-top: 1rem;
			grid-auto-flow: dense;
		}
	}

	@supports (grid-template-rows: masonry) {
		.projects-group {
			display: grid;
			grid-template-columns: repeat(auto-fill, minmax(20rem, 1fr));
			grid-template-rows: masonry;
			grid-auto-rows: masonry;
			grid-auto-flow: dense;
		}
	}

	@supports (display: masonry) {
		.projects-group {
			display: masonry;
			masonry-auto-flow: next;
			grid-template-columns: repeat(auto-fill, minmax(20rem, 1fr));
		}
	}

	@supports (display: grid-lanes) {
		.projects-group {
			display: grid-lanes;
			grid-template-columns: repeat(auto-fill, minmax(20rem, 1fr));
		}
	}

	@media (orientation: portrait) {
		.projects-group {
			display: flex;
			flex-direction: column;
			gap: 1rem;
		}
	}

	.main-content {
		width: 884px;
		width: clamp(584px, 40vw - 1rem, 884px);
		max-height: min(90vh, 60rem);
	}
	
	hr {
		border: none;
		border-bottom: 1px solid var(--surface3);
		margin: 1rem 0.2rem;
	}

	h3 {
		margin-bottom: 0;
	}
`;

export default ProjectList;
