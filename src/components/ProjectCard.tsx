import { Component, css } from "dreamland/core";
import ProjectCardDetails from "../types/Project";
import TransitionLink from "./TransitionLink";

const ProjectCard: Component<
	{ project: ProjectCardDetails; size: "small" | "large" },
	{}
> = function () {

	const handleCardClick = (event: MouseEvent) => {
		if (
			event.defaultPrevented ||
			event.button !== 0 ||
			event.metaKey ||
			event.ctrlKey ||
			event.shiftKey ||
			event.altKey
		) {
			return;
		}

		const target = event.target as HTMLElement | null;
		if (target?.closest("a")) {
			return;
		}

		const card = event.currentTarget as HTMLElement | null;
		const link = card?.querySelector("a[data-card-link]") as HTMLAnchorElement | null;
		if (!link) return;

		const syntheticClick = new MouseEvent("click", {
			bubbles: true,
			cancelable: true,
			composed: true,
		});
		link.dispatchEvent(syntheticClick);
	};

	const hasImage = Boolean(this.project.img);
	const yearDisplay = typeof this.project.endYear === "number"
		? this.project.endYear === this.project.startYear
			? `${this.project.startYear}`
			: `${this.project.startYear} — ${this.project.endYear}`
		: `${this.project.startYear} — present`;

	return (
		<div class="project-card-wrapper" on:click={handleCardClick}>
			<TransitionLink
				href={`/projects/${this.project.lastPathComponent}`}
				class={`project-card card interactable ${this.size}`}
				style="display: flex; text-decoration: none;"
				data-card-link
				class:no-image={!hasImage}
			>
				<div class="project-info">
					<p class="project-year">{yearDisplay}</p>
					<h3 class="project-title">{this.project.title}</h3>
					<p class="project-description">{this.project.blurb}</p>
				</div>
				<div class="project-visual" aria-hidden={hasImage ? "true" : "false"}>
					{hasImage ? (
						<img src={this.project.img} alt="" loading="eager" />
					) : (
						<span>View project</span>
					)}
				</div>
			</TransitionLink>
		</div>
	);
};

ProjectCard.style = css<typeof ProjectCard>`
	:scope {
		width: 100%;
	}

	:scope:hover img {
		transform: scale(1.05);
		filter: saturate(1.1) brightness(1.05);
	}

	.project-card-wrapper {
		width: 100%;
	}

	.project-card {
		display: flex;
		width: 100%;
		align-items: flex-start;
		justify-content: space-between;
		gap: clamp(1.25rem, 4vw, 5rem);
		padding: clamp(1rem, 0.8rem + 0.5vw, 1.5rem) 0;
		background: transparent;
		box-shadow: none;
		backdrop-filter: none;
		text-decoration: none !important;
		border-bottom: 1px solid transparent;
		color: inherit;
		position: relative;
	}

	* {
		text-decoration: none !important;
	}


	:scope:hover h3 {
		text-decoration: underline !important;
		text-decoration-color: var(--subtext1) !important;
	}

	.project-card::after {
		content: "";
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		height: 1px;
		background: linear-gradient(
			90deg,
			color-mix(in srgb, var(--overlay0) 0%, transparent) 0%,
			color-mix(in srgb, var(--overlay1) 45%, transparent) 40%,
			color-mix(in srgb, var(--overlay1) 45%, transparent) 60%,
			color-mix(in srgb, var(--overlay0) 0%, transparent) 100%
		);
		pointer-events: none;
	}

	.project-card-wrapper:first-of-type .project-card {
		border-top: 1px solid color-mix(in srgb, var(--overlay1) 45%, transparent);
	}

	.project-card-wrapper:last-of-type .project-card::after {
		opacity: 0;
	}

	.project-card:hover .project-title {
		color: var(--accent);
	}

	.project-info {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		flex: 1 1 auto;
		min-width: 0;
		margin-right: clamp(1rem, 3vw, 2.5rem);
		justify-content: center;
	}

	.project-year {
		margin: 0;
		font-size: 0.9rem;
		color: var(--subtext2);
	}

	.project-title {
		margin: 0;
		font-size: clamp(1.25rem, 1rem + 1.5vw, 1.9rem);
		font-weight: 700;
		color: var(--supertext);
	}

	.project-description {
		margin: 0;
		max-width: 60ch;
		color: var(--text);
		opacity: 0.95;
		font-size: clamp(0.95rem, 0.85rem + 0.2vw, 1.05rem);
	}

	.project-visual {
		flex-shrink: 0;
		width: clamp(200px, 28vw, 320px);
		aspect-ratio: 2 / 1;
		background: color-mix(in srgb, var(--surface2) 80%, transparent);
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
		overflow: hidden;
		clip-path: polygon(7% 0%, 100% 0%, 93% 100%, 0% 100%);
		box-shadow: 0 16px 38px -16px var(--shadow-ultra);
		transition:
			transform 0.45s ease,
			box-shadow 0.45s ease,
			border-color 0.3s ease,
			background 0.3s ease;
	}

	.project-card:hover .project-visual {
		transform: perspective(850px) rotateY(-3deg) translateY(-4px) scale(1.015);
		box-shadow: 0 24px 50px -14px var(--shadow-ultra);
		border-color: color-mix(in srgb, var(--overlay1) 70%, transparent);
		background: color-mix(in srgb, var(--surface3) 85%, transparent);
	}

	.project-visual img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: transform 0.4s ease, filter 0.4s ease;
		filter: saturate(0.8) brightness(0.75);
	}

	.project-visual span {
		font-size: 0.8rem;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: var(--subtext0);
	}

	.project-card.no-image .project-visual {
		border-style: dashed;
		clip-path: polygon(8% 0%, 100% 0%, 92% 100%, 0% 100%);
		transform: none;
		box-shadow: none;
	}

 
`;

export default ProjectCard;
