// The sky behind the page, when there's no rain to put the photo there
// for (src/lib/weather/index.ts says which): drawn, by a fragment shader, into a
// canvas that sits where the photo does and moves as it does.
//
// It's a view south from Waterloo. The horizon is just under the bottom of
// the window. The cloud doesn't come down that far: it bunches up and thins
// out about four fifths of the way down, with open sky under it. Under the
// horizon is the far haze, which goes on down as far as the page does
// (the canvas runs out eventually; the page carries on in the haze's
// colour, --sky-floor-hsl, so there's no telling where):
//
//   the air       deep overhead and paler towards the horizon, in the
//                 colours the sun's height gives it: blue by day, the
//                 horizon going orange on the sun's side as it sets and
//                 the rest following it down through twilight to night
//   the sun       where it is, overexposed, with the glare round it; red
//                 and dim on the horizon; a pale disc behind thin cloud
//                 or fog, gone behind thick
//   the moon      where it is and in its phase, lit from the side the sun
//                 is really on, the seas showing; a halo round it in haze
//   stars         at night, most of them faint and a few bright, a little
//                 colour in them, twinkling (more, low down, where there's
//                 more air to look through); and now and then a meteor
//   cloud         of all ten kinds, at three levels (src/lib/weather/index.ts
//                 says which and how much): ice streaks, sheets and
//                 grains up high, a veil or a mackerel sky in the middle,
//                 heaps, lumpy sheets, flat ones and rain cloud low down;
//                 with a halo round the sun or moon behind a sheet of ice.
//                 Each is on a flat layer overhead, seen in perspective, so it
//                 bunches up towards the horizon. Its shapes are fractal
//                 noise, pushed about by more noise; how much sky it
//                 covers is the weather's doing. It's lit: thin where the
//                 light comes through, dark where there's more cloud
//                 between it and the sun, bright rims round the sun
//                 itself. At night what lights it is the moon from above
//                 and the town from below (a dull orange, and a lot of it
//                 when there's snow about to throw it back up). It drifts
//                 with the wind.
//   fog           all of that fading into grey, thickest low down, in
//                 slow banks
//
// Nothing here is a picture: it's all worked out per pixel, per frame. It
// costs little all the same, and no more than the graphics card can take
// (gpu.ts sizes it up: LEVELS, below). The canvas is drawn at one pixel per
// CSS pixel at most (less when there are no stars to keep sharp, since
// everything else is soft), a couple of dozen times a second while
// anything's moving, and hardly at all under a still, clear, daytime sky.
// With prefers-reduced-motion it's a still.
//
// Without WebGL there's a plain gradient in the same colours (style.css,
// from --sky-top and --sky-low, which are set here either way).

import { scene, type LowCloud, type Scene } from "./index";
import { gpuQuality, startGpu, type Quality } from "./gpu";
import { flash } from "./lightning";

type Rgb = [number, number, number];

// The air's colours by the sun's height in degrees: straight up, at the
// horizon, and at the horizon under the sun. (sRGB, 0-255.) By day it's a
// soft mid blue, a little deeper than a real sky's (after the Weather app
// in Windows 10): the page's white text is read straight off it.
const AIR: [number, Rgb, Rgb, Rgb][] = [
	[-18, [5, 8, 19], [13, 17, 31], [13, 17, 31]],
	[-12, [8, 13, 33], [23, 31, 59], [44, 40, 70]],
	[-6, [19, 31, 72], [86, 84, 112], [196, 112, 70]],
	[-2, [33, 53, 110], [150, 122, 122], [242, 140, 68]],
	[2, [50, 84, 150], [190, 162, 142], [255, 172, 90]],
	[8, [40, 100, 178], [108, 152, 204], [232, 198, 160]],
	[20, [32, 102, 188], [84, 148, 210], [118, 170, 220]],
	[50, [28, 98, 190], [74, 142, 210], [100, 160, 218]],
];
// ...and the sun's own, through that much air
const SUN: [number, Rgb][] = [
	[-3, [255, 96, 40]],
	[0, [255, 130, 56]],
	[4, [255, 180, 100]],
	[10, [255, 226, 184]],
	[30, [255, 250, 240]],
];

const mix = (a: Rgb, b: Rgb, t: number): Rgb => [
	a[0] + (b[0] - a[0]) * t,
	a[1] + (b[1] - a[1]) * t,
	a[2] + (b[2] - a[2]) * t,
];
const scale = (a: Rgb, k: number): Rgb => [a[0] * k, a[1] * k, a[2] * k];
const add = (a: Rgb, b: Rgb): Rgb => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (lo: number, hi: number, v: number) => {
	const t = clamp01((v - lo) / (hi - lo));
	return t * t * (3 - 2 * t);
};

// a value between the rows either side of `at`
function ramp<T extends [number, ...Rgb[]]>(rows: T[], at: number, column: number): Rgb {
	if (at <= rows[0][0]) return rows[0][column] as Rgb;
	for (let i = 1; i < rows.length; i++) {
		if (at <= rows[i][0]) {
			const t = (at - rows[i - 1][0]) / (rows[i][0] - rows[i - 1][0]);
			return mix(rows[i - 1][column] as Rgb, rows[i][column] as Rgb, t);
		}
	}
	return rows[rows.length - 1][column] as Rgb;
}

/** The colour of the sky (somewhere between overhead and the horizon) with the sun that many degrees up: for showing a day at a glance. */
export function airTint(alt: number) {
	const c = mix(ramp(AIR, alt, 1), mix(ramp(AIR, alt, 2), ramp(AIR, alt, 3), 0.5), 0.45);
	return `rgb(${c.map((v) => Math.round(v)).join(" ")})`;
}

/** Everything the shader's told about a scene. Colours are sRGB, 0-255. */
interface Look {
	zenith: Rgb;
	horizon: Rgb;
	sunside: Rgb;
	sun: Rgb;
	sunPower: number;
	moonPower: number;
	cloudLit: Rgb;
	cloudDark: Rgb;
	fogTint: Rgb;
	stars: number;
	/** The low sun's light on cloud above the shadow of the ground (twilight's pinks), already scaled. */
	glow: Rgb;
	/** The light the clouds are lit by: 0 the sun, 1 the moon. */
	byMoon: number;
}

function lookOf(s: Scene): Look {
	const alt = s.sun.alt;
	const day = s.day;
	const zenith = ramp(AIR, alt, 1);
	const horizon = ramp(AIR, alt, 2);
	const sunside = ramp(AIR, alt, 3);
	const sun = ramp(SUN, alt, 1);

	// the moon gives light in proportion to how much of it is lit and
	// whether it's up
	const moonUp = smooth(-3, 6, s.moon.alt);
	const moonlight = moonUp * (0.15 + 0.85 * s.moon.fraction);
	// the town's glow on the cloud base: more with more cloud to catch it,
	// and far more with snow in the air or on the ground
	const snowy = s.snow > 0 ? 1 : 0;
	const town = mix([34, 25, 20], [84, 58, 50], snowy);
	const townAmount = (0.45 + 0.55 * s.cover) * (1 + 0.5 * s.fog);

	// cloud by day: white where the sun's on it (taking the sun's colour
	// when that's low), blue-grey underneath; both darker the heavier it is
	const low = 1 - smooth(0, 14, alt); // the sun low: its colour takes over
	const lightDay = mix(mix([255, 255, 255], sun, 0.25), mix(sun, sunside, 0.4), low * 0.75);
	// (and none of it white: the brightest cloud is still something white
	// text can be read on, a pale blue that the deep sky makes look bright)
	const litDay = scale(mix(lightDay, horizon, 0.45), 0.74 - 0.26 * s.gloom);
	const darkDay = scale(mix([70, 100, 146], [66, 72, 88], s.gloom), 1 - 0.3 * s.gloom);
	// ...and by night: moonlit on top, the town's light below
	const litNight = add(scale([52, 62, 88], moonlight), scale(town, 0.55 * townAmount));
	const darkNight = add([7, 8, 13], scale(town, townAmount));

	const fogDay = scale([118, 128, 146], 1 - 0.2 * s.gloom);
	const fogNight = add([17, 18, 23], scale(town, 0.8));

	return {
		zenith,
		horizon,
		sunside,
		sun,
		sunPower: smooth(-3.5, 1.5, alt),
		moonPower: moonUp,
		cloudLit: mix(litNight, litDay, day),
		cloudDark: mix(darkNight, darkDay, day),
		fogTint: mix(fogNight, fogDay, day),
		stars: 1 - smooth(-13, -4, alt),
		// from a little before sunrise to a little after, and the same at
		// the other end of the day: the sun's under the cloud, and red
		glow: scale(mix(sunside, sun, 0.35), smooth(-8, -2.5, alt) * (1 - smooth(2, 9, alt)) * 0.62),
		byMoon: 1 - smooth(-6, -1, alt),
	};
}

