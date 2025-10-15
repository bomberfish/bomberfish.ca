import { Component, css } from "dreamland/core";
import ProjectCardDetails from "../types/Project";
import { Link } from "dreamland/router";
import { router } from "../main-server";

const ProjectCard: Component<
	{ project: ProjectCardDetails; size: "small" | "large" },
	{}
> = function () {
	return (
		<div class={`project-card card interactable ${this.size}`} class:no-image={!this.project.img} on:click={(e: MouseEvent) => {
			console.log(e.target);
			if ((e.target as HTMLElement).tagName.toLowerCase() !== "div") {
				// let the link handle the click if one was clicked
				return;
			}
			router.navigate(`projects/${this.project.lastPathComponent}`);
		}}>
			<Link href={`projects/${this.project.lastPathComponent}`} class="fill-link">
				<div class="content">
					<h3 class="name">{this.project.title}</h3>
					<p class="description">{this.project.blurb}</p>
				</div>
			</Link>
		</div>
	);
};

ProjectCard.style = css<typeof ProjectCard>`
	:scope {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		justify-content: flex-end;
		text-align: left;
		gap: 0.5rem;
		min-height: clamp(10rem, 24vw, 12rem);
		padding: 1rem;
		position: relative;
		background: var(--card-surface);
		border-radius: 0.5rem;
		overflow: hidden;
		transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
		box-shadow:
			0 4px 6px -1px var(--shadow-medium),
			0 2px 4px -1px var(--shadow-soft);
		backdrop-filter: blur(8px);
		cursor: pointer;
		color: inherit;
	}

	:scope > .fill-link {
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
		align-items: flex-start;
		width: 100%;
		height: 100%;
		text-decoration: none !important;
		color: inherit;
		position: relative;
	}

	:scope.small {
		min-height: clamp(6rem, 20vw, 8rem);
	}

	:scope.no-image {
		min-height: clamp(5rem, 18vw, 6rem);
		justify-content: center;
	}

	:scope:hover {
		box-shadow:
			0 25px 50px -12px var(--shadow-ultra),
			0 0 0 1px var(--shadow-highlight);
		background: var(--card-surface-hover);
	}

	:scope::before {
		content: "";
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: linear-gradient(
			to top,
			rgba(0, 0, 0, 0.4) 0%,
			transparent 60%,
			transparent 100%
		);
		backdrop-filter: blur(4px);
		mask-image: linear-gradient(to top, black 0%, transparent 60%);
		z-index: 1;
		transition: opacity 0.25s ease;
		opacity: 1;
	}

	:scope:hover::before {
		opacity: 0.8;
	}

	:scope::after {
		content: "";
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-color: var(--card-overlay);
		background-image: ${(s) =>
			use(s.project).map((p) => (p && p.img ? `url("${p.img}")` : "none"))};
		background-size: cover;
		background-position: center;
		filter: saturate(1.2) brightness(0.8);
		z-index: -1;
		transition: all 0.25s ease;
	}

	:scope:hover::after {
		transform: scale(1.01);
		filter: saturate(1.5) brightness(0.975);
	}

	.content {
		transform: translateY(0);
		transition: transform 0.25s ease;
		margin: 0;
		position: relative;
		z-index: 2;
	}

	*, .content, .name, .description {
		text-decoration: none !important;
		text-decoration-style: solid !important;
	}

	:scope:hover .content {
		transform: translateY(-0.1rem);
	}

	:scope:hover .name {
		text-shadow:
			0 2px 8px rgba(0, 0, 0, 0.4),
			0 -0.5px 1px rgba(0, 0, 0, 0.2);
	}

	.name {
		font-size: clamp(1.1rem, 1.2vw + 1rem, 1.5rem);
		font-weight: 700;
		color: var(--text-on-dark);
		margin: 0;
		text-shadow: 0 2px 8px var(--shadow-strong);
		line-height: 1.2;
		transition: text-shadow 0.25s ease;
	}

	.fill-link:hover .description {
		text-shadow:
			0 1px 4px rgba(0, 0, 0, 0.4),
			0 -0.5px 1px rgba(0, 0, 0, 0.2);
		opacity: 1;
	}

	.description {
		font-size: clamp(0.9rem, 0.4vw + 0.8rem, 0.95rem);
		color: color-mix(in srgb, var(--text-on-dark) 90%, transparent);
		text-shadow: 0 1px 4px var(--shadow-medium);
		line-height: 1.4;
		opacity: 0.95;
		transition:
			opacity 0.25s ease,
			text-shadow 0.25s ease;
	}

	@media (prefers-reduced-motion: reduce) {
		:scope {
			transition: none;
		}

		:scope:hover {
			transform: none;
		}

		:scope::after {
			transition: none;
		}

		:scope:hover::after {
			transform: none;
		}
	}
`;

export default ProjectCard;
