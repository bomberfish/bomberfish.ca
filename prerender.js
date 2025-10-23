import { dirname, resolve as resolvePath } from "node:path";
import { fileURLToPath } from "node:url";

import { renderSsr } from "dreamland/vite";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import postcss from 'postcss';
import autoprefixer from 'autoprefixer';
import postCssPresetEnv from 'postcss-preset-env';

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
	autoprefixer({
		overrideBrowserslist: [">= 0.00%"],
		grid: "autoplace"
	}),
	postCssPresetEnv({
		features: {},
		browsers: [">= 0.00%"],
		stage: 0
	}),
]).process(css, { from: cssPath, to: cssPath });
await writeFile(cssPath, result.css);
console.log(`processed: static.css\t${(new TextEncoder().encode(result.css).byteLength / 1024).toFixed(2)}kb`);

await rm(resolve("dist/static/.vite"), { recursive: true });
