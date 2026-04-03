import { dirname, resolve as resolvePath } from "node:path";
import { fileURLToPath } from "node:url";

import { Feed } from "feed";
import { renderSsr } from "dreamland/vite";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import postcss from "postcss";
import autoprefixer from "autoprefixer";
import postCssPresetEnv from "postcss-preset-env";
import cssnano from "cssnano";

import { evaluate } from "@mdx-js/mdx";
import rehypeStarryNight from "rehype-starry-night";
import { all as grammars } from "@wooorm/starry-night";
import * as runtime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";

const __dirname = dirname(fileURLToPath(import.meta.url));
const resolve = (p) => resolvePath(__dirname, p);

const postcssProcessor = postcss([
	postCssPresetEnv({
		features: {},
		browsers: [">= 0.00%"],
		stage: 0,
	}),
	autoprefixer({
		overrideBrowserslist: [">= 0.00%"],
		grid: "autoplace",
	}),
	cssnano(),
]);

function shouldProcessStyleTag(attrs = "") {
	if (/data-no-postcss\b/i.test(attrs)) return false;
	const typeMatch = attrs.match(/\stype\s*=\s*["']?([^"'\s>]+)["']?/i);
	if (typeMatch && !/^(text\/css|application\/postcss)$/i.test(typeMatch[1]))
		return false;
	return true;
}

async function processInlineStyles(html) {
	const styleRegex = /<style([^>]*)>([\s\S]*?)<\/style>/gi;
	let lastIndex = 0;
	let match;
	let output = "";
	let touched = false;

	while ((match = styleRegex.exec(html)) !== null) {
		const [fullMatch, attrs = "", cssContent = ""] = match;
		output += html.slice(lastIndex, match.index);
		lastIndex = match.index + fullMatch.length;

		if (!shouldProcessStyleTag(attrs)) {
			output += fullMatch;
			continue;
		}

		try {
			const processed = await postcssProcessor.process(cssContent, {
				from: undefined,
			});
			output += `<style${attrs}>${processed.css}</style>`;
			touched = true;
		} catch (err) {
			console.warn("failed to postcss inline <style>:", err?.message ?? err);
			output += fullMatch;
		}
	}

	if (lastIndex === 0) return html;
	output += html.slice(lastIndex);

	return output;
}

const entry = await import(resolve("dist/server/main-server.js"));

entry.default("/");
const paths = entry.router.ssgables();

let template = await readFile(resolve("dist/static/index.html"), "utf8");

// Use the exported blog metadata for OG tags
const blogMetadataMap = new Map(
	entry.blogMetadata.map((post) => [post.slug, post])
);

for (const [route, path] of paths) {
	let rendered = await renderSsr(template, () => entry.default(route));

	// Inject OG meta tags for blog posts
	const blogMatch = route.match(/^\/blog\/(.+)$/);
	if (blogMatch) {
		const slug = blogMatch[1];
		const meta = blogMetadataMap.get(slug);
		if (meta) {
			const ogTags = [];
			const fullTitle = `${meta.title}`;
			const ogImage = meta.image
				? `https://bomberfish.ca${meta.image}`
				: "https://bomberfish.ca/me.png";

			ogTags.push(`<meta property="og:title" content="${fullTitle.replace(/"/g, "&quot;")}" />`);
			ogTags.push(`<meta name="twitter:title" content="${fullTitle.replace(/"/g, "&quot;")}" />`);

			ogTags.push(
				`<meta property="og:url" content="https://bomberfish.ca${route}" />`
			);
			ogTags.push(`<meta name="twitter:url" content="https://bomberfish.ca${route}" />`);
			ogTags.push(`<meta name="twitter:domain" content="bomberfish.ca" />`);
			
			ogTags.push(`<meta property="og:type" content="article" />`);

			ogTags.push(`<meta name="twitter:site" content="@bomberfish77" />`);

			if (meta.description) {
				ogTags.push(
					`<meta property="og:description" content="${meta.description.replace(/"/g, "&quot;")}" />`
				);
				ogTags.push(`<meta name="description" content="${meta.description.replace(/"/g, "&quot;")}" />`);
				ogTags.push(`<meta name="twitter:description" content="${meta.description.replace(/"/g, "&quot;")}" />`);
			}

			ogTags.push(`<meta property="og:image" content="${ogImage}" />`);
			ogTags.push(`<meta name="twitter:card" content="summary_large_image" />`);
			ogTags.push(`<meta name="twitter:image" content="${ogImage}" />`);
			
			// Replace the default og:image with the blog-specific one
			rendered = rendered.replace(
				/<meta name="og:image" content="https:\/\/bomberfish\.ca\/me\.png" \/>/,
				ogTags.join("\n\t\t")
			);
		}
	}

	const renderedWithPostcss = await processInlineStyles(rendered);
	console.log(
		`prerendered: ${route}\t${(new TextEncoder().encode(renderedWithPostcss).byteLength / 1024).toFixed(2)}kb`
	);
	let resolved = resolve("dist/static/" + path);
	await mkdir(dirname(resolved), { recursive: true });
	await writeFile(resolved, renderedWithPostcss);
}

