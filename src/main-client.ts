import { hydrate } from "dreamland/ssr/client";
import renderApp from "./App";

hydrate(
	renderApp,
	document.querySelector("#app")!,
	document.head,
	document.querySelector("[dlssr-d]")!
);
