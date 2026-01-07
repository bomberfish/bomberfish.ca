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
					<section class="projects-group">
						<h3>featured</h3>
						{projects
							.filter((project) => project.featured)
							.sort(
								(a, b) => (a.featuredPosition || 0) - (b.featuredPosition || 0)
							)
							.map((project) => (
								<>
									<ProjectCard project={project} size="large" />
									<hr />
								</>
							))}
					</section>
					<section class="projects-group">
						<h3>other projects</h3>
						{projects
							.filter((project) => !project.featured)
							.map((project) => (
								<>
									<ProjectCard project={project} size="small" />
									<hr />
								</>
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
		flex-direction: column;
		margin-top: 1rem;
	}
	
	hr {
		border: none;
		border-bottom: 1px dotted var(--surface3);
		margin: 1rem 0.2rem;
	}

	h3 {
		margin-bottom: 0;
	}
`;

export default ProjectList;
