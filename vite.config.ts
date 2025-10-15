import { defineConfig } from "vite";
import { devSsr } from "dreamland/vite";
import { literalsHtmlCssMinifier } from "@literals/rollup-plugin-html-css-minifier";
import legacy from "@vitejs/plugin-legacy";

export default defineConfig({
	plugins: [
		literalsHtmlCssMinifier({
			include: ["src/**/*.tsx"],
		}),
		devSsr({
			entry: "/src/main-server.ts",
		}),
		legacy({
			targets: ["defaults", "blackberry 10"],
		}),
	],
	define: {
		__APP_VERSION__: JSON.stringify(process.env.npm_package_version),
	},
	build: {
		target: "es2015",
	}
});