const VERTEX = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAGMENT = `
precision highp float;

uniform vec2 uSize;      // the canvas, CSS px
uniform vec2 uWin;       // the window, CSS px
uniform float uLeft;     // where the canvas's left edge is in the window, CSS px
uniform float uScale;    // device px drawn per CSS px
uniform float uTime;     // seconds
uniform vec2 uDrift;     // how far the cloud has blown, cloud units
uniform vec3 uZenith, uHorizon, uSunside, uSunCol;
uniform vec3 uCloudLit, uCloudDark, uFogCol;
uniform vec2 uSun, uMoon;   // window-heights from the canvas's top left
uniform float uSunPower, uMoonPower, uMoonLit, uByMoon;
uniform float uCover, uGloom, uFog, uStars, uDay;
uniform vec4 uLow;       // low cloud: cover, how heaped (1 cumulus, 0 a flat sheet), how soft-edged, how big
uniform vec2 uMid;       // middle cloud: cover, how lumpy (1 altocumulus, 0 altostratus)
uniform vec3 uHigh;      // high cloud: cover, how fibrous (cirrus), how grainy (cirrocumulus)
uniform float uWind;     // 0 calm to 1 a gale
uniform vec3 uGlow;      // the low sun on cloud that's high enough to still be in it
uniform float uThick;    // how deep the low cloud is, as a share of how high its base is
uniform sampler2D uNoise; // random values, for noise in three dimensions (VOLUME)
uniform vec4 uMeteor;    // from, to
uniform float uMeteorT;  // 0..1 along it; < 0 for none
uniform vec3 uFlash;     // lightning: where (window-heights), and how bright

const float PI = 3.14159265;
const float HORIZON = 1.04;
// The cloud doesn't go all the way down to it: it's thinned out to nothing
// by here (of the window's height, from its top), and under that there's
// open sky to the horizon. A page's worth of cloud is a lot of cloud.
const float CLOUD_END = 0.8;

float hash(vec2 p) {
	vec3 q = fract(vec3(p.xyx) * 0.1031);
	q += dot(q, q.yzx + 33.33);
	return fract((q.x + q.y) * q.z);
}
vec2 hash2(vec2 p) {
	vec3 q = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
	q += dot(q, q.yzx + 33.33);
	return fract((q.xx + q.yz) * q.zy);
}
float noise(vec2 p) {
	vec2 i = floor(p), f = fract(p);
	vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
	return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
	           mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
const mat2 TURN = mat2(1.6, 1.2, -1.2, 1.6);
// The cloud's own noise: smooth at its largest scales (where the masses
// are) and billowed below that, each octave a field of round swellings
// with creases between them, which is what the edge of a cumulus is.
float billows(vec2 p) {
	float v = 0.0, a = 0.5, total = 0.0;
	for (int i = 0; i < OCTAVES; i++) {
		float n = noise(p);
		if (i >= 2) n = mix(n, abs(2.0 * n - 1.0) + 0.17, 0.7 * uLow.y);
		v += a * n;
		total += a;
		p = TURN * p;
		a *= 0.5;
	}
	return v / total;
}
float fbm3(vec2 p) {
	float v = 0.0, a = 0.5;
	for (int i = 0; i < 3; i++) { v += a * noise(p); p = TURN * p; a *= 0.5; }
	return v / 0.875;
}

// how high a point of the picture is, 0 at the horizon to 1 overhead
// (the same squeeze as weather.ts puts the sun and moon through)
float heightAt(float y) {
	float t = max(0.0, 1.0 - y / HORIZON);
	return pow(t, 1.0 / 0.72);
}

// ...and how high in the part of it that has cloud in it: 0 where the
// cloud ends
float cloudHeightAt(float y) {
	float t = max(0.0, 1.0 - y / CLOUD_END);
	return pow(t, 1.0 / 0.72);
}

// where a point of the picture meets the cloud layer
vec2 cloudAt(vec2 q) {
	// (the top of the picture is well up the sky, not straight overhead:
	// right overhead a flat layer is all one stretched-out patch)
	float el = max(cloudHeightAt(q.y), 0.02) * PI * 0.36;
	// (not the whole width of sky the sun and moon are placed across: a
	// flat layer seen that wide bends into arcs at the top of the picture)
	float span = radians(50.0) * clamp(uWin.x / uWin.y / 1.6, 0.45, 1.25);
	float az = (q.x * uWin.y / uWin.x - 0.5) * 2.0 * span;
	vec3 dir = vec3(sin(az) * cos(el), sin(el), cos(az) * cos(el));
	return dir.xz / (dir.y + 0.16) * 1.9;
}

// How much low cloud there is at a point of its layer, 0 to 1. What kind
// it is is a matter of degree: how heaped its shapes are, how sharp its
// edges, how big its masses (uLow).
float cloud(vec2 c, float detail) {
	float cover = uLow.x;
	vec2 w = c + uDrift;
	// (a wind draws cloud out along itself)
	w.x *= 1.0 - 0.22 * uWind;
	// (shapes change as they go: a second lot of noise, blowing through
	// the first a little faster)
	vec2 push = vec2(noise(w * 0.55 + uDrift * 0.35 + 3.1),
	                 noise(w * 0.55 - uDrift * 0.25 + vec2(7.7, 1.3))) - 0.5;
	vec2 at = w * 1.45 * uLow.w + push * 1.3;
	float n = detail > 0.5 ? billows(at) : fbm3(at);
#ifdef DETAIL
	// (the edges are eaten into by finer stuff, as a real cloud's are: a
	// heap's more than a sheet's, and more the harder it's blowing)
	if (detail > 0.5)
		n -= (0.03 + 0.045 * uLow.y + 0.05 * uWind) * (fbm3(at * 4.7 + uDrift * 0.6) - 0.5) * 2.0;
#endif
	float edge = mix(0.72, 0.12, cover * cover * (3.0 - 2.0 * cover) * 0.5 + cover * 0.5);
	float d = smoothstep(edge, edge + mix(0.2, 0.46, cover) * uLow.z, n);
	// (a sky that's all cloud has no holes in it, only thinner places)
	return max(d, smoothstep(0.9, 1.0, cover) * (0.5 + 0.3 * n));
}

#ifdef VOLUME
// Noise in three dimensions, at one texture read a go: the texture is
// random values, and its green channel is its red one moved over by
// (37, 17), so a level of the noise and the level above it are side by
// side in one texel (Inigo Quilez's trick).
float noise3(vec3 x) {
	vec3 p = floor(x), f = fract(x);
	f = f * f * (3.0 - 2.0 * f);
	vec2 rg = texture2D(uNoise, (p.xy + vec2(37.0, 17.0) * p.z + f.xy + 0.5) / 256.0).rg;
	return mix(rg.x, rg.y, f.z);
}
// Each octave is the last turned as well as halved: this noise is values
// on a grid, and octaves that all line up with the grid (and the screen)
// come out as a sky of squares.
const mat3 TURN3 = mat3(0.00, 1.60, 1.20, -1.60, 0.72, -0.96, -1.20, -0.96, 1.28);
// (smooth at its two largest scales, billowed at the two below: as billows())
float fbm3d(vec3 p) {
	float v = 0.5 * noise3(p);
	p = TURN3 * p + 7.1;
	v += 0.25 * noise3(p);
	p = TURN3 * p + 3.3;
	float n = noise3(p);
	v += 0.125 * mix(n, abs(2.0 * n - 1.0) + 0.17, 0.6 * uLow.y);
	p = TURN3 * p + 5.7;
	n = noise3(p);
	v += 0.0625 * mix(n, abs(2.0 * n - 1.0) + 0.17, 0.6 * uLow.y);
	return v / 0.9375;
}

// The low cloud as a thing with depth: how much of it there is at a point
// of its layer (p) and a height in it (h, 0 at its base to 1 at its top).
// The same shapes as cloud() makes, and the same amount of sky covered,
// but a heap is wide at its flat base and narrows as it goes up, each one
// to its own height.
float volume(vec2 p, float h, float detail) {
	float cover = uLow.x;
	vec2 w = p + uDrift;
	w.x *= 1.0 - 0.22 * uWind;
	// (and it changes as it goes: the noise is drifted through, upwards)
	// (pushed about by more noise, as cloud() is, and set at an angle to
	// the noise's grid: both so that grid never shows)
	vec2 push = vec2(noise3(vec3(w * 0.55 + 3.1, 0.3 + uTime * 0.004)),
	                 noise3(vec3(w * 0.55 + vec2(7.7, 1.3), 5.6 - uTime * 0.004))) - 0.5;
	w = mat2(0.82, 0.57, -0.57, 0.82) * w + push * 0.95;
	vec3 at = vec3(w.x, w.y, h * uThick * 1.9 + uTime * 0.008) * 1.45 * uLow.w;
	at = at.xzy * vec3(1.0, 1.0, 1.0) + vec3(0.0, 0.31 * at.x, 0.0);
	float n = fbm3d(at);
	if (detail > 0.5)
		n -= (0.02 + 0.03 * uLow.y + 0.05 * uWind) * (noise3(TURN3 * at * 2.6 + 11.0) - 0.5) * 2.0;
	float edge = mix(0.72, 0.12, cover * cover * (3.0 - 2.0 * cover) * 0.5 + cover * 0.5);
	float d = smoothstep(edge + 0.22 * h * uLow.y, edge + 0.22 * h * uLow.y + mix(0.17, 0.36, cover) * uLow.z, n);
	d = max(d, smoothstep(0.9, 1.0, cover) * (0.5 + 0.3 * n) * (1.0 - h));
	// a flat base, a rounded top
	return d * smoothstep(0.0, 0.07, h) * (1.0 - smoothstep(0.82, 1.0, h));
}
#endif

// The middle level: a sheet, in patches or whole. Altostratus is just
// that; altocumulus is the sheet broken into rows of small rounded lumps.
// It's higher, so finer, and slower across the sky.
float midCloud(vec2 c) {
	if (uMid.x < 0.01) return 0.0;
	vec2 m = c * 1.9 + uDrift * vec2(0.62, 0.5) + 31.0;
	vec2 push = vec2(noise(m * 0.6 + 5.0), noise(m * 0.6 + vec2(9.2, 2.7))) - 0.5;
	// where the cloud is at all: big soft patches
	float n = fbm3(m * 0.42 + push * 0.5);
	float soft = 0.3;
	if (uMid.y > 0.01) {
		// ...and within them, altocumulus: small rounded heaps close
		// together, each its own shape. The same sort of noise as the
		// patches, finer and set at an angle to them, and part of the
		// same shape (not holes cut out of it), so the heaps are whole
		// and soft-edged and thin out towards a patch's rim.
		float heaps = fbm3(mat2(0.8, 0.6, -0.6, 0.8) * m * 1.55 + push * 1.5 + 13.0);
		n = mix(n, n * 0.52 + heaps * 0.48, uMid.y);
		soft = mix(soft, 0.17, uMid.y);
	}
	// (mixing the two narrows the spread of values: the edge is set for that)
	float edge = mix(0.72, 0.2, uMid.x) + 0.03 * uMid.y;
	float d = smoothstep(edge, edge + soft, n);
	return max(d, smoothstep(0.9, 1.0, uMid.x) * (1.0 - uMid.y) * 0.7);
}

// The high level: ice. A thin sheet (cirrostratus), or the sheet combed
// into streaks by the wind up there (cirrus: longer the harder it blows),
// or broken into grains (cirrocumulus).
float highCloud(vec2 c) {
	if (uHigh.x < 0.01) return 0.0;
	vec2 h = c * 0.9 + uDrift * 0.3 + 17.0;
	float edge = mix(0.8, 0.08, uHigh.x);
	float sheet = smoothstep(edge, edge + 0.42, fbm3(h * 0.5));
	float kind = 0.72;
	if (uHigh.y > 0.01) {
		float pull = 1.9 * (1.0 + 0.9 * uWind);
		float n = fbm3(vec2(h.x * 0.5 + h.y * 0.3, h.y * pull - h.x * 0.4) + 1.8 * noise(h * 0.7));
		kind = mix(kind, smoothstep(0.4, 0.9, n) * 1.25, uHigh.y);
	}
	if (uHigh.z > 0.01) {
		vec2 g = mat2(0.8, 0.6, -0.6, 0.8) * h * 9.0;
		g += 0.8 * (vec2(noise(h * 3.1 + 2.0), noise(h * 3.1 + vec2(6.4, 1.9))) - 0.5);
		float grains = 0.6 * noise(g) + 0.4 * noise(TURN * g * 0.93 + 4.0);
		kind = mix(kind, smoothstep(0.4, 0.62, grains), uHigh.z);
	}
	return clamp(sheet * kind, 0.0, 1.0);
}

// stars in cells of the picture: at most one a cell, most of them faint
vec3 stars(vec2 px, float cell, float share, float size, float low) {
	vec2 g = floor(px / cell);
	float pick = hash(g + cell);
	if (pick > share) return vec3(0.0);
	vec2 at = (0.2 + 0.6 * hash2(g * 1.7 + cell)) * cell;
	vec2 d = px - g * cell - at;
	float mag = pow(hash(g + 11.3), 5.0);
	float r2 = dot(d, d);
	float core = exp(-r2 / (size * (0.28 + 0.9 * mag)));
	// a little flare round the brightest
	core += mag * mag * 0.12 * exp(-sqrt(r2) / (size * 1.8));
	float rate = 1.5 + 4.0 * hash(g + 3.7);
	float phase = 6.283 * hash(g + 5.1);
	// (it's moving air that makes them twinkle: more of it, more twinkling)
	float twinkle = 1.0 + (0.14 + 0.5 * low + 0.3 * uWind) *
		sin(uTime * rate + phase) * sin(uTime * rate * 0.37 + phase * 2.0);
	// most stars are white; some lean blue, a few orange
	float warmth = hash(g + 9.9);
	vec3 tint = mix(vec3(0.78, 0.86, 1.0), vec3(1.0, 0.82, 0.62), smoothstep(0.55, 1.0, warmth));
	tint = mix(vec3(1.0), tint, 0.7);
	return tint * core * (0.22 + 1.6 * mag) * twinkle;
}

void main() {
	vec2 px = vec2(gl_FragCoord.x, uSize.y * uScale - gl_FragCoord.y) / uScale;
	// (the sky's drawn in the window's coordinates, and the canvas can start
	// left of the window: under the iPhone Duo's side rail)
	px.x += uLeft;
	vec2 q = px / uWin.y;
	float up = heightAt(q.y);
	float low = pow(1.0 - up, 3.0);
	// (the same two for the cloud, which ends higher up the picture)
	float cloudUp = cloudHeightAt(q.y);
	float cloudLow = pow(1.0 - cloudUp, 3.0);

	// ---- the air ----
	vec3 col = mix(uZenith, uHorizon, pow(1.0 - up, 2.4));
	// the horizon under the sun, at either end of the day
	float towards = exp(-pow((q.x - uSun.x) * 1.15, 2.0));
	col = mix(col, uSunside, towards * pow(1.0 - up, 3.2) * 0.95);

	// ---- cloud, and how much of it is in the way of the light ----
	vec2 lightAt = mix(uSun, uMoon, uByMoon);
	float there = 0.0, thick = 0.0, veil = 0.0;
	vec2 c = cloudAt(q);
	vec2 lc = cloudAt(lightAt);
#ifdef VOLUME
	// heaped cloud is drawn with its depth (below); sheets are as flat as
	// they look, and aren't
	bool deep = uLow.y > 0.3;
	vec3 deepCol = vec3(0.0);
#else
	bool deep = false;
#endif
	if (uLow.x > 0.01 && !deep) {
		there = cloud(c, 1.0);
		// more cloud between here and the light: darker. A few steps that
		// way, short ones first, adding up what's passed through.
		vec2 toLight = lc - c;
		float far = length(toLight);
		vec2 hop = toLight / max(far, 0.001) * min(far, 0.5);
		for (int i = 1; i <= STEPS; i++) {
			float t = float(i) / float(STEPS);
			thick += cloud(c + hop * t * t, 0.0);
		}
		thick /= float(STEPS);
		// and over the light itself
		veil = cloud(lc, 0.0);
		// (a sky that's all cloud hides it, and the heavier the more surely)
		veil = mix(veil, 1.0, smoothstep(0.9, 1.0, uLow.x) * (0.55 + 0.45 * uGloom));
	}
#ifdef VOLUME
	if (uLow.x > 0.01 && deep) {
		// The line of sight goes up through the cloud from its base to its
		// top, a step at a time. At each step: how much cloud is here, and
		// how much more of it is between here and the light (a few steps
		// that way, up and out), which says how bright this bit is. What's
		// nearer hides what's behind it. So a heap has a shaded base, lit
		// flanks on the light's side, and the far side of the sky's heaps
		// show their sides, not just their undersides.
		float rise = sin(max(cloudUp, 0.02) * PI * 0.36);
		float stride = uThick * 1.9 / (rise + 0.16) / float(VSTEPS);
		// (the way to the light: across by this much for the cloud's depth up)
		vec2 sunward = lc * uThick;
		float slope = length(sunward);
		if (slope > 1.6) sunward *= 1.6 / slope;
		float slant = sqrt(1.0 + min(slope, 1.6) * min(slope, 1.6));
		vec3 dark = mix(uCloudDark, uCloudDark * 0.72 + uZenith * 0.5, 0.45 * uDay * (1.0 - uGloom));
		float through = 1.0;
		// (each pixel starts a little way along its first step, or the
		// steps show as bands)
		// (by a pattern that's even from pixel to pixel, so it doesn't
		// show as grain instead)
		float start = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
		for (int i = 0; i < VSTEPS; i++) {
			float h = (float(i) + start) / float(VSTEPS);
			vec2 p = c * (1.0 + uThick * h);
			float d = volume(p, h, 1.0);
			if (d > 0.01) {
				float above = 0.0;
				for (int j = 1; j <= LSTEPS; j++) {
					float t = float(j) / float(LSTEPS);
					float hh = h + (1.0 - h) * t * 0.92;
					above += volume(p + sunward * (hh - h), hh, 0.0);
				}
				above /= float(LSTEPS);
				float light = exp(-above * (1.0 - h) * slant * uThick * mix(7.0, 13.0, uGloom));
				// (a little of the sky's own light gets in everywhere, more near the top)
				vec3 lum = mix(dark, uCloudLit, light) * mix(0.86, 1.0, h);
				float a = 1.0 - exp(-d * stride * 9.0);
				deepCol += through * a * lum;
				through *= 1.0 - a;
				if (through < 0.03) break;
			}
		}
		there = 1.0 - through;
		deepCol /= max(there, 0.001);
		// and over the light itself: is there a heap in the way
		veil = max(volume(lc * (1.0 + uThick * 0.25), 0.25, 0.0), volume(lc * (1.0 + uThick * 0.6), 0.6, 0.0));
		veil = mix(veil, 1.0, smoothstep(0.9, 1.0, uLow.x) * (0.55 + 0.45 * uGloom));
	}
#endif
	// (all of it thins out into the haze at the horizon)
	float clear = smoothstep(0.01, 0.2, cloudUp);
	there *= clear;
	float mid = midCloud(c) * clear;
	float wisp = highCloud(c) * (1.0 - 0.5 * cloudLow) * clear;
	// the light comes through all three: the low cloud stops it, the
	// middle dims it to a disc with no glare, the ice hardly touches it
	float midVeil = midCloud(lc);
	veil = 1.0 - (1.0 - veil) * (1.0 - 0.72 * midVeil) * (1.0 - 0.2 * highCloud(lc));
	float sunShows = uSunPower * (1.0 - veil * mix(0.82, 0.985, uGloom));
	float moonShows = uMoonPower * (1.0 - veil * mix(0.7, 0.97, uGloom));

	// ---- stars ----
	float moonDist = distance(q, uMoon);
	float moonR = 0.021;
	if (uStars > 0.01) {
		float seen = uStars * (1.0 - there) * exp(-mid * 4.5) * (1.0 - 0.65 * wisp) * (1.0 - 0.75 * low) * (1.0 - uFog);
		// (the moon's glare drowns the faint ones near it)
		seen *= 1.0 - 0.6 * uMoonPower * uMoonLit * exp(-moonDist * 3.0);
		seen *= smoothstep(moonR, moonR * 1.3, moonDist);
		if (seen > 0.01) {
			vec3 s = stars(px, 13.0, 0.5, 0.55, low) + stars(px + 71.0, 47.0, 0.55, 1.1, low) * 1.8;
			col += s * seen;
		}
		// a meteor: bright at the head, the trail fading behind it
		if (uMeteorT >= 0.0) {
			vec2 a = uMeteor.xy, b = uMeteor.zw;
			vec2 head = mix(a, b, uMeteorT);
			vec2 along = normalize(b - a);
			vec2 rel = q - head;
			float back = -dot(rel, along);
			float off = length(rel + along * clamp(back, 0.0, 0.16));
			float trail = exp(-off * off / 0.0000035) * exp(-max(back, 0.0) * 26.0);
			col += vec3(0.9, 0.95, 1.0) * trail * sin(PI * uMeteorT) * 1.6 * uStars * (1.0 - there);
		}
	}

	// ---- the moon ----
	if (uMoonPower > 0.01) {
		vec2 m = (q - uMoon) / moonR;
		float r2 = dot(m, m);
		vec3 moon = vec3(0.0);
		float disc = 1.0 - smoothstep(0.92, 1.04, r2);
		if (disc > 0.0) {
			vec3 n = vec3(m.x, -m.y, sqrt(max(0.0, 1.0 - r2)));
			// lit from the sun's side, by as much as its phase
			vec2 side = uSun - uMoon;
			side = normalize(vec2(side.x, -side.y));
			float inc = acos(clamp(2.0 * uMoonLit - 1.0, -1.0, 1.0));
			vec3 l = vec3(side * sin(inc), cos(inc));
			// (the moon's dust throws light back the way it came: it's
			// nearly as bright at the limb as in the middle)
			float lit = pow(smoothstep(-0.02, 0.22, dot(n, l)), 0.75);
			float seas = fbm3(m * 1.7 + 4.0);
			float ground = mix(0.62, 1.0, smoothstep(0.38, 0.62, seas));
			moon = vec3(1.0, 0.975, 0.93) * (lit * ground + 0.018);
			// by day it's as pale as the sky lets it be
			float hid = max(there, 0.8 * mid);
			col = mix(col, col * (1.0 - 0.6 * (1.0 - uDay)), disc * (1.0 - hid));
			col += moon * disc * mix(1.0, 0.42, uDay) * mix(1.0, 0.12, hid) * uMoonPower;
		}
		float glow = uMoonLit * (0.30 * exp(-moonDist * 26.0) + 0.07 * exp(-moonDist * 5.5));
		// haze spreads it
		glow += uMoonLit * (uFog + veil * 0.6) * 0.16 * exp(-moonDist * 3.2);
		col += vec3(0.72, 0.8, 1.0) * glow * moonShows * (1.0 - uDay);
	}

	// ---- cloud ----
	vec3 lamp = mix(uSunCol * uSunPower, vec3(0.6, 0.68, 0.9) * uMoonPower * uMoonLit * 0.5, uByMoon);
	float nearLight = exp(-distance(q, lightAt) * 3.6);
	vec3 farCloud = mix(uHorizon, uCloudDark, 0.5 + 0.5 * uGloom);
	if (wisp > 0.0) {
		// (ice cloud is thin: it's the colour of the light, and the sky shows through)
		vec3 ice = mix(uCloudLit, uHorizon, 0.2) + lamp * nearLight * 0.5;
		// (the highest cloud is the last the sun leaves and the first it finds)
		ice += uGlow * (0.65 + 0.35 * towards);
		col = mix(col, ice, wisp * 0.62);
	}
	// a sheet of ice across the light bends it into a ring, 22 degrees out
	float sheetIce = uHigh.x * (1.0 - uHigh.y) * (1.0 - uHigh.z);
	if (sheetIce > 0.05) {
		float ring = distance(q, lightAt) - 0.2;
		// (sharp on the inside, fading outwards)
		float halo = exp(-ring * ring / (ring < 0.0 ? 0.00006 : 0.0009));
		col += lamp * halo * sheetIce * 0.13 * (1.0 - there) * (1.0 - mid);
	}
	if (mid > 0.0) {
		// the middle level: paler and flatter than the low cloud, thin
		// where it's lit through and grey where it's thick
		// lit like the low cloud is, if less starkly: the side of a patch
		// away from the light (the sun, or at night the moon) has the rest
		// of the patch in its way, and its thick middle is greyer than
		// its edges
		float midShade = 0.2 + 0.4 * mid;
#ifdef LAYERS
		vec2 toLight = lc - c;
		float mfar = length(toLight);
		float behind = midCloud(c + toLight / max(mfar, 0.001) * min(mfar, 0.22));
		midShade = clamp(0.08 + 0.3 * mid + 0.62 * behind * mix(0.6, 1.0, uByMoon), 0.0, 1.0);
#endif
		vec3 midCol = mix(uCloudLit, mix(uCloudDark, uCloudLit, 0.22), midShade);
		// at either end of the day the sun's under it, and lights it from
		// below: pink and orange, most on the sun's side of the sky
		midCol += uGlow * (0.45 + 0.55 * towards) * (1.0 - 0.45 * mid);
		midCol += lamp * nearLight * (1.0 - 0.6 * mid) * 0.6;
		midCol = mix(midCol, farCloud, cloudLow * 0.75);
		if (uFlash.z > 0.0) midCol += vec3(0.62, 0.7, 1.0) * uFlash.z * 0.2;
		col = mix(col, midCol, (1.0 - exp(-mid * 3.2)) * 0.92);
	}
	if (there > 0.0) {
		// what gets through the cloud between here and the light...
		float light = exp(-thick * mix(2.3, 3.6, uGloom));
		// ...and through this bit of it: we're underneath, so the thick
		// middle of a cloud is its dark belly, and its thin edges are lit
		// right through
		light *= mix(1.0, 0.4, there * there);
		light = mix(1.0, light, smoothstep(0.0, 0.5, there));
		// (the shade isn't black: it's lit by the sky, bluer by day)
		vec3 shade = mix(uCloudDark, uCloudDark * 0.72 + uZenith * 0.5, 0.45 * uDay * (1.0 - uGloom));
		vec3 cloudCol = mix(shade, uCloudLit, light);
		// (soft at the edges: a cloud thins out, it doesn't stop)
		float solid = 1.0 - exp(-there * 5.0);
#ifdef VOLUME
		if (deep) {
			cloudCol = deepCol;
			solid = there;
		}
#endif
#ifdef RELIEF
		// A cheaper sort of depth, for heaped cloud. The same cloud a little
		// higher up is the same shapes seen a little further off: where
		// that shows past the edge of the base, it's the cloud's side, and
		// it's in the light. The base itself is in its own shade.
		if (uLow.y > 0.3) {
			float top = cloud(c * (1.0 + 0.16 * uLow.y), 0.0) * clear;
			float flank = (1.0 - exp(-top * 5.0)) * (1.0 - solid);
			vec3 flankCol = mix(shade, uCloudLit, 0.55 + 0.45 * exp(-thick * 2.0));
			cloudCol *= mix(1.0, 0.84, there * uLow.y);
			float all = solid + flank;
			cloudCol = (cloudCol * solid + flankCol * flank) / max(all, 0.001);
			solid = all;
		}
#endif
		// a sky that's all cloud isn't all one grey: darker where it's deeper
		if (uLow.x > 0.85) {
			float belly = fbm3(c * 0.5 + uDrift * 0.8 + 9.0);
			cloudCol *= mix(1.0, 0.66 + 0.62 * belly, smoothstep(0.85, 1.0, uLow.x));
		}
		// thin cloud near the light glows with it
		cloudCol += uGlow * 0.3 * towards * (1.0 - 0.7 * there);
		// (not through a storm's worth of it, though)
		cloudCol += lamp * nearLight * (1.0 - there * 0.75) * (1.0 - veil * 0.5) * 0.85 * (1.0 - 0.85 * uGloom);
		// and far cloud goes the colour of the far sky
		cloudCol = mix(cloudCol, farCloud, cloudLow * 0.7);
		// lightning lights it from inside: brightest round where the bolt
		// left it, the thin parts more than the thick, and all of it a little
		if (uFlash.z > 0.0) {
			float fd = distance(q, uFlash.xy);
			float lit = uFlash.z * (0.16 + 0.95 * exp(-fd * 1.7) + 0.5 * exp(-fd * 6.0));
			cloudCol += vec3(0.62, 0.7, 1.0) * lit * (1.0 - 0.55 * thick) * (0.55 + 0.45 * fbm3(c * 2.3 + uDrift));
		}
		col = mix(col, cloudCol, solid);
	}
#ifdef LAYERS
	// under heavy cloud, scud: ragged dark scraps, lower, so going faster
	if (uGloom > 0.3) {
		vec2 s = c * 0.62 + uDrift * 2.4 + 40.0;
		float n = fbm3(s * 1.25 + 0.9 * noise(s * 2.1));
		float scud = smoothstep(0.5, 0.8, n) * smoothstep(0.3, 0.7, uGloom) * (1.0 - 0.7 * cloudLow) * clear;
		vec3 scudCol = uCloudDark * 0.6;
		if (uFlash.z > 0.0) scudCol += vec3(0.62, 0.7, 1.0) * uFlash.z * 0.12;
		col = mix(col, scudCol, scud * 0.62);
	}
#endif

	// ---- the sun ----
	if (uSunPower > 0.001) {
		float d = distance(q, uSun);
		float r = 0.02;
		float disc = 1.0 - smoothstep(r * 0.85, r * 1.2, d);
		float glare = 0.5 * exp(-d * 24.0) + 0.3 * exp(-d * 5.5) + 0.12 * exp(-d * 1.5);
		// behind cloud the disc goes first, then the glare
		col += uSunCol * (disc * 6.0 * sunShows * sunShows + glare * mix(sunShows, 1.0, 0.12) * uSunPower);
	}

	// ---- under the horizon: the far haze, whatever colour that is ----
	// (Where the cloud thins out above that, what's behind it is the sky,
	// if the sky has any gaps in it; under a sky that's all cloud it's
	// more cloud, too far off to make out, which is the haze's colour.)
	float under = smoothstep(HORIZON * 0.8, HORIZON * 1.1, q.y);
	under = max(under, (1.0 - clear) * smoothstep(0.55, 0.95, uCover));
	if (under > 0.0) {
		vec3 haze = mix(uHorizon, mix(uCloudDark, uCloudLit, 0.3), uCover);
		col = mix(col, haze, under);
	}

	// ---- fog ----
	if (uFog > 0.0) {
		float banks = fbm3(vec2(q.x * 1.4 + uDrift.x * 2.0, q.y * 3.2) + uTime * 0.008);
		float f = uFog * (0.62 + 0.38 * low) * (0.82 + 0.36 * banks);
		vec3 fogCol = uFogCol;
		// whatever light there is spreads through it
		float d = distance(q, lightAt);
		fogCol += mix(uSunCol * sunShows, vec3(0.6, 0.68, 0.9) * moonShows * uMoonLit * 0.4, uByMoon)
			* (0.3 * exp(-d * 2.4) + 0.25 * exp(-d * 9.0)) * uFog;
		col = mix(col, fogCol, clamp(f, 0.0, 1.0));
	}

	// a soft shoulder instead of clipping, then onto the screen
	col = min(col, 0.75) + 0.25 * (1.0 - exp(-max(col - 0.75, 0.0) / 0.25));
	col = pow(max(col, 0.0), vec3(1.0 / 2.2));
	// (grain, a level's worth, or the night's long gradients band)
	col += (hash(gl_FragCoord.xy) - 0.5) / 255.0 * 1.6;
	gl_FragColor = vec4(col, 1.0);
}
`;

