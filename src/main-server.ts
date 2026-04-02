import { render } from "dreamland/ssr/server";
import renderApp from "./App";

export { router } from "dreamland/router";
export default (path: string) => render(() => renderApp(path));

// Export blog metadata for prerendering (OG tags, RSS feeds)
const blogModules = import.meta.glob("./blog/*.mdx", { eager: true }) as Record<
	string,
	any
>;

export const blogMetadata = Object.entries(blogModules)
	.map(([path, mod]) => {
		const match = path.match(/\/(\d{4}-\d{2}-\d{2})-(.+)\.mdx$/);
		if (!match) return null;

		const [, date, slug] = match;
		return {
			slug,
			date: new Date(date),
			title:
				mod.title ||
				slug
					.split("-")
					.map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
					.join(" "),
			description: mod.description || "",
			image: mod.image || null,
		};
	})
	.filter((post): post is NonNullable<typeof post> => post !== null)
	.sort((a, b) => b.date.getTime() - a.date.getTime());
