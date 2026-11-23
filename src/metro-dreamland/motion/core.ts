// metro-dreamland: motion. The plumbing every part of it shares: what the
// package is told about the app it's in (configure), the curves and
// timings, and the two or three things all of it needs to ask (is anything
// to move at all; which element is the page).

/** True where there's no document (the server's render): nothing here runs. */
export const SSR: boolean =
	(import.meta as { env?: { SSR?: boolean } }).env?.SSR ??
	typeof window === "undefined";

/** What the app tells the package about itself. All of it has a default. */
export interface MetroConfig {
	/**
	 * The page that's showing: the router's outlet, the element with
	 * data-m-page (what <Page> renders).
	 */
	outlet: string;
	/** What the pages are swapped inside of: watched for one taking another's place. */
	host: string;
	/**
	 * Behind a panorama, if there's anything: a picture that pans slower than
	 * everything else, and something as wide as the background has to be.
	 */
	photo: string;
	cover: string;
	/**
	 * What the pointer's light falls on (Reveal), or false for none. It's
	 * acrylic's: nothing's lit while the material is flat.
	 */
	reveal: string | false;
	/**
	 * What tiles are made of until someone chooses (setMaterial): "flat",
	 * Metro's own, or "acrylic", Windows 10's glass.
	 */
	material: "flat" | "acrylic";
	/**
	 * The paths of the pages that are faces of one pivot, besides the ones a
	 * <Pivot> has said it leads to: for the back button, to which they're
	 * one place (it matters after a reload on a page inside one of them,
	 * when no pivot has been drawn yet to say so).
	 */
	pivots: string[];
}

export const config: MetroConfig = {
	outlet: "[data-m-page]",
	host: "body",
	photo: '[data-m-layer="photo"]',
	cover: '[data-m-layer="cover"]',
	reveal: ".tile",
	material: "flat",
	pivots: [],
};

/** Set any of MetroConfig. Before startMetro(), or as its argument. */
export function configure(options: Partial<MetroConfig> = {}) {
	Object.assign(config, options);
	for (const p of config.pivots) pivotPaths.add(norm(p));
}

/** The pages known to be faces of a pivot (see MetroConfig.pivots). */
export const pivotPaths = new Set<string>();
export const isPivot = (p: string) => pivotPaths.has(norm(p));

export const root = () => document.documentElement;
export const pageEl = () => document.querySelector<HTMLElement>(config.outlet);
export const hostEl = () =>
	document.querySelector<HTMLElement>(config.host) ?? document.body;
export const norm = (p: string) =>
	p.replace(/\.html$/, "").replace(/\/+$/, "") || "/";

/** Shared between the parts: a page change is under way. */
export const flags = { busy: false };

// ---------------------------------------------------------------------------
// Timing
// ---------------------------------------------------------------------------

// Windows' own curves: things arrive fast and settle for a long time, and
// leave by accelerating away (the phone used exponential eases for these).
export const EASE_OUT = "cubic-bezier(0.1, 0.9, 0.2, 1)";
export const EASE_IN = "cubic-bezier(0.7, 0, 1, 0.5)";
export const EASE_IN_OUT = "cubic-bezier(0.45, 0, 0.15, 1)";
// lands a touch past flat and comes back: a tile springing up on release
export const EASE_SPRING = "cubic-bezier(0.2, 0.9, 0.3, 1.3)";

export const OUT_MS = 260;
export const IN_MS = 420;

// Turnstile angles (rotateY, hinge on the left edge). Both pages turn the
// same way round, which is what makes it a turnstile: going forward the old
// page swings out towards you and the new one comes round from behind;
// going back it all runs the other way.
export const TOWARDS = -50;
export const AWAY = 80;

export const reduceMotion = SSR
	? null
	: matchMedia("(prefers-reduced-motion: reduce)");
export const still = () => !!reduceMotion?.matches;

// ---------------------------------------------------------------------------
// Animation plumbing
// ---------------------------------------------------------------------------

// Transition animations in flight or holding their last frame. They hold
// (fill: both) so a page that has swung out stays out until the next one is
// in place; release() then drops them and the element is back to its own
// styles, which matters because the router keeps pages and reuses them.
export const held = new Set<Animation>();

export function play(
	el: Element,
	frames: Keyframe[],
	timing: KeyframeAnimationOptions
): Promise<void> {
	if (still() || typeof el.animate !== "function") return Promise.resolve();
	let anim: Animation;
	try {
		anim = el.animate(frames, { fill: "both", ...timing });
	} catch {
		return Promise.resolve();
	}
	held.add(anim);
	return new Promise<void>((resolve) => {
		anim.onfinish = anim.oncancel = () => resolve();
	});
}

export function release(scope?: Element | null) {
	for (const anim of held) {
		const target = (anim.effect as KeyframeEffect | null)?.target;
		if (scope && target && !scope.contains(target)) continue;
		held.delete(anim);
		anim.cancel();
	}
}

export const all = (list: (Promise<void> | false | null | undefined)[]) =>
	Promise.all(list.filter(Boolean) as Promise<void>[]).then(() => {});

export const onScreen = (r: DOMRect) =>
	r.width > 0 &&
	r.height > 0 &&
	r.bottom > 0 &&
	r.right > 0 &&
	r.top < innerHeight &&
	r.left < innerWidth;
