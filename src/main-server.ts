import { render } from "dreamland/ssr/server";
import renderApp from "./App";
import { getBlogMetadata, type BlogModule } from "./lib/blog";

export { router } from "dreamland/router";
export default (path: string) => render(() => renderApp(path));

const blogModules = import.meta.glob<BlogModule>(
	["./blog/*.mdx", "!./blog/draft-*.mdx"],
	{ eager: true }
);

export const blogMetadata = Object.entries(blogModules)
	.map(([path, module]) => getBlogMetadata(path, module))
	.filter((post): post is NonNullable<typeof post> => post !== null)
	.sort((a, b) => b.date.localeCompare(a.date));
