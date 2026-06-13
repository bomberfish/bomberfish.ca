import { FC, css } from "dreamland/core";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { ProjectCardDetails } from "../Projects";

function ProjectView(this: FC<{ project: ProjectCardDetails }>) {
	const thumbnail = this.project.getThumbnailPath();
	const image = this.project.getImagePath();
	const srcset = thumbnail
		? `${thumbnail} 1x${image && image !== thumbnail ? `, ${image} 2x` : ""}`
		: undefined;

	return (
		<main>
			<title>{this.project.title} – bomberfish.ca</title>
			<div class="layout-container">
				<Navbar active="projects" />
				<div class="main-content">
					<div class="project-view-container">
						<section id="details" class="background-container page-header">
							<h1 class="name">{this.project.title}</h1>
							<p class="description">{this.project.largeDesc}</p>
							<ul class="compact">
								{this.project.links?.map((link) => (
									<li>
										<a
											href={link.url}
											class="link"
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
								<img
									title="Click to open full-size"
									alt={this.project.title}
									src={thumbnail}
									srcset={srcset}
								/>
								<img hidden class="blur" src={thumbnail} srcset={srcset} />
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

	/* .project-view-container {
		max-height: 60%;
	} */

	h2 {
		margin-bottom: 0.2em!important;
	}

	#image a {
		width: 100%;
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

	#image > a > img {
		width: 100%;
		height: auto;
	}

	#image .blur {
		display: block;
		position: absolute;
		top: .5%;
		left: 50%;
		transform: translateX(-50%);
		width: auto;
		height: 100%;
		filter: blur(12px) contrast(1.5) brightness(0.8) opacity(0.225);
		overflow: visible;
		z-index: -1;
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
