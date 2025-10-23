import { Component, css } from "dreamland/core";
import ProjectCard from "../components/ProjectCard";
import { projects } from "../Projects";
import Header from "../components/Header";

const ProjectList: Component<{}, {}> = function () {
	return (
		<main>
			<Header />
			<article>
				<h2>projects</h2>
				<section class="projects-group">
					{projects
						.filter((project) => project.featured)
						.sort(
							(a, b) => (a.featuredPosition || 0) - (b.featuredPosition || 0)
						)
						.map((project) => (
							<ProjectCard project={project} size="large" />
						))}
					{projects
						.filter((project) => !project.featured)
						.map((project) => (
							<ProjectCard project={project} size="small" />
						))}
				</section>
			</article>
		</main>
	);
};

ProjectList.style = css`
	.projects-group {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
		gap: 0.7rem;
		margin-top: 1rem;
		grid-auto-flow: dense;
	}


	@supports (grid-template-rows: masonry) and (grid-template-columns: masonry) {
		.projects-group {
			grid-template-rows: masonry;
			grid-auto-rows: masonry;
			grid-template-columns: masonry;
			grid-auto-columns: 1fr;
			grid-auto-flow: dense;
			display: grid;
		}
	}

	@supports (grid-template-rows: masonry) {
		.projects-group {
			grid-template-rows: masonry;
			grid-auto-rows: masonry;
		}
	}

	@supports (grid-template-columns: masonry) {
		.projects-group {
			grid-template-columns: masonry;
			grid-auto-columns: 1fr;
		}
	}

	@supports (grid-template-rows: masonry) and (not (grid-template-columns: masonry)) {
		.projects-group {
			grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		}
	}

	@supports (display: masonry) {
		.projects-group {
			display: masonry;
			masonry-auto-flow: next;
			grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		}
	}
`;

export default ProjectList;
