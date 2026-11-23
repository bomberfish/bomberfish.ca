import { Page, PageHeader, Tiles } from "../metro-dreamland";
import { FC } from "dreamland/core";
import ProjectTile from "../components/ProjectTile";
import { projects } from "../Projects";
import SiteNav, { Pivot } from "../components/SiteNav";
import Footer from "../components/Footer";

const orderedProjects = [
	...projects
		.filter((project) => project.featured)
		.sort((a, b) => (a.featuredPosition || 0) - (b.featuredPosition || 0)),
	...projects.filter((project) => !project.featured),
];

// Every project as a tile: the featured ones large, the rest wide (square
// on a phone). Styles: "Tiles" in metro-dreamland/metro.css, "Projects" in
// src/style.css.
function ProjectList(this: FC) {
	return (
		<Page kind="pivot">
			<title>projects – bomberfish.ca</title>
			<div class="layout-container">
				<SiteNav active="projects" />
				<div class="main-content">
					<PageHeader>
						<Pivot active="projects" />
						<p data-m-content data-m-feather>
							a collection of my major projects, along with various smaller
							utilities, experiments, and explorations.
						</p>
					</PageHeader>
					<Tiles as="section" class="projects-group" data-m-content>
						{orderedProjects.map((project, index) =>
							project.featured ? (
								<ProjectTile
									project={project}
									w={4}
									h={2}
									pw={4}
									ph={2}
									eager={index < 3}
								/>
							) : (
								<ProjectTile project={project} w={2} h={1} pw={2} ph={2} />
							)
						)}
					</Tiles>
				</div>
				<div data-m-content>
					<Footer />
				</div>
			</div>
		</Page>
	);
}

export default ProjectList;
