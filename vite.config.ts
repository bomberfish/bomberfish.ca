import { defineConfig } from "vite";
import { devSsr } from "dreamland/vite";
import { compile } from "@mdx-js/mdx";

import rehypeStarryNight from "rehype-starry-night";
import { all as grammars } from "@wooorm/starry-night";
import { visit } from "estree-util-visit";

import { readFile } from "fs/promises";
import { execSync } from "child_process";

import { literalsHtmlCssMinifier } from "@literals/rollup-plugin-html-css-minifier";
import postCssPresetEnv from "postcss-preset-env";
import colorHslaFallback from "postcss-color-hsla-fallback";
import postcss from "postcss";

import cssnanoPlugin from "cssnano";
import litePreset from "cssnano-preset-lite";
import calc from "postcss-calc";
import normalizeCharset from "postcss-normalize-charset";
import mergeLonghand from "postcss-merge-longhand";
import discardComments from "postcss-discard-comments";
import svgo from "postcss-svgo";
import uniqueSelectors from "postcss-unique-selectors";
import convertValues from "postcss-convert-values";
import cssDeclarationSorter from "css-declaration-sorter";
import mergeRules from "postcss-merge-rules";
import minifyParams from "postcss-minify-params";
import minifySelectors from "postcss-minify-selectors";
import discardDuplicates from "postcss-discard-duplicates";

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
		// legacy({
		// 	targets: ["fully supports es6"],
		// }),
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
					console.log("Compiling MDX file:", id);
					const content = await readFile(id, "utf-8");
					return {
						code: await compileMdx(content),
						loader: "jsx",
					};
				}
			},
		},
		{
			name: "postcss-hsla-fallback",
			enforce: "post",
			async generateBundle(_, bundle) {
				for (const [fileName, chunk] of Object.entries(bundle)) {
					if (fileName.endsWith(".css") && chunk.type === "asset" && typeof chunk.source === "string") {
						console.log("Processing bundled CSS for HSLA fallbacks:", fileName);
						const result = await postcss([colorHslaFallback(),cssnanoPlugin({preset: litePreset})]).process(chunk.source, { from: fileName });
						chunk.source = result.css;
					}
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
		target: "chrome79",
		cssTarget: "ie11",
		cssMinify: false,
		minify: "terser",
		terserOptions: {
			ecma: 2015,
			compress: {
				drop_console: true,
				arguments: true,
				// passes: 3,
				unsafe: true,
				unsafe_comps: true,
				unsafe_Function: true,
				unsafe_math: true,
				unsafe_proto: true,
				unsafe_regexp: true,
				unsafe_undefined: true,
			},
			mangle: {
				eval: true,
				safari10: true,
			},
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
			},
			treeshake: true,
		},
		// cssMinify: "lightningcss"
	},
	css: {
		postcss: {
			plugins: [
				postCssPresetEnv({
					features: {},
					browsers: [">= 0.00%"],
					stage: 2,
					autoprefixer: {
						overrideBrowserslist: [">= 0.00%"],
						grid: "autoplace",
						remove: false,
					},
				}),
				cssnanoPlugin({
					preset: litePreset,
					plugins: [
						calc, 
						normalizeCharset, 
						mergeLonghand, 
						discardComments, 
						svgo, 
						uniqueSelectors, 
						convertValues, 
						cssDeclarationSorter, 
						mergeRules, 
						minifyParams, 
						minifySelectors,
						discardDuplicates
					],
				}),
			]
		},
		// lightningcss: {
		// 	targets:  {
		// 		chrome: 4,
		// 		firefox: 2,
		// 		ie: 6,
		// 		safari: 3,
		// 		edge: 12,
		// 		ios_saf: 3,
		// 		opera: 10,
		// 		android: 2,
		// 		samsung: 0
		// 	}
		// }
	}
});
