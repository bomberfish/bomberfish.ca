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
				<section class="projects-group" id="featured">
					{projects
						.filter((project) => project.featured)
						.sort(
							(a, b) => (a.featuredPosition || 0) - (b.featuredPosition || 0)
						)
						.map((project) => (
							<ProjectCard project={project} size="large" />
						))}
				</section>
				<section class="projects-group" id="other">
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
		grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
		gap: 0.7rem;
		margin-top: 1rem;
	}
`;

export default ProjectList;