const UNIFORMS = [
	"uSize",
	"uWin",
	"uLeft",
	"uScale",
	"uTime",
	"uDrift",
	"uZenith",
	"uHorizon",
	"uSunside",
	"uSunCol",
	"uCloudLit",
	"uCloudDark",
	"uFogCol",
	"uSun",
	"uMoon",
	"uSunPower",
	"uMoonPower",
	"uMoonLit",
	"uByMoon",
	"uCover",
	"uLow",
	"uMid",
	"uHigh",
	"uWind",
	"uThick",
	"uGlow",
	"uNoise",
	"uGloom",
	"uFog",
	"uStars",
	"uDay",
	"uMeteor",
	"uMeteorT",
	"uFlash",
] as const;

// What makes each kind of low cloud what it is, to the shader: how heaped
// its shapes are (1 a cumulus, 0 a flat sheet), how soft its edges, how
// big its masses (smaller numbers, bigger cloud), and how deep it is from
// base to top, as a share of how high its base is.
const LOW_SHAPES: Record<LowCloud, [number, number, number, number]> = {
	cumulus: [1, 0.8, 1, 0.42],
	stratocumulus: [0.5, 1.2, 0.7, 0.24],
	stratus: [0.04, 1.9, 0.5, 0.1],
	nimbostratus: [0.1, 1.8, 0.45, 0.3],
	cumulonimbus: [0.9, 1, 0.48, 0.85],
};

