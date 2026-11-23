import type { Component } from "dreamland/core";
import { getWebpPath } from "./images";

export interface BlogModule {
	default: Component<{ components?: Record<string, unknown> }>;
	title?: unknown;
	description?: unknown;
	tags?: unknown;
	image?: unknown;
}

export interface BlogPostMetadata {
	slug: string;
	date: string;
	title: string;
	description?: string;
	tags?: string[];
	image?: string;
}

function getBlogPathInfo(path: string) {
	const match = path.match(/\/(?:draft-)?(\d{4}-\d{2}-\d{2})-(.+)\.mdx$/);
	if (!match) return null;

	return { date: match[1], slug: match[2] };
}

function createBlogMetadata(
	slug: string,
	date: string,
	module: BlogModule
): BlogPostMetadata {
	const fallbackTitle = slug
		.split("-")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");

	return {
		slug,
		date,
		title: typeof module.title === "string" ? module.title : fallbackTitle,
		description:
			typeof module.description === "string" ? module.description : undefined,
		tags:
			Array.isArray(module.tags) &&
			module.tags.every((tag): tag is string => typeof tag === "string")
				? module.tags
				: undefined,
		image: typeof module.image === "string" ? module.image : undefined,
	};
}

export function getBlogMetadata(path: string, module: BlogModule) {
	const info = getBlogPathInfo(path);
	return info ? createBlogMetadata(info.slug, info.date, module) : null;
}

// Every post's metadata, newest first. (App.tsx globs the same modules for
// the routes; eager, so they're the same module objects.)
const blogModules = import.meta.glob<BlogModule>("../blog/*.mdx", {
	eager: true,
});

export const blogPosts: BlogPostMetadata[] = Object.entries(blogModules)
	.map(([path, module]) => getBlogMetadata(path, module))
	.filter((post): post is NonNullable<typeof post> => post !== null)
	.sort((a, b) => b.date.localeCompare(a.date));

// A post's cover as custom properties, for CSS to use as a background:
// --cover-image (the JPEG) and, when there's a WebP beside it,
// --cover-image-set for browsers that take image-set() with type() hints.
export function coverStyle(image: string | undefined): Record<string, string> {
	if (!image) return {};
	const style: Record<string, string> = {
		"--cover-image": `url("${image}")`,
	};
	const webp = getWebpPath(image);
	if (webp) {
		style["--cover-image-set"] =
			`image-set(url("${webp}") type("image/webp"), url("${image}") type("image/jpeg"))`;
	}
	return style;
}

const MONTHS = [
	"jan",
	"feb",
	"mar",
	"apr",
	"may",
	"jun",
	"jul",
	"aug",
	"sep",
	"oct",
	"nov",
	"dec",
];

/** "2026-11-08" in pieces. Split by hand: no Date, no time zones. */
export function postDateParts(date: string) {
	const [year, month, day] = date.split("-");
	return { year, month: MONTHS[Number(month) - 1] ?? month, day };
}

/** "8 nov 2026" */
export function formatPostDate(date: string) {
	const { year, month, day } = postDateParts(date);
	return `${Number(day)} ${month} ${year}`;
}
