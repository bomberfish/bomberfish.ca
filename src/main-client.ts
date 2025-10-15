console.log("hiiii :3");
import { hydrate } from "dreamland/ssr/client";
import { oneko } from "./Oneko";
import App from "./App";
import cssVars from "css-vars-ponyfill";

oneko();

cssVars({
	watch: true
});

hydrate(
	App,
	document.querySelector("#app")!,
	document.head,
	document.querySelector("[dlssr-d]")!
);
// document.querySelector("#app")!.replaceWith(App());
