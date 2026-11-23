// The site's accent colour: one of its own four, taken from my profile
// picture and the photo behind the page, one of Windows Phone 8's twenty, or
// one of the visitor's own making (hue, saturation and lightness: the about
// page has sliders for it), picked on the about page and remembered (a
// dreamland store, `remembered`, below). Applying one sets three custom
// properties on <html> (their defaults, for midnight, are in style.css):
//
//   --accent-hsl       the colour itself, for tiles and other fills
//   --accent-text-hsl  the same hue lifted until it reads on black, for
//                      links and other accent-coloured type (cobalt or
//                      crimson as they come are too dark to read there)
//   --on-accent        the ink for type on an accent fill: white, or black
//                      on the light ones (lime, yellow, amber)
//
// An accent takes the photo behind the page with it as well: the photo's
// own hue (found from the photo: photoHue) is turned round to the accent's,
// by as many degrees as they're apart (--bg-turn, and --bg-filter, a CSS
// hue-rotate() on the photo's layer that does it; style.css). All but the
// default, midnight, which is the photo's own blue: there it's left alone.
//
// index.html has a tiny script that re-applies the remembered values before
// the first paint, so a chosen accent never flashes the default first.

import { createStore } from "dreamland/util";

export interface Accent {
	name: string;
	hex: string;
}

export const ACCENTS: Accent[] = [
	// the site's own:
	// the blue of the photo behind the page, taken deep (the default)
	// (stronger than it looks on a tile: tiles are glass, 40% of their
	// colour over the photo, and this is what comes out there as the deep
	// blue it was, #1f4e8c, when tiles were solid)
	{ name: "midnight", hex: "#1766d3" },
	// ...and at full strength, which is also Windows 8's own blue
	{ name: "azure", hex: "#2d89ef" },
	// the pale blue of the light behind me in the picture
	{ name: "frost", hex: "#8ec9f6" },
	// the picture's one warm colour
	{ name: "peach", hex: "#e9a97c" },
	// Windows Phone 8's:
	{ name: "lime", hex: "#a4c400" },
	{ name: "green", hex: "#60a917" },
	{ name: "emerald", hex: "#008a00" },
	{ name: "teal", hex: "#00aba9" },
	{ name: "cyan", hex: "#1ba1e2" },
	{ name: "cobalt", hex: "#0050ef" },
	{ name: "indigo", hex: "#6a00ff" },
	{ name: "violet", hex: "#aa00ff" },
	{ name: "pink", hex: "#f472d0" },
	{ name: "magenta", hex: "#d80073" },
	{ name: "crimson", hex: "#a20025" },
	{ name: "red", hex: "#e51400" },
	{ name: "orange", hex: "#fa6800" },
	{ name: "amber", hex: "#f0a30a" },
	{ name: "yellow", hex: "#e3c800" },
	{ name: "brown", hex: "#825a2c" },
	{ name: "olive", hex: "#6d8764" },
	{ name: "steel", hex: "#647687" },
	{ name: "mauve", hex: "#76608a" },
	{ name: "taupe", hex: "#87794e" },
];

export const DEFAULT_ACCENT = "midnight";

/** The name of the accent that's the visitor's own colour. */
export const CUSTOM_ACCENT = "custom";

export type Hsl = [h: number, s: number, l: number];

/**
 * What a custom accent's sliders run between. Lightness stops short of both
 * ends: black tiles on a black page, or white ones, are no accent at all.
 */
export const CUSTOM_RANGE: { min: Hsl; max: Hsl } = {
	min: [0, 0, 20],
	max: [360, 100, 85],
};