// The numbers of a scene that the sky is drawn from, apart from its
// colours: all of them things that can be part-way between two skies.
function numbersOf(s: Scene) {
	const { low, mid, high } = s.layers;
	const shape = LOW_SHAPES[low.kind];
	return {
		sunX: s.sun.x,
		sunY: s.sun.y,
		moonX: s.moon.x,
		moonY: s.moon.y,
		moonLit: s.moon.fraction,
		cover: s.cover,
		lowCover: low.cover,
		puff: shape[0],
		soft: shape[1],
		size: shape[2],
		thick: shape[3],
		midCover: mid.cover,
		midCells: mid.kind === "altocumulus" ? 1 : 0,
		highCover: high.cover,
		fibre: high.kind === "cirrus" ? 1 : 0,
		grain: high.kind === "cirrocumulus" ? 1 : 0,
		windy: s.windy,
		gloom: s.gloom,
		fog: s.fog,
		day: s.day,
	};
}
type Numbers = ReturnType<typeof numbersOf>;
const cloneLook = (l: Look): Look => {
	const copy = { ...l } as Look;
	for (const key of Object.keys(l) as (keyof Look)[]) {
		const v = l[key];
		if (typeof v !== "number") (copy[key] as Rgb) = [v[0], v[1], v[2]];
	}
	return copy;
};
// how long the sky takes to get most of the way from one state to the next
const EASE_S = 0.45;

