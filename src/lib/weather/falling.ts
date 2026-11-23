// What the things that fall (src/lib/weather/rain.ts, and the snow and ice it
// brings in) are told about where they're falling.

/** A panel on the page that things land on: a tile, mostly. */
export interface Surface {
	el: Element;
	left: number;
	right: number;
	top: number;
	bottom: number;
	prevTop: number;
	prevLeft: number;
	/** Dropped from the page (a route change, mostly). */
	gone: boolean;
	/** Inside another surface: what settles on it would show through that one. */
	nested: boolean;
}

/** The canvas, in window coordinates, and the air over it this frame. */
export interface Air {
	x: number;
	y: number;
	w: number;
	h: number;
	/** The window's height: speeds and sizes go by it. */
	viewH: number;
	/** Seconds since the last frame, and since the start. */
	dt: number;
	time: number;
	/** The wind right now, gusts and all: km/h, positive to the right. */
	wind: number;
	/** How far the home page's panorama has panned since the last frame. */
	panned: number;
	/** The surfaces in sight. */
	surfaces: Surface[];
	/** A page transition is running: tiles are flying about. */
	busy: boolean;
	/** How light it is, 0 (night) to 1 (day). */
	day: number;
	/**
	 * How much of everything to have, for what the machine can take
	 * (gpu.ts): 1 the full amount, less on a weaker one.
	 */
	plenty: number;
}