// Process static.css with PostCSS in dist/static
// const cssPath = resolve("dist/static/static.css");
// const css = await readFile(cssPath, "utf8");
// const result = await postcssProcessor.process(css, { from: cssPath, to: cssPath });
// await writeFile(cssPath, result.css);
// console.log(`processed: static.css\t${(new TextEncoder().encode(result.css).byteLength / 1024).toFixed(2)}kb`);

await rm(resolve("dist/static/.vite"), { recursive: true });

// Minify typography.css
const typographyCssPath = resolve("dist/static/typography.css");
const typographyCss = await readFile(typographyCssPath, "utf8");
const typographyResult = await postcssProcessor.process(typographyCss, {
	from: typographyCssPath,
	to: typographyCssPath,
});
await writeFile(typographyCssPath, typographyResult.css);
console.log(
	`minified: typography.css\t${(new TextEncoder().encode(typographyCss).byteLength / 1024).toFixed(2)}kb -> ${(new TextEncoder().encode(typographyResult.css).byteLength / 1024).toFixed(2)}kb`
);

const blogURL = "https://bomberfish.ca/blog/";

const mdxComponents = {
	TransitionLink: ({ href, children, className, class: classAttr, ...props }) =>
		createElement(
			"a",
			{ ...props, href, className: className ?? classAttr },
			children
		),
};

function sanitizeMdxForFeed(content) {
	const lines = content.split(/\r?\n/);
	const kept = [];
	let inFence = false;

	for (const line of lines) {
		const trimmed = line.trim();

		if (trimmed.startsWith("```") || trimmed.startsWith("~~~")) {
			inFence = !inFence;
			kept.push(line);
			continue;
		}

		if (
			!inFence &&
			(/^import\s+/.test(trimmed) || /^export\s+const\s+\w+\s*=/.test(trimmed))
		) {
			continue;
		}

		kept.push(line);
	}

	return kept.join("\n").trim();
}

