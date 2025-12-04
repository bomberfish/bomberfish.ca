import { dirname, resolve as resolvePath } from "node:path";
import { fileURLToPath } from "node:url";

import { Feed } from "feed";
import { renderSsr } from "dreamland/vite";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import postcss from 'postcss';
import autoprefixer from 'autoprefixer';
import postCssPresetEnv from 'postcss-preset-env';
import cssnano from 'cssnano';

const __dirname = dirname(fileURLToPath(import.meta.url));
const resolve = (p) => resolvePath(__dirname, p);

const entry = await import(resolve("dist/server/main-server.js"));

entry.default("/");
const paths = entry.router.ssgables();

let template = await readFile(resolve("dist/static/index.html"), "utf8");

for (const [route, path] of paths) {
	const rendered = await renderSsr(template, () => entry.default(route));
	console.log(
		`prerendered: ${route}\t${(new TextEncoder().encode(rendered).byteLength / 1024).toFixed(2)}kb`
	);
	let resolved = resolve("dist/static/" + path);
	await mkdir(dirname(resolved), { recursive: true });
	await writeFile(resolved, rendered);
}

// Process static.css with PostCSS in dist/static
const cssPath = resolve("dist/static/static.css");
const css = await readFile(cssPath, "utf8");
const result = await postcss([
	postCssPresetEnv({
		features: {},
		browsers: [">= 0.00%"],
		stage: 0
	}),
	autoprefixer({
		overrideBrowserslist: [">= 0.00%"],
		grid: "autoplace"
	}),
	cssnano(),
]).process(css, { from: cssPath, to: cssPath });
await writeFile(cssPath, result.css);
console.log(`processed: static.css\t${(new TextEncoder().encode(result.css).byteLength / 1024).toFixed(2)}kb`);

await rm(resolve("dist/static/.vite"), { recursive: true });

const blogURL = "https://bomberfish.ca/blog/";

const blogModules = await import(resolve("dist/server/main-server.js")).then(async () => {
    const { readdir } = await import("node:fs/promises");
    const blogDir = resolve("src/blog");
    const files = await readdir(blogDir);
    
    const posts = await Promise.all(
        files
            .filter(f => f.endsWith(".mdx"))
            .map(async (file) => {
                const content = await readFile(resolve(`src/blog/${file}`), "utf-8");
                const match = file.match(/^(\d{4}-\d{2}-\d{2})-(.+)\.mdx$/);
                if (!match) return null;
                
                const [, date, slug] = match;
                
                const titleMatch = content.match(/export\s+const\s+title\s*=\s*["'](.+?)["']/);
                const descMatch = content.match(/export\s+const\s+description\s*=\s*["'](.+?)["']/);
				const imageMatch = content.match(/export\s+const\s+image\s*=\s*["'](.+?)["']/);
				
				console.log("got post:", slug);
                
                return {
                    slug,
                    date: new Date(date),
                    title: titleMatch?.[1] || slug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
                    description: descMatch?.[1] || "",
                    url: `${blogURL}${slug}`,
					image: imageMatch?.[1] || null,
                };
            })
    );
    
    return posts.filter(Boolean).sort((a, b) => b.date - a.date);
});

const feed = new Feed({
    title: "bomberfish's blog",
	description: "articles about various projects i'm working on, along with an occasional rant or two.",
	id: blogURL,
	link: blogURL,
	language: 'en',
	feedLinks: {
		rss2: 'https://bomberfish.ca/feed.xml',
		atom: 'https://bomberfish.ca/atom.xml',
		json: 'https://bomberfish.ca/feed.json',
	},
	author: { name: "bomberfish", link: "https://bomberfish.ca" },
});

for (const post of blogModules) {
	feed.addItem({
		title: post.title,
		id: post.url,
		link: post.url,
		description: post.description,
		date: post.date,
		image: post.image ? `https://bomberfish.ca${post.image}` : undefined,
	});
}

await writeFile(resolve("dist/static/feed.xml"), feed.rss2());
console.log("Generated feed.xml.");
await writeFile(resolve("dist/static/atom.xml"), feed.atom1());
console.log("Generated atom.xml.");
await writeFile(resolve("dist/static/feed.json"), feed.json1());
console.log("Generated feed.json.");

console.log("Generated all blog feeds.");
