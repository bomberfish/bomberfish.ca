// Materials: what a tile is made of. "flat" is Metro as it was on the phone
// and in Windows 8, a rectangle of colour; "acrylic" is Windows 10's frosted
// glass. It's an attribute on <html> (data-m-material), which metro.css
// reads ("Materials"): flat is what there is without it.
//
// The choice is remembered on the device (localStorage, "m-material"). To
// have it in place before the first paint, an app can set the attribute
// from that itself in a script in its <head>; startMetro() sets it either
// way.

import { SSR, root } from "./core";

export type Material = "flat" | "acrylic";

const KEY = "m-material";
const ATTR = "data-m-material";

const known = (value: unknown): value is Material =>
	value === "flat" || value === "acrylic";

/** The material in use. */
export function material(): Material {
	if (SSR) return "flat";
	const value = root().getAttribute(ATTR);
	return known(value) ? value : "flat";
}

/** Use `value` from here on, and (unless told not to) next time too. */
export function setMaterial(value: Material, remember = true) {
	if (SSR) return;
	if (value === "flat") root().removeAttribute(ATTR);
	else root().setAttribute(ATTR, value);
	if (!remember) return;
	try {
		localStorage.setItem(KEY, value);
	} catch {
		// (nowhere to keep it: it lasts as long as the page does)
	}
	dispatchEvent(new CustomEvent("m-material", { detail: value }));
}

/** What was chosen last time, or `fallback`: put in place. */
export function startMaterial(fallback: Material) {
	if (SSR) return;
	let stored: unknown = null;
	try {
		stored = localStorage.getItem(KEY);
	} catch {
		// (no storage)
	}
	setMaterial(known(stored) ? stored : fallback, false);
}