// What's remembered between visits: a dreamland store, which keeps itself
// as one record in localStorage ("dls-accent") and writes it out whenever
// any of this changes. index.html's script reads that record too, before
// anything else has loaded: hsl, text, ink and turn are what it wants, as
// they go on <html>. Plain values only (the store merges what it finds
// over these, and can't merge into a null).
const remembered = createStore(
	{
		/** the accent in use: a name from ACCENTS, "custom", or "" (the default) */
		name: "",
		/** its three custom property values ("" for the default: the stylesheet's) */
		hsl: "",
		text: "",
		ink: "",
		/** the visitor's own colour as "h,s,l", once they've made one, whichever accent is in use */
		custom: "",
		/** how far the photo behind the page is turned for it, in degrees */
		turn: 0,
	},
	{
		ident: "accent",
		autosave: "auto",
		// localStorage, where there is one and it will: not on the server,
		// and a private window can refuse (then it lasts as long as the tab).
		// A record that isn't JSON is as good as none, and mustn't be handed
		// on to be parsed: that would throw as this module loads.
		backing: {
			read(ident) {
				// (Node has a localStorage of its own these days, which
				// complains at being asked)
				if (import.meta.env.SSR) return undefined;
				try {
					const record = localStorage.getItem(ident) ?? undefined;
					if (record) JSON.parse(record);
					return record;
				} catch {
					return undefined;
				}
			},
			write(ident, record) {
				if (import.meta.env.SSR) return;
				try {
					localStorage.setItem(ident, record);
				} catch {
					// (private mode)
				}
			},
		},
	}
);

const channels = (hex: string) =>
	[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);

function toHsl(hex: string): [h: number, s: number, l: number] {
	const [r, g, b] = channels(hex);
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const l = (max + min) / 2;
	const d = max - min;
	if (!d) return [0, 0, l * 100];
	const s = d / (1 - Math.abs(2 * l - 1));
	let h =
		max === r
			? ((g - b) / d) % 6
			: max === g
				? (b - r) / d + 2
				: (r - g) / d + 4;
	h *= 60;
	if (h < 0) h += 360;
	return [h, s * 100, l * 100];
}

