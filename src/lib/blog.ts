import type { Component } from "dreamland/core";

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

export function getBlogPathInfo(path: string) {
	const match = path.match(/\/(\d{4}-\d{2}-\d{2})-(.+)\.mdx$/);
	if (!match) return null;

	return { date: match[1], slug: match[2] };
}

export function createBlogMetadata(
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
