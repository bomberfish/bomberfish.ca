import { hydrate } from "dreamland/ssr/client";
import renderApp from "./App";
import { startRain } from "./lib/weather/rain";
import { startSky } from "./lib/weather/sky";
import { startWeather } from "./lib/weather/index";
import { startPageBg } from "./lib/pageBg";
import { startAccent } from "./lib/accent";
import { metroReady, startMetro } from "metro-dreamland";

startAccent();
// before hydrating: its popstate listener has to be ahead of the router's
startMetro({
	outlet: "#app main",
	host: "#app",
	// (behind the home page's panorama: src/lib/pageBg.ts)
	photo: ".page-bg-photo",
	cover: ".page-bg-grain",
	pivots: ["/projects", "/blog", "/siteinfo"],
	// (metro-dreamland's own tiles are flat; this site's are glass, unless
	// someone's said otherwise on the about page. index.html has it in place
	// before the first paint.)
	material: "acrylic",
});

hydrate(
	renderApp,
	document.querySelector("#app")!,
	document.head,
	document.querySelector("[dlssr-d]")!
);

startPageBg();
// (the weather first: the sky and the rain both go by it)
startWeather();
startSky();
startRain();
metroReady();
