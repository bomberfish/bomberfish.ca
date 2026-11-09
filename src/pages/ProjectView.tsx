import { FC, css } from "dreamland/core";
import SiteNav from "../components/SiteNav";
import type { ProjectCardDetails } from "../Projects";
import { getWebpPath } from "../lib/images";

function ProjectView(this: FC<{ project: ProjectCardDetails }>) {
	const thumbnail = this.project.getThumbnailPath();
	const image = this.project.getImagePath();
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

	return (
		<main>
			<title>{this.project.title} – bomberfish.ca</title>
			<div class="layout-container">
				<SiteNav active="projects" />
				<div class="main-content">
					<div>
						<div class="page-header">
							<h1>{this.project.title}</h1>
							<p>{this.project.largeDesc}</p>
						</div>
						<section id="details">
							<ul class="compact">
								{this.project.links?.map((link) => (
									<li>
										<a
											class="project-link background-container"
											href={link.url}
											target="_blank"
											referrer-policy="unsafe-url"
										>
											<span class="material-symbols">{link.icon}</span>
											{link.name}
										</a>
									</li>
								))}
							</ul>
						</section>
						<section id="image" class="rain-surface">
							<a href={image}>
								<picture>
									{webpSrcset ? (
										<source type="image/webp" srcset={webpSrcset} />
									) : (
										false
									)}
									<img
										title="Click to open full-size"
										alt={this.project.title}
										src={thumbnail}
										srcset={srcset}
									/>
								</picture>
							</a>
						</section>
					</div>
				</div>
			</div>
		</main>
	);
}

ProjectView.style = css`
	.main-content {
		display: flex;
		align-content: center;
		align-items: center;
		justify-content: center;
	}

	#details {
		margin-bottom: 1rem;
	}

	#image a {
		width: 100%;
		display: flex;
		align-content: center;
		align-items: center;
	}

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
		transform: scale(1.001);
	}

	#image > a > picture,
	#image > a img {
		width: 100%;
		height: auto;
	}

	#details {
		width: 100%;
	}

	#details ul {
		gap: 0.5rem;
		margin: 0;
	}

	#details li::after {
		display: none;
	}

	#details .project-link {
		display: inline-flex;
		align-items: center;
		padding: 0.4rem 0.7rem;
		background: hsla(var(--crust-hsl), 0.65);
		backdrop-filter: blur(6px);
		text-decoration: none;
		transition: background 0.15s ease;
	}

	#details .project-link:hover {
		background: hsla(var(--crust-hsl), 0.85);
	}

	@media (pointer: coarse) {
		#details .project-link {
			min-height: 2.75rem;
		}
	}

	.material-symbols {
		vertical-align: middle;
		padding-right: 0.3rem;
		font-size: 1.2rem;
		padding-bottom: 0.1rem;
	}
`;

export default ProjectView;
