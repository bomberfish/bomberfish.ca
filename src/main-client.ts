console.log("hiiii :3");
import { hydrate } from "dreamland/ssr/client";
import { oneko } from "./Oneko";
import App from "./App";

oneko();

hydrate(
	App,
	document.querySelector("#app")!,
	document.head,
	document.querySelector("[dlssr-d]")!
);
// document.querySelector("#app")!.replaceWith(App());
