import { Button, Page, PageHeader } from "../metro-dreamland";
import { FC } from "dreamland/core";
import SiteNav from "../components/SiteNav";
import Footer from "../components/Footer";
import type { ProjectCardDetails } from "../Projects";
import { getWebpPath } from "../lib/images";

// One project: its name as the page title, what it is, where to find it,
// and a picture. Styles: "Projects" in src/style.css.
function ProjectView(this: FC<{ project: ProjectCardDetails }>) {
	const project = this.project;
	const thumbnail = project.getThumbnailPath();
	const image = project.getImagePath();
	const srcset = thumbnail
		? `${thumbnail} 1x${image && image !== thumbnail ? `, ${image} 2x` : ""}`
		: undefined;
	// Build a parallel WebP srcset for the <source>. Only emit the
	// <source> when the originals are JPEGs we converted.
	const webpThumbnail = getWebpPath(thumbnail);
	const webpImage = getWebpPath(image);
	const webpSrcset = webpThumbnail
		? `${webpThumbnail} 1x${
				webpImage && webpImage !== webpThumbnail ? `, ${webpImage} 2x` : ""
			}`
		: undefined;
	const years =
		typeof project.endYear === "number"
			? project.endYear === project.startYear
				? `${project.startYear}`
				: `${project.startYear} — ${project.endYear}`
			: `${project.startYear} — present`;

	return (
		<Page kind="page">
			<title>{project.title} – bomberfish.ca</title>
			<div class="layout-container">
				<SiteNav active="projects" inside />
				<div class="main-content project-view">
					<PageHeader data-m-feather>
						{/* (the title and the picture are the tile's, kept through
						    the change: data-m-keep, continuum) */}
						<h1
							class="post-title"
							data-m-keep={`project-title:${project.lastPathComponent}`}
						>
							{project.title}
						</h1>
						<p class="project-meta">
							{years}
							{project.featured ? <span> · featured</span> : false}
						</p>
						<p class="project-desc">{project.largeDesc}</p>
					</PageHeader>
					<section id="details" data-m-feather>
						{project.links?.map((link) => (
							<Button
								href={link.url}
								class="project-link"
								target="_blank"
								referrer-policy="unsafe-url"
							>
								<span class="material-symbols">{link.icon}</span>
								{link.name}
							</Button>
						))}
					</section>
					{thumbnail ? (
						<section id="image" class="rain-surface" data-m-feather>
							<a href={image} data-m-tilt>
								<picture data-m-keep={`project:${project.lastPathComponent}`}>
									{webpSrcset ? (
										<source type="image/webp" srcset={webpSrcset} />
									) : (
										false
									)}
									<img
										title="Click to open full-size"
										alt={project.title}
										src={thumbnail}
										srcset={srcset}
									/>
								</picture>
							</a>
						</section>
					) : (
						false
					)}
				</div>
				<Footer />
			</div>
		</Page>
	);
}

export default ProjectView;
