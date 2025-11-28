import { Component, css } from "dreamland/core";
import ProjectCard from "../components/ProjectCard";
import { projects } from "../Projects";
import Header from "../components/Header";

const ProjectList: Component<{}, {}> = function () {
	return (
		<main>
			<title>projects – bomberfish.ca</title>
			<Header />
			<article>
				<h2>projects</h2>
				<p>a collection of my work and experiments.</p>
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
			</article>
		</main>
	);
};


ProjectList.style = css`
	article {
		max-width: 1440px;
		margin: 0 auto;
		padding: 2rem 1rem;
	}

	.projects-group {
		display: flex;
		flex-direction: column;
		margin-top: 2rem;
	}
	
	hr {
		border: none;
		border-bottom: 1px dashed var(--border);
		margin: 1rem 0.2rem;
	}

	h3 {
		margin-bottom: 0;
	}
`;

export default ProjectList;