// How well it's drawn, by what the graphics card is good for (gpu.ts):
// how fine the cloud's shapes are (octaves of noise), how many steps the
// light is followed through it, whether its edges are eaten into and
// whether there's scud under it; and how much depth heaped cloud has: none
// (it's a flat shape), the look of it (RELIEF: its lit sides showing past
// its base), or the real thing (VOLUME: the line of sight marched up
// through it, VSTEPS steps, with LSTEPS more towards the light at each); how
// many pixels there are to do all that for (per CSS pixel, with and
// without stars to keep sharp, and in all), and how often.
interface Level {
	defines: string;
	scale: number;
	starScale: number;
	maxPixels: number;
	fps: number;
}
const LEVELS: Record<Quality, Level> = {
	low: {
		defines: "#define OCTAVES 4\n#define STEPS 2\n",
		scale: 0.4,
		starScale: 0.75,
		maxPixels: 900_000,
		fps: 15,
	},
	medium: {
		defines: "#define OCTAVES 5\n#define STEPS 3\n#define DETAIL\n#define LAYERS\n#define RELIEF\n",
		scale: 0.5,
		starScale: 1,
		maxPixels: 2_400_000,
		fps: 24,
	},
	high: {
		defines:
			"#define OCTAVES 6\n#define STEPS 5\n#define DETAIL\n#define LAYERS\n" +
			"#define VOLUME\n#define VSTEPS 24\n#define LSTEPS 3\n",
		scale: 0.7,
		starScale: 1,
		maxPixels: 2_600_000,
		fps: 30,
	},
};
const STILL_MS = 4000;
const METEOR_GAP_MS: [number, number] = [25_000, 90_000];
const METEOR_MS = 650;