// Helper function to compile MDX content to HTML
async function mdxToHtml(content) {
	const bodyContent = sanitizeMdxForFeed(content);

	const { default: Content } = await evaluate(bodyContent, {
		...runtime,
		rehypePlugins: [[rehypeStarryNight, { grammars }]],
		useMDXComponents: () => mdxComponents,
	});

	const html = renderToStaticMarkup(
		createElement(Content, { components: mdxComponents })
	);

	// Make all relative URLs absolute
	return html
		.replace(/src="\/(?!\/)/g, 'src="https://bomberfish.ca/')
		.replace(/href="\/(?!\/)/g, 'href="https://bomberfish.ca/');
}

const blogModules = await import(resolve("dist/server/main-server.js")).then(
	async () => {
		const { readdir } = await import("node:fs/promises");
		const blogDir = resolve("src/blog");
		const files = await readdir(blogDir);

		const posts = await Promise.all(
			files
				.filter((f) => f.endsWith(".mdx"))
				.map(async (file) => {
					const content = await readFile(resolve(`src/blog/${file}`), "utf-8");
					const match = file.match(/^(\d{4}-\d{2}-\d{2})-(.+)\.mdx$/);
					if (!match) return null;

					const [, date, slug] = match;

					const titleMatch = content.match(
						/export\s+const\s+title\s*=\s*["'](.+?)["']/
					);
					const descMatch = content.match(
						/export\s+const\s+description\s*=\s*["'](.+?)["']/
					);
					const imageMatch = content.match(
						/export\s+const\s+image\s*=\s*["'](.+?)["']/
					);

					// Compile MDX to HTML for full content feed
					let htmlContent = null;
					try {
						htmlContent = await mdxToHtml(content);
						console.log("compiled post:", slug);
					} catch (e) {
						console.warn(`failed to compile ${slug} to HTML:`, e.message);
					}

					return {
						slug,
						date: new Date(date),
						title:
							titleMatch?.[1] ||
							slug
								.split("-")
								.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
								.join(" "),
						description: descMatch?.[1] || "",
						url: `${blogURL}${slug}`,
						image: imageMatch?.[1] || null,
						htmlContent,
					};
				})
		);

		return posts.filter(Boolean).sort((a, b) => b.date - a.date);
	}
);

// Create full content feed
const feed = new Feed({
	title: "bomberfish's blog",
	description: "various assorted thoughts and ramblings.",
	id: blogURL,
	link: blogURL,
	language: "en",
	feedLinks: {
		rss2: "https://bomberfish.ca/feed.xml",
		atom: "https://bomberfish.ca/atom.xml",
		json: "https://bomberfish.ca/feed.json",
	},
	author: { name: "bomberfish", link: "https://bomberfish.ca" },
});

// Create lite feed (no full content, for slow connections)
const feedLite = new Feed({
	title: "bomberfish's blog (lite)",
	description:
		"various assorted thoughts and ramblings. (lite version - titles and descriptions only)",
	id: blogURL,
	link: blogURL,
	language: "en",
	feedLinks: {
		rss2: "https://bomberfish.ca/feed-lite.xml",
		atom: "https://bomberfish.ca/atom-lite.xml",
		json: "https://bomberfish.ca/feed-lite.json",
	},
	author: { name: "bomberfish", link: "https://bomberfish.ca" },
});

for (const post of blogModules) {
	// Full content feed item
	feed.addItem({
		title: post.title,
		id: post.url,
		link: post.url,
		description: post.description,
		content: post.htmlContent || undefined,
		date: post.date,
		image: post.image ? `https://bomberfish.ca${post.image}` : undefined,
	});

	// Lite feed item (no content)
	feedLite.addItem({
		title: post.title,
		id: post.url,
		link: post.url,
		description: post.description,
		content: undefined,
		date: post.date,
		image: post.image ? `https://bomberfish.ca${post.image}` : undefined,
	});
}

// Write full content feeds
await writeFile(resolve("dist/static/feed.xml"), feed.rss2());
console.log("Generated feed.xml (full content).");
await writeFile(resolve("dist/static/atom.xml"), feed.atom1());
console.log("Generated atom.xml (full content).");
await writeFile(resolve("dist/static/feed.json"), feed.json1());
console.log("Generated feed.json (full content).");

// Write lite feeds
await writeFile(resolve("dist/static/feed-lite.xml"), feedLite.rss2());
console.log("Generated feed-lite.xml.");
await writeFile(resolve("dist/static/atom-lite.xml"), feedLite.atom1());
console.log("Generated atom-lite.xml.");
await writeFile(resolve("dist/static/feed-lite.json"), feedLite.json1());
console.log("Generated feed-lite.json.");

console.log("Generated all blog feeds (full and lite versions).");
