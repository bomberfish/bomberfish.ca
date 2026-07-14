import { FC, css } from "dreamland/core";
import Navbar from "../components/Navbar";
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
				<Navbar active="projects" />
				<div class="main-content">
					<div>
						<section id="details" class="background-container page-header">
							<h1>{this.project.title}</h1>
							<p>{this.project.largeDesc}</p>
							<ul class="compact">
								{this.project.links?.map((link) => (
									<li>
										<a
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
						<section id="image">
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

	.material-symbols {
		vertical-align: middle;
		padding-right: 0.3rem;
		font-size: 1.2rem;
		padding-bottom: 0.1rem;
	}
`;

export default ProjectView;
