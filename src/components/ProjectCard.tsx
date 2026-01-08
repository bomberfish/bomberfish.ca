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
			? ` ${this.project.startYear}`
			: ` ${this.project.startYear} — ${this.project.endYear}`
		: ` ${this.project.startYear} — present`;

	return (
		<div class="project-card-wrapper" on:click={handleCardClick}>
			<TransitionLink
				href={`/projects/${this.project.lastPathComponent}`}
				class={`project-card card interactable ${this.size}`}
				style="text-decoration: none; color: inherit;"
				data-card-link
				class:no-image={!hasImage}
			>
					<div class="image-wrapper">
						<img src={this.project.img} alt="" loading="eager" />
					</div>
					<div class="project-info">
						<p class="project-year">
							<span class="material-symbols">calendar_month</span>
							{yearDisplay}
							{this.project.featured ? (
								<span class="featured-indicator">
									•
									<span class="material-symbols">trophy</span>{" "}
									Featured
								</span>
							) : null}
						</p>
						<h3 class="project-title">{this.project.title}</h3>
						<p class="project-description">{this.project.blurb}</p>
					</div>
			</TransitionLink>
		</div>
	);
};

ProjectCard.style = css<typeof ProjectCard>`
	:scope, :scope:visited {
		width: 100%;
		background: var(--base);
		border: 1px solid var(--surface3);
		overflow: hidden;
		font-size: 0.9rem;
		text-decoration: none!important;
		transform: scale(1) translateY(0);
		transition: transform 0.2s, border-color 0.2s;
		z-index: 10;
	}

	:scope:hover {
		border-color: var(--overlay0);
		transform: scale(1.01) translateY(-2px);
	}

	:scope:hover h1 {
		text-decoration: underline!important;
	}

	@media (orientation: portrait) {
		:scope {
			width: 100%;
		}
	}
	
	.project-info {
		padding: 1rem;
		padding-top: 0.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.project-description,
	.project-year {
		color: var(--subtext1)!important;
	}

	.featured-indicator {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding-left: 0.25rem;
	}

	p {
		font-size: 0.8rem;
	}

	* {
		margin: 0!important;
		text-decoration: none  !important;
	}

	.image-wrapper {
		aspect-ratio: 16 / 9;
		overflow: hidden;
	}

	@supports (grid-template-rows: masonry) or (display: masonry) or (display: grid-lanes) {
		.image-wrapper {
			aspect-ratio: auto;
			overflow: visible;
		}
	}

	img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		border-bottom: 1px solid var(--surface0);
	}

	h1 {
		font-size: 1.15rem;
	}
`;

export default ProjectCard;
