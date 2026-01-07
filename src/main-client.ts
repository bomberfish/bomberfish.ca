import { hydrate } from "dreamland/ssr/client";
import App from "./App";

hydrate(
	App,
	document.querySelector("#app")!,
	document.head,
	document.querySelector("[dlssr-d]")!
);


document.querySelectorAll(".router-link").forEach((el) => {
	el.setAttribute("target", "_self");
});

document.querySelector("#app")!.replaceWith(App());