// WCAG relative luminance
const luminanceOf = (rgb: number[]) => {
	const [r, g, b] = rgb.map((c) =>
		c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
	);
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

// h in degrees, s and l in percent, to channels in 0..1
function toRgb(h: number, s: number, l: number) {
	const c = (1 - Math.abs((2 * l) / 100 - 1)) * (s / 100);
	const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
	const m = l / 100 - c / 2;
	const sextant = Math.floor((((h % 360) + 360) % 360) / 60);
	const [r, g, b] = [
		[c, x, 0],
		[x, c, 0],
		[0, c, x],
		[0, x, c],
		[x, 0, c],
		[c, 0, x],
	][sextant];
	return [r + m, g + m, b + m];
}

/** A colour as "#rrggbb", which is what <input type="color"> speaks, to HSL. */
export const hexToHsl = (hex: string): Hsl => toHsl(hex);

/** ...and back. */
export const hslToHex = (h: number, s: number, l: number) =>
	"#" +
	toRgb(h, s, l)
		.map((c) =>
			Math.round(c * 255)
				.toString(16)
				.padStart(2, "0")
		)
		.join("");

const triplet = (h: number, s: number, l: number) =>
	`${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%`;

// the three custom property values for a colour, given how bright it is
const varsOf = (h: number, s: number, l: number, luminance: number) => ({
	hsl: triplet(h, s, l),
	// lightness floor for type on black; the blues and purples need more
	// of it than the yellows and greens, being darker at equal lightness
	text: triplet(h, s, Math.max(l, h > 200 && h < 300 ? 68 : 56)),
	ink: luminance > 0.4 ? "0, 0, 0" : "255, 255, 255",
});

type Vars = ReturnType<typeof varsOf>;

/** The three custom property values for an accent. */
export function accentVars(accent: Accent) {
	return varsOf(...toHsl(accent.hex), luminanceOf(channels(accent.hex)));
}

/** ...and for a colour given as hue, saturation and lightness. */
export function hslVars(h: number, s: number, l: number) {
	return varsOf(h, s, l, luminanceOf(toRgb(h, s, l)));
}

const find = (name: string | null) =>
	ACCENTS.find((a) => a.name === name) ?? null;

const clamp = (v: number, i: number) =>
	Math.min(CUSTOM_RANGE.max[i], Math.max(CUSTOM_RANGE.min[i], Math.round(v)));

// the custom colour as remembered, if one has been made
function storedCustom(): Hsl | null {
	const parts = `${remembered.custom ?? ""}`.split(",");
	if (parts.length !== 3 || parts.some((p) => !/^\d+$/.test(p))) return null;
	return parts.map((p, i) => clamp(+p, i)) as Hsl;
}

/**
 * The custom accent: the one remembered, or, before there's ever been one,
 * the accent in use now (so making your own starts from where you are).
 */
export function customAccent(): Hsl {
	if (import.meta.env.SSR)
		return toHsl(find(DEFAULT_ACCENT)!.hex).map(clamp) as Hsl;
	const stored = storedCustom();
	if (stored) return stored;
	return toHsl((find(remembered.name) ?? find(DEFAULT_ACCENT)!).hex).map(
		clamp
	) as Hsl;
}

export function currentAccent(): string {
	if (import.meta.env.SSR) return DEFAULT_ACCENT;
	const name = remembered.name;
	if (name === CUSTOM_ACCENT && storedCustom()) return CUSTOM_ACCENT;
	return find(name)?.name ?? DEFAULT_ACCENT;
}

// put a colour's values on <html>, or (null) go back to the stylesheet's
function apply(vars: Vars | null) {
	const style = document.documentElement.style;
	if (!vars) {
		style.removeProperty("--accent-hsl");
		style.removeProperty("--accent-text-hsl");
		style.removeProperty("--on-accent");
		return;
	}
	style.setProperty("--accent-hsl", vars.hsl);
	style.setProperty("--accent-text-hsl", vars.text);
	style.setProperty("--on-accent", vars.ink);
}

// Put something in the store, if it isn't what's there already: the store
// writes itself out at every assignment, the same value or not, and a first
// visit that changes nothing has nothing to write.
type Remembered = typeof remembered;
function note<K extends keyof Remembered>(key: K, value: Remembered[K]) {
	if (remembered[key] !== value) remembered[key] = value;
}

// ...and remember it (null: forget, the default needs no remembering)
function remember(name: string | null, vars: Vars | null) {
	const keep = name && vars ? vars : null;
	note("name", keep ? name! : "");
	note("hsl", keep?.hsl ?? "");
	note("text", keep?.text ?? "");
	note("ink", keep?.ink ?? "");
}

// ---- the photo behind the page ----

const PHOTO = "/bg-rain.webp";
// (what its hue comes to, for where it can't be found out: no canvas, or
// the picture won't load)
const PHOTO_HUE = 212;

let photoHueIs: number | null = null;
let findingPhotoHue: Promise<number> | null = null;

/**
 * The hue of the photo behind the page, in degrees: the one most of its
 * colour is in. Worked out from the photo itself, once: every pixel of a
 * small copy counts towards its own hue by how much colour it has, greys
 * for nothing, and the answer is the direction they agree on.
 */
export function photoHue(): Promise<number> {
	if (photoHueIs != null) return Promise.resolve(photoHueIs);
	return (findingPhotoHue ??= new Promise<number>((resolve) => {
		const done = (hue: number) => resolve((photoHueIs = hue));
		const img = new Image();
		img.decoding = "async";
		img.onerror = () => done(PHOTO_HUE);
		img.onload = () => {
			try {
				const canvas = document.createElement("canvas");
				const [w, h] = [(canvas.width = 24), (canvas.height = 32)];
				const c = canvas.getContext("2d");
				if (!c) return done(PHOTO_HUE);
				c.drawImage(img, 0, 0, w, h);
				const px = c.getImageData(0, 0, w, h).data;
				let [x, y, weight] = [0, 0, 0];
				for (let i = 0; i < px.length; i += 4) {
					const [r, g, b] = [px[i] / 255, px[i + 1] / 255, px[i + 2] / 255];
					const max = Math.max(r, g, b);
					const chroma = max - Math.min(r, g, b);
					if (!chroma) continue;
					let hue =
						max === r
							? ((g - b) / chroma) % 6
							: max === g
								? (b - r) / chroma + 2
								: (r - g) / chroma + 4;
					hue *= Math.PI / 3;
					x += Math.cos(hue) * chroma;
					y += Math.sin(hue) * chroma;
					weight += chroma;
				}
				// (no colour to speak of, or none that agrees: as good as none)
				if (weight < 1 || Math.hypot(x, y) / weight < 0.1)
					return done(PHOTO_HUE);
				done(((Math.atan2(y, x) * 180) / Math.PI + 360) % 360);
			} catch {
				done(PHOTO_HUE);
			}
		};
		img.src = PHOTO;
	}));
}

// The hue the photo is turned to for an accent: its own, or none (null) for
// the default, which leaves the photo as it comes.
const hueOf = (name: string) =>
	name === CUSTOM_ACCENT
		? customAccent()[0]
		: name === DEFAULT_ACCENT
			? null
			: (toHsl((find(name) ?? find(DEFAULT_ACCENT)!).hex)[0] ?? null);

let turn = 0;

/** How far the photo behind the page is turned from its own hue, in degrees. */
export const photoTurn = () => turn;

function applyTurn(deg: number) {
	turn = deg;
	const style = document.documentElement.style;
	if (deg) {
		style.setProperty("--bg-turn", `${deg}`);
		style.setProperty("--bg-filter", `hue-rotate(${deg}deg)`);
	} else {
		style.removeProperty("--bg-turn");
		style.removeProperty("--bg-filter");
	}
	note("turn", deg);
}

// Turn the photo to a hue (an accent's), or back to its own (null).
// Finding the photo's hue takes a moment the first time: a later call's
// answer is the one that counts.
let turning = 0;
function turnPhoto(hue: number | null) {
	const mine = ++turning;
	if (hue == null) {
		if (turn) applyTurn(0);
		return;
	}
	const to = (from: number) => {
		if (mine !== turning) return false;
		// the short way round, in whole degrees
		const deg = Math.round(((((hue - from) % 360) + 540) % 360) - 180);
		if (deg === turn) return false;
		applyTurn(deg);
		return true;
	};
	if (photoHueIs != null) to(photoHueIs);
	// (what's drawn of the photo elsewhere is told, like the rain)
	else photoHue().then((from) => to(from) && tell(true));
}

// The rain is drawn on a canvas and reads its colour once, so it's told
// (and the lightning, which has its own copy of the photo to turn).
// Not on every step of a slider being dragged, though: once it's stopped.
let telling = 0;
function tell(soon = false) {
	clearTimeout(telling);
	const say = () => window.dispatchEvent(new Event("accentchange"));
	if (soon) telling = window.setTimeout(say, 140);
	else say();
}

const presetVars = (accent: Accent | null) =>
	accent && accent.name !== DEFAULT_ACCENT ? accentVars(accent) : null;

/** Switch the site to an accent and remember it. */
export function setAccent(name: string) {
	if (name === CUSTOM_ACCENT) {
		setCustomAccent(customAccent());
		return;
	}
	const accent = find(name);
	const vars = presetVars(accent);
	apply(vars);
	remember(vars && accent ? accent.name : null, vars);
	turnPhoto(hueOf(vars && accent ? accent.name : DEFAULT_ACCENT));
	tell();
}

/**
 * Switch the site to a colour of the visitor's own and remember it, both as
 * the accent in use and as their custom one (which outlives picking another).
 * Returns the colour as taken: whole numbers, inside CUSTOM_RANGE.
 */
export function setCustomAccent(hsl: Hsl): Hsl {
	const [h, s, l] = hsl.map(clamp) as Hsl;
	const vars = hslVars(h, s, l);
	apply(vars);
	remember(CUSTOM_ACCENT, vars);
	note("custom", `${h},${s},${l}`);
	turnPhoto(h);
	tell(true);
	return [h, s, l];
}

/** Apply the remembered accent (index.html's script usually got there first). */
export function startAccent() {
	if (import.meta.env.SSR) return;
	const name = currentAccent();
	apply(
		name === CUSTOM_ACCENT ? hslVars(...customAccent()) : presetVars(find(name))
	);
	// The photo: as it was left for now (the script will have it that way
	// already), and then as it should be, once its hue's been found again.
	const was = Number(remembered.turn) || 0;
	const hue = hueOf(name);
	applyTurn(hue != null && Math.abs(was) <= 180 ? was : 0);
	turnPhoto(hue);
}
