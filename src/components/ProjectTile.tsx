import { FC } from "dreamland/core";
import type { ProjectCardDetails } from "../Projects";
import { getWebpPath } from "../lib/images";
import { Tile, TileBack, TileFront, TileLabel } from "metro-dreamland";

// A project as a live tile: its picture and name on the front, the years
// and the one-line pitch on the back (metro-dreamland turns it over every so
// often, and whenever it's pointed at). `w` x `h` is its size in tile
// units, `pw` x `ph` the same on the home page's phone layout; `small`
// tiles leave the pitch off the back.
// Styles: "Tiles" in metro-dreamland/metro.css, "Projects" in src/style.css.
function ProjectTile(
	this: FC<{
		project: ProjectCardDetails;
		w?: number;
		h?: number;
		pw?: number;
		ph?: number;
		eager?: boolean;
		small?: boolean;
	}>
) {
	const project = this.project;
	const thumbnail = project.getThumbnailPath();
	const thumbnailWebp = getWebpPath(thumbnail);
	const years =
		typeof project.endYear === "number"
			? project.endYear === project.startYear
				? `${project.startYear}`
				: `${project.startYear} — ${project.endYear}`
			: `${project.startYear} — present`;
	const w = this.w ?? 2;
	const h = this.h ?? 1;

	return (
		<Tile
			to={`/projects/${project.lastPathComponent}`}
			class={`project-tile${this.small ? " small" : ""}${w >= 4 ? " large" : ""}`}
			w={w}
			h={h}
			pw={this.pw ?? w}
			ph={this.ph ?? h}
			flip
		>
			<TileFront>
				{thumbnail ? (
					<picture
						class="tile-image"
						data-m-keep={`project:${project.lastPathComponent}`}
					>
						{thumbnailWebp ? (
							<source type="image/webp" srcset={thumbnailWebp} />
						) : (
							false
						)}
						<img
							src={thumbnail}
							alt=""
							loading={this.eager ? "eager" : "lazy"}
						/>
					</picture>
				) : (
					false
				)}
				<TileLabel data-m-keep={`project-title:${project.lastPathComponent}`}>
					{project.title}
				</TileLabel>
			</TileFront>
			<TileBack color="accent">
				<span class="project-year">
					{years}
					{project.featured ? (
						<span class="featured-indicator">
							<span class="material-symbols">trophy</span>
							featured
						</span>
					) : (
						false
					)}
				</span>
				<span
					class="project-title"
					data-m-keep={`project-title:${project.lastPathComponent}`}
				>
					{project.title}
				</span>
				{this.small ? (
					false
				) : (
					<span class="project-description">{project.blurb}</span>
				)}
			</TileBack>
		</Tile>
	);
}

export default ProjectTile;
