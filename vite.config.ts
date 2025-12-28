import { defineConfig } from "vite";
import { devSsr } from "dreamland/vite";
import { compile } from "@mdx-js/mdx";

import { literalsHtmlCssMinifier } from "@literals/rollup-plugin-html-css-minifier";
import legacy from "@vitejs/plugin-legacy";
import htmlMinifier from 'vite-plugin-html-minifier'

import rehypeStarryNight from "rehype-starry-night";
import { all as grammars } from "@wooorm/starry-night";
import { visit } from "estree-util-visit";

import postCssPresetEnv from "postcss-preset-env";
import autoprefixer from "autoprefixer";

import { readFile } from "fs/promises";
import { execSync } from "child_process";

async function compileMdx(content: string, name?: string) {
	const compiled = await compile(content, {
		outputFormat: "program",
		jsxImportSource: "dreamland",
		rehypePlugins: [[rehypeStarryNight, { grammars }]],
		recmaPlugins: [
			() => (tree) =>
				visit(tree, (node) => {
					// this is scuffed but works. no idea why mdx doesn't support using class
					if (
						node.type === "CallExpression" &&
						node.callee.type === "Identifier" &&
						node.callee.name.startsWith("_jsx") &&
						node.arguments[1]?.type === "ObjectExpression"
					) {
						for (let prop of node.arguments[1].properties) {
							if (
								prop.type === "Property" &&
								prop.key.type === "Identifier" &&
								prop.key.name === "className"
							) {
								prop.key.name = "class";
							}
						}
					}
				}),
		],
	});

	return `
		${compiled.toString().replace("export default", "export")}

		export ${name ? `function ${name}()` : `default function Page()`} {
			const {wrapper: MDXLayout} = this.components || ({});
			return (
				MDXLayout 
					? _jsx(MDXLayout, { children: [_createMdxContent(this)], ...this })
					: _createMdxContent(this)
			)
		}
	`;
}

export default defineConfig({
	plugins: [
		literalsHtmlCssMinifier({
			include: ["src/**/*.tsx"],
		}),
		devSsr({
			entry: "/src/main-server.ts",
		}),
		legacy({
			targets: ["fully supports es6"],
		}),
		// htmlMinifier({
		// 	minify: {
		// 		collapseWhitespace: true,
		// 		keepClosingSlash: true,

		// 		removeComments: false,
		// 		removeRedundantAttributes: false,
		// 		removeScriptTypeAttributes: false,
		// 		removeStyleLinkTypeAttributes: false,
		// 		removeEmptyAttributes: false,
		// 		useShortDoctype: false,
		// 		minifyCSS: false,
		// 		minifyJS: false,
		// 		minifyURLs: false,
		// 	},
		// }),
		{
			name: "mdx-dreamland",
			enforce: "pre",
			async load(id) {
				if (id.endsWith(".mdx")) {
					const content = await readFile(id, "utf-8");

					return {
						code: await compileMdx(content),
						loader: "jsx",
					};
				}
			},
		},
	],
	define: {
		__APP_VERSION__: JSON.stringify(process.env.npm_package_version),
		__BUILD_DATE__: JSON.stringify(new Date().toISOString()),
		__COMMIT_HASH__: JSON.stringify(execSync('git rev-parse --short HEAD').toString().trim()),
	},
	build: {
		target: "es2015",
		// cssMinify: "lightningcss",
		minify: "terser",
		terserOptions: {
			ecma: 2015,
			format: {
				comments: false,
			},
		},
		sourcemap: true,
		rolldownOptions: {
			output: {
				generatedCode: {
					preset: "es2015",
				}
			}
		}
	},
	css: {
		postcss: {
			plugins: [
				postCssPresetEnv({
					features: {},
					browsers: [">= 0.00%"],
					stage: 0
				}),
				autoprefixer({
					overrideBrowserslist: [">= 0.00%"],
					grid: "autoplace"
				}),
			]
		}
	}
});
