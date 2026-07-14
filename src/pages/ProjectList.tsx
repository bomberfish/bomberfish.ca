import { FC, css } from "dreamland/core";
import ProjectCard from "../components/ProjectCard";
import { projects } from "../Projects";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const orderedProjects = [
	...projects
		.filter((project) => project.featured)
		.sort((a, b) => (a.featuredPosition || 0) - (b.featuredPosition || 0)),
	...projects.filter((project) => !project.featured),
];

function ProjectList(this: FC) {
	return (
		<main>
			<title>projects – bomberfish.ca</title>
			<div class="layout-container">
				<Navbar active="projects" />
				<div class="main-content">
					<div class="page-header">
						<h1>projects</h1>
						<p>
							a collection of my major projects, along with various smaller
							utilities, experiments, and explorations.
						</p>
					</div>
					<section class="projects-group">
						{orderedProjects.map((project, index) => (
							<ProjectCard project={project} eager={index < 2} />
						))}
					</section>
				</div>
				<Footer />
			</div>
		</main>
	);
}

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

	/* Firefox-specific masonry implementation.
	 * Detected via the masonry-auto-flow property which is unique to
	 * Firefox's experimental impl (behind layout.css.grid-template-masonry-value.enabled).
	 * https://drafts.csswg.org/css-grid-3/#masonry-auto-flow
	 */
	@supports (masonry-auto-flow: pack) {
		.projects-group {
			display: grid;
			grid-template-columns: repeat(auto-fill, minmax(20rem, 1fr));
			grid-template-rows: masonry;
			masonry-auto-flow: pack;
			align-tracks: start;
			justify-tracks: start;
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
`;

export default ProjectList;