// sRGB 0-255 to linear 0-1, which is what the shader works in
const linear = (c: Rgb): Rgb => [
	(c[0] / 255) ** 2.2,
	(c[1] / 255) ** 2.2,
	(c[2] / 255) ** 2.2,
];
// "h, s%, l%", the way the stylesheet keeps the colours it puts an alpha on
function hslOf(c: Rgb) {
	const [r, g, b] = c.map((v) => Math.min(255, Math.max(0, v)) / 255);
	const hi = Math.max(r, g, b);
	const lo = Math.min(r, g, b);
	const l = (hi + lo) / 2;
	const d = hi - lo;
	let h = 0;
	let s = 0;
	if (d > 0) {
		s = d / (1 - Math.abs(2 * l - 1));
		h = hi === r ? ((g - b) / d) % 6 : hi === g ? (b - r) / d + 2 : (r - g) / d + 4;
		h *= 60;
		if (h < 0) h += 360;
	}
	return `${h.toFixed(1)}, ${(s * 100).toFixed(1)}%, ${(l * 100).toFixed(1)}%`;
}
// what the haze under the horizon is dimmed towards and by how much, for
// the page that's read over it
const FLOOR_DARK: Rgb = [7, 11, 19];
const FLOOR_DIM = 0.46;

const css = (c: Rgb) => `rgb(${c.map((v) => Math.round(Math.min(255, v))).join(" ")})`;

