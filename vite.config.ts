import { defineConfig } from "vite";
import { devSsr } from "dreamland/vite";
import { literalsHtmlCssMinifier } from "@literals/rollup-plugin-html-css-minifier";
import legacy from "@vitejs/plugin-legacy";
import postCssPresetEnv from "postcss-preset-env";
import autoprefixer from "autoprefixer";

export default defineConfig({
	plugins: [
		literalsHtmlCssMinifier({
			include: ["src/**/*.tsx"],
		}),
		devSsr({
			entry: "/src/main-server.ts",
		}),
		legacy({
			targets: ["supports es6"],
		}),
	],
	define: {
		__APP_VERSION__: JSON.stringify(process.env.npm_package_version),
	},
	build: {
		target: "es2015",
		cssMinify: "lightningcss",
		minify: "terser",
		terserOptions: {
			ecma: 2015,
			format: {
				comments: false,
			},
			compress: {
				arguments: true,
				passes: 3,
				unsafe: true,
				unsafe_proto: true,
				unsafe_math: true,
				unsafe_regexp: true,
			},
			mangle: true,
		},
		sourcemap: true,
		rolldownOptions: {
			treeshake: true,
			logLevel: "info",
			optimization: {
				inlineConst: {
					mode: "smart",
					pass: 3
				}
			},
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
					browsers: ["fully supports es6"],
					stage: 0
				}),
				autoprefixer({
					overrideBrowserslist: ["fully supports es6"],
					grid: "autoplace"
				}),
			]
		}
	}
});
