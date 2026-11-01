import { hydrate } from "dreamland/ssr/client";
import renderApp from "./App";
import { startRain } from "./lib/rain";
import { startPageBg } from "./lib/pageBg";

// TEMP (debugging taps and prod-only failures on the iPhone Duo): with
// ?tapdebug, report startup steps, script errors and pointer/touch/click
// events to the scratch server on :8765. Remove after.
let debugStep = (_step: string) => {};
if (location.search.includes("tapdebug")) {
	const desc = (el: Element | null) =>
		el
			? el.tagName.toLowerCase() +
				(typeof el.className === "string" && el.className
					? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".")
					: "")
			: "null";
	const send = (data: Record<string, unknown>) => {
		new Image().src =
			`http://${location.hostname}:8765/tap?` +
			new URLSearchParams(
				Object.entries(data).map(([k, v]) => [k, String(v)])
			).toString();
	};
	for (const type of [
		"touchstart",
		"touchend",
		"pointerdown",
		"pointerup",
		"pointercancel",
		"click",
	]) {
		document.addEventListener(
			type,
			(e) => {
				const p =
					"changedTouches" in e
						? (e as TouchEvent).changedTouches[0]
						: (e as PointerEvent);
				const x = Math.round(p?.clientX ?? -1);
				const y = Math.round(p?.clientY ?? -1);
				if (y > 120) return; // only the top bar
				send({
					t: type,
					x,
					y,
					target: desc(e.target as Element),
					hit: desc(document.elementFromPoint(x, y)),
					link: (e.target as Element)?.closest?.("a")?.getAttribute("href") ?? "-",
					sy: Math.round(scrollY),
					sx: Math.round(scrollX),
					prevented: e.defaultPrevented,
					cls: document.documentElement.className,
				});
			},
			{ capture: true, passive: true }
		);
	}
	debugStep = (step) =>
		send({ t: step, w: innerWidth, h: innerHeight, cls: document.documentElement.className });
	addEventListener("error", (e) =>
		send({ t: "error", msg: e.message, src: e.filename, line: e.lineno, col: e.colno })
	);
	addEventListener("unhandledrejection", (e) =>
		send({ t: "rejection", msg: String((e as PromiseRejectionEvent).reason) })
	);
	debugStep("start");
}

hydrate(
	renderApp,
	document.querySelector("#app")!,
	document.head,
	document.querySelector("[dlssr-d]")!
);
debugStep("hydrated");

startPageBg();
debugStep("pagebg");
startRain();
debugStep("rain");