declare global {
	interface Window {
		__skyCleanup?: () => void;
	}
}

export function startSky() {
	window.__skyCleanup?.();

	const host = document.querySelector<HTMLElement>(".page-bg-photo");
	if (!host) return;
	const root = document.documentElement;
	const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

	const canvas = document.createElement("canvas");
	canvas.className = "sky-canvas";
	canvas.setAttribute("aria-hidden", "true");
	host.appendChild(canvas);

	startGpu();
	let level = LEVELS[gpuQuality()];
	let gl: WebGLRenderingContext | null = null;
	let where: Partial<Record<(typeof UNIFORMS)[number], WebGLUniformLocation | null>> = {};

	const build = () => {
		gl = canvas.getContext("webgl", {
			alpha: false,
			antialias: false,
			depth: false,
			stencil: false,
			powerPreference: "low-power",
		});
		if (!gl) return false;
		const compile = (type: number, source: string) => {
			const shader = gl!.createShader(type)!;
			gl!.shaderSource(shader, source);
			gl!.compileShader(shader);
			if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS)) {
				console.warn("sky:", gl!.getShaderInfoLog(shader));
				return null;
			}
			return shader;
		};
		const vs = compile(gl.VERTEX_SHADER, VERTEX);
		const fs = compile(gl.FRAGMENT_SHADER, level.defines + FRAGMENT);
		if (!vs || !fs) return false;
		const program = gl.createProgram()!;
		gl.attachShader(program, vs);
		gl.attachShader(program, fs);
		gl.linkProgram(program);
		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			console.warn("sky:", gl.getProgramInfoLog(program));
			return false;
		}
		gl.useProgram(program);
		gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
		// (one triangle that covers the lot)
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
		const at = gl.getAttribLocation(program, "aPos");
		gl.enableVertexAttribArray(at);
		gl.vertexAttribPointer(at, 2, gl.FLOAT, false, 0, 0);
		where = {};
		for (const name of UNIFORMS) where[name] = gl.getUniformLocation(program, name);
		// random values for the volume's noise: red, and green the same
		// moved over by (37, 17) (see noise3 in the shader)
		const size = 256;
		const values = new Uint8Array(size * size);
		for (let i = 0; i < values.length; i++) values[i] = Math.floor(Math.random() * 256);
		const pixels = new Uint8Array(size * size * 4);
		for (let y = 0; y < size; y++)
			for (let x = 0; x < size; x++) {
				const at = (y * size + x) * 4;
				pixels[at] = values[y * size + x];
				pixels[at + 1] = values[((y + 17) % size) * size + ((x + 37) % size)];
				pixels[at + 3] = 255;
			}
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
		return true;
	};

	let ok = build();
	root.classList.toggle("has-sky", ok);

	let now: Scene = scene();
	let look = lookOf(now);
	// What's drawn isn't `now` and `look` themselves but `nums` and `shown`,
	// which follow them: when the weather changes (or the time's dragged
	// about, on the weather page) the sky goes over to the new state in a
	// second or so rather than at a stroke. The colours cross over, the sun
	// and moon travel, cloud thickens or thins and changes its kind by
	// degrees.
	let goal = numbersOf(now);
	let nums = { ...goal };
	let shown: Look = cloneLook(look);
	let settling = false;
	const settle = (dt: number) => {
		const k = reduceMotion.matches ? 1 : 1 - Math.exp(-dt / EASE_S);
		let going = false;
		// (cloud that isn't there yet can be any kind: it comes in as its own)
		if (nums.lowCover < 0.02)
			for (const key of ["puff", "soft", "size", "thick"] as const) nums[key] = goal[key];
		if (nums.midCover < 0.02) nums.midCells = goal.midCells;
		if (nums.highCover < 0.02) {
			nums.fibre = goal.fibre;
			nums.grain = goal.grain;
		}
		for (const key of Object.keys(goal) as (keyof Numbers)[]) {
			const left = goal[key] - nums[key];
			if (Math.abs(left) > 0.0015) {
				nums[key] += left * k;
				going = true;
			} else nums[key] = goal[key];
		}
		for (const key of Object.keys(look) as (keyof Look)[]) {
			const to = look[key];
			if (typeof to === "number") {
				const from = shown[key] as number;
				const left = to - from;
				if (Math.abs(left) > 0.0015) {
					(shown[key] as number) = from + left * k;
					going = true;
				} else (shown[key] as number) = to;
				continue;
			}
			const from = shown[key] as Rgb;
			for (let i = 0; i < 3; i++) {
				const left = to[i] - from[i];
				if (Math.abs(left) > 0.3) {
					from[i] += left * k;
					going = true;
				} else from[i] = to[i];
			}
		}
		return going;
	};
	let cssW = 0;
	let left = 0; // the canvas's left edge, in the window (negative: under a rail)
	let cssH = 0;
	let drawnScale = 0;
	let dirty = true;
	let raf = 0;
	let lastDraw = 0;
	let lastTick = 0;
	let clock = Math.random() * 600; // seconds of sky time
	let driftX = Math.random() * 40;
	let driftY = Math.random() * 40;
	let flashed = false; // lightning last frame (one more draw, to put it out)
	let hideAt = 0; // when the sky was last wanted, for fading out under the photo
	let meteorAt = performance.now() + METEOR_GAP_MS[0] * (0.3 + Math.random());
	let meteor: { from: [number, number]; to: [number, number]; t0: number } | null = null;

	// the plain version, and what the stylesheet fades the page's end into
	const paint = () => {
		const top = mix(shown.zenith, shown.cloudDark, nums.cover * 0.85);
		const lowSky = mix(shown.horizon, shown.cloudDark, nums.cover * 0.7);
		root.style.setProperty("--sky-top", css(mix(top, shown.fogTint, nums.fog * 0.7)));
		root.style.setProperty("--sky-low", css(mix(lowSky, shown.fogTint, nums.fog * 0.85)));
		// the haze under the horizon (the shader's, colour for colour), dimmed:
		// what the sky runs down into and the rest of the page is
		const haze = mix(
			mix(shown.horizon, mix(shown.cloudDark, shown.cloudLit, 0.3), nums.cover),
			shown.fogTint,
			Math.min(1, nums.fog)
		);
		root.style.setProperty("--sky-floor-hsl", hslOf(mix(haze, FLOOR_DARK, FLOOR_DIM)));
		// (how light it is, for the scrim over all this: it goes with the
		// sky that's showing, not the one it's on its way to)
		root.style.setProperty("--daylight", nums.day.toFixed(3));
	};

	const starry = () => look.stars > 0.05 && now.cover < 0.97 && now.fog < 0.85;
	const moving = () =>
		!reduceMotion.matches && (now.cover > 0.02 || now.fog > 0 || starry());

	const resize = () => {
		const rect = host.getBoundingClientRect();
		cssW = Math.max(1, rect.width);
		cssH = Math.max(1, rect.height);
		// With the iPhone Duo's rail on the left the canvas starts under it,
		// that far left of the window (--rail-l, src/lib/pageBg.ts; read
		// from there, not measured: the page is scrolled across to it a
		// moment after the sizes change). Everything here is placed in the
		// window, so the sun stays where the page thinks it is and the sky
		// simply carries on under the rail.
		left = -(parseFloat(getComputedStyle(root).getPropertyValue("--rail-l")) || 0);
		let s = starry() ? level.starScale : level.scale;
		s = Math.min(s, window.devicePixelRatio || 1);
		s = Math.min(s, Math.sqrt(level.maxPixels / (cssW * cssH)));
		const w = Math.max(1, Math.round(cssW * s));
		const h = Math.max(1, Math.round(cssH * s));
		if (canvas.width !== w || canvas.height !== h) {
			canvas.width = w;
			canvas.height = h;
		}
		drawnScale = w / cssW;
		dirty = true;
	};

	const draw = (time: number) => {
		if (!gl || !ok) return;
		const u = where;
		const lin3 = (name: (typeof UNIFORMS)[number], c: Rgb) => {
			const l = linear(c);
			gl!.uniform3f(u[name]!, l[0], l[1], l[2]);
		};
		const winW = window.innerWidth || 1;
		const winH = window.innerHeight || 1;
		gl.viewport(0, 0, canvas.width, canvas.height);
		gl.uniform2f(u.uSize!, cssW, cssH);
		gl.uniform2f(u.uWin!, winW, winH);
		gl.uniform1f(u.uLeft!, left);
		gl.uniform1f(u.uScale!, drawnScale);
		gl.uniform1f(u.uTime!, clock);
		gl.uniform2f(u.uDrift!, driftX, driftY);
		lin3("uZenith", shown.zenith);
		lin3("uHorizon", shown.horizon);
		lin3("uSunside", shown.sunside);
		lin3("uSunCol", shown.sun);
		lin3("uCloudLit", shown.cloudLit);
		lin3("uCloudDark", shown.cloudDark);
		lin3("uFogCol", shown.fogTint);
		// (positions come as fractions of the window; the shader's unit is
		// its height both ways)
		gl.uniform2f(u.uSun!, (nums.sunX * winW) / winH, nums.sunY);
		gl.uniform2f(u.uMoon!, (nums.moonX * winW) / winH, nums.moonY);
		gl.uniform1f(u.uSunPower!, shown.sunPower);
		gl.uniform1f(u.uMoonPower!, shown.moonPower);
		gl.uniform1f(u.uMoonLit!, nums.moonLit);
		gl.uniform1f(u.uByMoon!, shown.byMoon);
		gl.uniform1f(u.uCover!, nums.cover);
		gl.uniform4f(u.uLow!, nums.lowCover, nums.puff, nums.soft, nums.size);
		gl.uniform1f(u.uThick!, nums.thick);
		lin3("uGlow", shown.glow);
		gl.uniform1i(u.uNoise!, 0);
		gl.uniform2f(u.uMid!, nums.midCover, nums.midCells);
		gl.uniform3f(u.uHigh!, nums.highCover, nums.fibre, nums.grain);
		gl.uniform1f(u.uWind!, nums.windy);
		gl.uniform1f(u.uGloom!, nums.gloom);
		gl.uniform1f(u.uFog!, nums.fog);
		gl.uniform1f(u.uStars!, shown.stars);
		gl.uniform1f(u.uDay!, nums.day);
		if (meteor) {
			gl.uniform4f(u.uMeteor!, meteor.from[0], meteor.from[1], meteor.to[0], meteor.to[1]);
			gl.uniform1f(u.uMeteorT!, clamp01((time - meteor.t0) / METEOR_MS));
		} else gl.uniform1f(u.uMeteorT!, -1);
		gl.uniform3f(u.uFlash!, flash.x, flash.y, flash.level);
		gl.drawArrays(gl.TRIANGLES, 0, 3);
	};

	const tick = (time: number) => {
		raf = requestAnimationFrame(tick);
		const dt = Math.min(0.25, (time - lastTick) / 1000);
		lastTick = time;
		// under the photo there's nothing to draw, once it's faded over
		if (now.backdrop !== "sky") {
			if (time - hideAt > 2500) return;
		} else hideAt = time;

		const live = moving();
		if (live) {
			clock += dt;
			// cloud goes with the wind: a breeze takes minutes to cross
			const speed = (0.006 + Math.abs(now.wind) * 0.0011) * Math.sign(now.wind || 1);
			driftX -= speed * dt;
			driftY += Math.abs(speed) * 0.22 * dt;

			// a meteor, if it's a night to see one
			if (meteor && time - meteor.t0 > METEOR_MS) meteor = null;
			if (!meteor && time > meteorAt) {
				meteorAt = time + METEOR_GAP_MS[0] + Math.random() * (METEOR_GAP_MS[1] - METEOR_GAP_MS[0]);
				if (starry() && now.cover < 0.6) {
					const aspect = window.innerWidth / Math.max(1, window.innerHeight);
					const x = (0.1 + 0.8 * Math.random()) * aspect;
					const y = 0.04 + 0.4 * Math.random();
					const angle = (0.15 + 0.5 * Math.random()) * (Math.random() < 0.5 ? 1 : -1);
					const length = 0.16 + 0.22 * Math.random();
					meteor = {
						from: [x, y],
						to: [x + Math.sin(angle) * length, y + Math.cos(angle) * length],
						t0: time,
					};
				}
			}
		}
		// on its way from one sky to the next: every frame of that's drawn
		if (settling) {
			settling = settle(dt);
			paint();
			dirty = true;
		}
		const every = live ? 1000 / level.fps : STILL_MS;
		// (lightning is over in a few frames: every one of them counts)
		const flashing = flash.level > 0 || flashed;
		flashed = flash.level > 0;
		if (!dirty && !meteor && !flashing && time - lastDraw < every - 2) return;
		dirty = false;
		lastDraw = time;
		draw(time);
	};

	const onWeather = () => {
		const was = starry();
		now = scene();
		look = lookOf(now);
		goal = numbersOf(now);
		// (tick() takes it from here; with nothing ticking, it's there at once)
		settling = true;
		if (!raf) {
			settle(1e6);
			paint();
		}
		if (starry() !== was) resize();
		dirty = true;
	};

	const start = () => {
		if (raf || !ok || document.visibilityState !== "visible") return;
		lastTick = lastDraw = performance.now();
		dirty = true;
		raf = requestAnimationFrame(tick);
	};
	const stop = () => {
		if (raf) cancelAnimationFrame(raf);
		raf = 0;
	};
	const onVisibility = () => (document.visibilityState === "visible" ? start() : stop());
	const onMotionPref = () => {
		dirty = true;
	};
	// the card's been sized up (gpu.ts): draw as well as it can take
	const onQuality = () => {
		level = LEVELS[gpuQuality()];
		if (gl) ok = build();
		root.classList.toggle("has-sky", ok);
		resize();
	};
	const onLost = (e: Event) => {
		e.preventDefault();
		ok = false;
	};
	const onRestored = () => {
		ok = build();
		dirty = true;
	};

	paint();
	resize();
	const sizes = new ResizeObserver(resize);
	sizes.observe(host);
	window.addEventListener("resize", resize);
	window.addEventListener("weatherchange", onWeather);
	window.addEventListener("gpuquality", onQuality);
	document.addEventListener("visibilitychange", onVisibility);
	reduceMotion.addEventListener("change", onMotionPref);
	canvas.addEventListener("webglcontextlost", onLost);
	canvas.addEventListener("webglcontextrestored", onRestored);
	start();

	window.__skyCleanup = () => {
		stop();
		sizes.disconnect();
		window.removeEventListener("resize", resize);
		window.removeEventListener("weatherchange", onWeather);
		window.removeEventListener("gpuquality", onQuality);
		document.removeEventListener("visibilitychange", onVisibility);
		reduceMotion.removeEventListener("change", onMotionPref);
		canvas.remove();
		window.__skyCleanup = undefined;
	};
}
