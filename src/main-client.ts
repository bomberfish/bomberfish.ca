import { hydrate } from "dreamland/ssr/client";
import renderApp from "./App";
import { startRain } from "./lib/rain";
import { startPageBg } from "./lib/pageBg";

hydrate(
	renderApp,
	document.querySelector("#app")!,
	document.head,
	document.querySelector("[dlssr-d]")!
);

startPageBg();
startRain();
