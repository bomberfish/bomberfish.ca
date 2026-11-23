// The weather over the page: Kitchener-Waterloo's, as Environment Canada
// has it (siteapi's /v1/weather), and what that makes of the background.
//
// Everything that draws the background reads one thing from here, the
// Scene: how much rain, snow or ice is coming down and at what slant, how
// much of the sky is cloud, how thick the fog is, where the sun and the
// moon are and how light it is. src/lib/weather/rain.ts draws what falls (with
// snow.ts and ice.ts), src/lib/weather/sky.ts the sky behind it.
//
// The sun and moon are where they really are over Waterloo: their
// positions are worked out from the time (the usual low-precision
// formulas, good to a fraction of a degree), so the day comes and goes
// with the seasons and the moon has its real phase, turned the way it's
// really turned.
//
// The photo behind the page is a rainy one, so it could only ever be
// there when it rains (or storms); any other weather gets a drawn sky.
// AN EXPERIMENT: rain gets a drawn sky too, now, and the photo's only
// used if it's asked for: ?rainbg=photo in the address (?rainbg=sky to go
// back; either is remembered on this device).
//
// Until the weather's known, and if it can't be had at all, it's what the
// page always had: rain, and the odd bolt of lightning.
//
// To see any of it without waiting for the weather: the about page has a
// picker (force(), below: kept on this device), or there's ?weather= in
// the address and window.__weather("...") in the console. Words in any order:
// a kind (clear, cloudy, overcast, fog, rain, drizzle, snow, mixed, ice,
// hail, storm), light/heavy, a time (day, night, dawn, dusk), wind=N (km/h,
// negative for the other way), any kinds of cloud by name (cumulus,
// altocumulus, cirrostratus...), and moon=N (the percentage of it lit).
// "live" goes back to the real thing.

import {
	getWeather,
	type WeatherClouds,
	type WeatherIntensity,
	type WeatherKind,
	type WeatherResponse,
} from "../siteapi";

// Waterloo, Ontario
const LAT = 43.46;
const LON = -80.52;

const REFRESH_MS = 10 * 60_000; // siteapi caches it for as long
const CLOCK_MS = 60_000; // the sun moves
const STORE = "weather"; // the last answer, for the next page load
const STORE_FRESH_MS = 45 * 60_000;
const FORCE_STORE = "weather-force"; // weather picked on the about page
const RAIN_STORE = "rain-backdrop"; // "photo" to have the photo behind rain

// what's behind rain: the photo, or (the experiment) a drawn sky like the rest
let rainPhoto = false;

export interface Body {
	/** Where it is in the picture: fractions of the window, from its top left. */
	x: number;
	y: number;
	/** Degrees above the horizon. */
	alt: number;
}

export interface Scene {
	kind: WeatherKind;
	intensity: WeatherIntensity | null;
	/** Environment Canada's words for it ("Light Rain"), if it's theirs. */
	condition: string | null;
	temperature: number | null;
	/** From Environment Canada (and to be credited), not made up. */
	live: boolean;
	attribution: string | null;

	/** What's behind the page: the rainy photo, or a drawn sky. */
	backdrop: "photo" | "sky";

	/** How much of each is falling: 0 none, 1 a moderate fall. */
	rain: number;
	/** Fine, slow rain. */
	drizzle: boolean;
	snow: number;
	/** Snow that's half rain: heavy, fast, and doesn't settle. */
	wet: boolean;
	/** Ice pellets or hail. */
	pellets: number;
	hail: boolean;
	/** Freezing rain: ice on everything it lands on. */
	glaze: boolean;
	/** Lightning: 0 none, 1 a strike every half minute or so. */
	lightning: number;

	/** Share of the sky that's cloud, 0 to 1: all three levels together. */
	cover: number;
	/** The cloud, level by level: how much of the sky each covers, and what kind it is. */
	layers: Layers;
	/** How hard it's blowing, gusts counted in: 0 calm, 1 a gale. */
	windy: number;
	/** How heavy the cloud is, 0 (fair weather) to 1 (a storm's). */
	gloom: number;
	fog: number;

	/** km/h, across the picture: positive blows to the right. */
	wind: number;
	gust: number;

	sun: Body;
	moon: Body & {
		/** Share of the disc that's lit, 0 to 1. */
		fraction: number;
		/** On its way to full (lit on the right, from here) rather than from it. */
		waxing: boolean;
	};
	/** 0 at night, 1 by day, between the two at dawn and dusk. */
	day: number;
}

// The ten kinds of cloud, by the level they're at.
//   low     cumulus (fair-weather heaps), stratocumulus (a lumpy, broken
//           sheet), stratus (a flat grey one), nimbostratus (the thick dark
//           one steady rain or snow falls from), cumulonimbus (a storm's)
//   middle  altocumulus (rows of small rounded lumps, a mackerel sky),
//           altostratus (a grey veil the sun shows through as if through
//           ground glass)
//   high    cirrus (streaks of ice, combed out by the wind), cirrostratus
//           (a thin milky sheet, the one that puts a halo round the sun or
//           moon), cirrocumulus (fine grains and ripples)
export type LowCloud = "cumulus" | "stratocumulus" | "stratus" | "nimbostratus" | "cumulonimbus";
export type MidCloud = "altocumulus" | "altostratus";
export type HighCloud = "cirrus" | "cirrostratus" | "cirrocumulus";
export interface Layers {
	low: { cover: number; kind: LowCloud };
	mid: { cover: number; kind: MidCloud };
	high: { cover: number; kind: HighCloud };
}

// ---------------------------------------------------------------------------
// The sun and the moon. (Astronomical Algorithms' low-precision series, the
// way SunCalc has them.)
// ---------------------------------------------------------------------------

const RAD = Math.PI / 180;
const OBLIQUITY = RAD * 23.4397;

// days since J2000
const days = (t: number) => t / 86_400_000 - 0.5 + 2440588 - 2451545;
const rightAscension = (l: number, b: number) =>
	Math.atan2(
		Math.sin(l) * Math.cos(OBLIQUITY) - Math.tan(b) * Math.sin(OBLIQUITY),
		Math.cos(l)
	);
const declination = (l: number, b: number) =>
	Math.asin(
		Math.sin(b) * Math.cos(OBLIQUITY) +
			Math.cos(b) * Math.sin(OBLIQUITY) * Math.sin(l)
	);
const sidereal = (d: number) => RAD * (280.16 + 360.9856235 * d) + RAD * LON;

function sunCoords(d: number) {
	const m = RAD * (357.5291 + 0.98560028 * d);
	const centre =
		RAD * (1.9148 * Math.sin(m) + 0.02 * Math.sin(2 * m) + 0.0003 * Math.sin(3 * m));
	const l = m + centre + RAD * 102.9372 + Math.PI;
	return { ra: rightAscension(l, 0), dec: declination(l, 0) };
}

function moonCoords(d: number) {
	const l = RAD * (218.316 + 13.176396 * d);
	const m = RAD * (134.963 + 13.064993 * d);
	const f = RAD * (93.272 + 13.22935 * d);
	const lon = l + RAD * 6.289 * Math.sin(m);
	const lat = RAD * 5.128 * Math.sin(f);
	return {
		ra: rightAscension(lon, lat),
		dec: declination(lon, lat),
		dist: 385001 - 20905 * Math.cos(m), // km
	};
}

// Where something at (ra, dec) is in the sky: degrees above the horizon,
// and degrees round from due south (west positive).
function place(d: number, ra: number, dec: number) {
	const h = sidereal(d) - ra;
	const phi = RAD * LAT;
	return {
		alt:
			Math.asin(
				Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(h)
			) / RAD,
		az:
			Math.atan2(
				Math.sin(h),
				Math.cos(h) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi)
			) / RAD,
	};
}

/** The sun's height over Waterloo, in degrees. */
export function sunAltitude(time: number) {
	const d = days(time);
	const s = sunCoords(d);
	return place(d, s.ra, s.dec).alt;
}

// The picture looks south, with the horizon just under the bottom of the
// window (under it there's only haze, as far down as the page goes; the
// cloud stops short of it, about four fifths of the way down: sky.ts):
// something due south and overhead is top centre, the sun
// comes up on the left and goes down on the right. Heights are squeezed
// towards the top, so a midsummer noon (70° up) and a midwinter one (23°)
// are both in the picture.
const VIEW_AZ = 78; // degrees either side of south that fit across
const HORIZON = 1.04; // of the window's height, from its top (sky.ts has it too)
const toPicture = (alt: number, az: number): Body => ({
	x: 0.5 + az / (2 * VIEW_AZ),
	y: HORIZON * (1 - Math.sign(alt) * (Math.abs(alt) / 90) ** 0.72),
	alt,
});

function heavens(time: number) {
	const d = days(time);
	const s = sunCoords(d);
	const m = moonCoords(d);
	const sun = place(d, s.ra, s.dec);
	const moon = place(d, m.ra, m.dec);
	// how far round from the sun the moon is, as seen from here, and so
	// how much of its lit side faces us
	const apart = Math.acos(
		Math.sin(s.dec) * Math.sin(m.dec) +
			Math.cos(s.dec) * Math.cos(m.dec) * Math.cos(s.ra - m.ra)
	);
	const inc = Math.atan2(149598000 * Math.sin(apart), m.dist - 149598000 * Math.cos(apart));
	return {
		sun: toPicture(sun.alt, sun.az),
		moon: {
			...toPicture(moon.alt, moon.az),
			fraction: (1 + Math.cos(inc)) / 2,
			// (which side of the sun it's on: east of it, it's waxing)
			waxing:
				Math.atan2(
					Math.cos(s.dec) * Math.sin(s.ra - m.ra),
					Math.sin(s.dec) * Math.cos(m.dec) -
						Math.cos(s.dec) * Math.sin(m.dec) * Math.cos(s.ra - m.ra)
				) < 0,
		},
	};
}

const smooth = (lo: number, hi: number, v: number) => {
	const t = Math.min(1, Math.max(0, (v - lo) / (hi - lo)));
	return t * t * (3 - 2 * t);
};

// ---------------------------------------------------------------------------
// From the weather to a scene.
// ---------------------------------------------------------------------------

interface Report {
	kind: WeatherKind;
	intensity: WeatherIntensity | null;
	condition: string | null;
	temperature: number | null;
	windSpeed: number | null;
	windGust: number | null;
	windBearing: number | null;
	/** Lightning about, whatever else it's doing. */
	thunder: boolean;
	live: boolean;
	attribution: string | null;
	/** Wind across the picture, given outright (an override's). */
	across?: number;
	/** The cloud layers the airport reports, if it has. */
	clouds?: WeatherClouds | null;
	/** How much of the moon is lit, 0 to 1, asked for outright (an override's). */
	moon?: number;
	/** Kinds of cloud asked for outright (an override's). */
	wanted?: (LowCloud | MidCloud | HighCloud)[];
}

// what the page had before it knew the weather
const DEFAULT: Report = {
	kind: "rain",
	intensity: "moderate",
	condition: null,
	temperature: null,
	windSpeed: 12,
	windGust: null,
	windBearing: 270,
	thunder: true,
	live: false,
	attribution: null,
};

function fromResponse(data: WeatherResponse): Report {
	const now = data.current;
	let { kind, intensity, condition } = now;
	// a station that's said nothing: go by the forecast for this hour, if
	// it's sure of itself
	const hour = data.hourly[0];
	if (kind === "unknown" && hour && hour.kind !== "unknown") {
		const falling = !["clear", "cloudy", "fog"].includes(hour.kind);
		const likely = (hour.precipChance ?? 0) >= 60;
		kind = falling && !likely ? "cloudy" : hour.kind;
		intensity = falling && likely ? hour.intensity : null;
		condition = falling && !likely ? "Cloudy" : hour.condition;
	}
	const wind = now.wind.speed != null ? now.wind : (hour?.wind ?? now.wind);
	return {
		kind,
		intensity,
		condition,
		temperature: now.temperature,
		windSpeed: wind.speed,
		windGust: wind.gust,
		windBearing: wind.bearing ?? bearingOf(wind.direction),
		thunder: data.thunderstorm,
		live: true,
		attribution: data.attribution,
		clouds: data.clouds ?? null,
	};
}

const POINTS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
function bearingOf(direction: string | null) {
	const at = direction ? POINTS.indexOf(direction.toUpperCase()) : -1;
	return at < 0 ? null : at * 22.5;
}

// How much of the sky is cloud, from the wording.
function coverOf(kind: WeatherKind, condition: string | null) {
	const c = (condition ?? "").toLowerCase();
	if (kind === "clear") return /mainly|mostly|few/.test(c) ? 0.2 : 0.04;
	if (kind === "cloudy" || kind === "unknown") {
		if (/overcast/.test(c)) return 1;
		if (/few clouds/.test(c)) return 0.25;
		if (/partly|mix of|clearing|increasing/.test(c)) return 0.5;
		if (/mostly|mainly/.test(c)) return 0.8;
		return /cloud/.test(c) ? 0.95 : 0.7;
	}
	return 1;
}

// ---------------------------------------------------------------------------
// The cloud. What kinds there are and how much of each comes, when it can,
// from what the airport actually reports: its METAR lists the layers it can
// see, each with how much of the sky it covers (few, scattered, broken,
// overcast) and how high its base is, and the height says which level a
// layer belongs to. The rest is the forecaster's rules of thumb: a heap of
// cloud on a warm afternoon is cumulus and the same amount on a cold night
// is stratocumulus; a low overcast is stratus, unless steady rain or snow
// is falling from it, which makes it nimbostratus; and so on.
//
// An automatic report can't see above about 10,000 ft, and a report can't
// see through a layer to what's above it, so when Environment Canada calls
// the sky cloudier than the layers add up to, the difference is put up
// high. With no report at all it's made up from their wording alone, and
// which of the plausible skies it is changes every couple of hours.
// ---------------------------------------------------------------------------

const LOW_KINDS: LowCloud[] = ["cumulus", "stratocumulus", "stratus", "nimbostratus", "cumulonimbus"];
const MID_KINDS: MidCloud[] = ["altocumulus", "altostratus"];
const HIGH_KINDS: HighCloud[] = ["cirrus", "cirrostratus", "cirrocumulus"];
const SHARE = { few: 0.18, scattered: 0.42, broken: 0.75, overcast: 1 };
const LOW_TOP = 6500; // ft: bases under this are low cloud
const MID_TOP = 20000;

// two shares of the sky, overlapping at random
const both = (a: number, b: number) => 1 - (1 - a) * (1 - b);

// a number from 0 to 1 that's the same for a couple of hours at a time
function chance(time: number, salt: number) {
	const x = Math.sin((Math.floor(time / 7_200_000) + salt * 97.13) * 12.9898) * 43758.5453;
	return x - Math.floor(x);
}

function layersOf(report: Report, wording: number, time: number, sunAlt: number): Layers {
	const { kind } = report;
	const c = (report.condition ?? "").toLowerCase();
	const month = new Date(time).getUTCMonth();
	const warm = report.temperature != null ? report.temperature > 7 : month >= 3 && month <= 9;
	// heaps of cloud are the sun's doing: a warm day's
	const convective = sunAlt > 12 && warm;
	const falling = ["rain", "snow", "mixed", "ice", "thunderstorm"].includes(kind);
	const showery = /shower|flurr|squall/.test(c);

	let low = 0;
	let mid = 0;
	let high = 0;
	let lowBase = 3000;
	let towering = false;
	let storm = kind === "thunderstorm";
	const seen = report.clouds;

	if (seen) {
		for (const layer of seen.layers) {
			const share = SHARE[layer.cover];
			const base = layer.base ?? 3000;
			if (base < LOW_TOP) {
				if (!low) lowBase = base;
				low = both(low, share);
			} else if (base < MID_TOP) mid = both(mid, share);
			else high = both(high, share);
			if (layer.type === "tcu") towering = true;
			if (layer.type === "cb") storm = true;
		}
		if (seen.obscured) {
			low = 1;
			lowBase = 200;
		}
		// what the report couldn't see: cloudier in words than in layers
		const shown = both(both(low, mid), high);
		if (wording > shown + 0.12 && low < 0.9 && mid < 0.9) {
			const more = (wording - shown) / Math.max(0.05, 1 - shown);
			if (seen.automatic && mid === 0 && chance(time, 1) < 0.35) mid = more;
			else high = both(high, more);
		}
	} else if (falling || kind === "fog") {
		low = showery ? 0.85 : kind === "fog" ? 0.75 : 1;
		lowBase = kind === "fog" ? 300 : 1500;
		mid = showery ? 0.4 : 0.9;
	} else {
		// from the wording alone: one of the skies that go by that name
		const pick = chance(time, 2);
		if (wording <= 0.08) high = pick < 0.4 ? 0.1 * chance(time, 3) : 0;
		else if (wording <= 0.3) {
			if (convective && pick < 0.6) low = wording;
			else if (pick < 0.75) high = wording * 1.2;
			else mid = wording;
		} else if (wording <= 0.6) {
			if (convective && pick < 0.5) [low, high] = [wording * 0.8, 0.2];
			else if (pick < 0.7) [mid, high] = [wording * 0.85, 0.15];
			else if (pick < 0.85) low = wording;
			else high = wording * 1.3;
		} else if (wording < 0.93) {
			if (pick < 0.4) [low, mid] = [wording * 0.8, 0.35];
			else if (pick < 0.7) [mid, low] = [wording * 0.85, convective ? 0.3 : 0.15];
			else [high, low] = [0.85, convective ? 0.35 : 0.2];
		} else if (pick < 0.55) low = 1;
		else [low, mid] = [0.9, 0.8];
		lowBase = low >= 0.9 ? 1800 : 4000;
	}
	// something's falling: there's the cloud for it to fall from
	if (falling) low = Math.max(low, showery ? 0.7 : 0.92);
	if (kind === "fog") low = Math.max(low, 0.7);
	if (storm) low = Math.max(low, 0.95);

	const layers: Layers = {
		low: {
			cover: Math.min(1, low),
			kind: storm
				? "cumulonimbus"
				: falling && !showery && low >= 0.9 && !/drizzle/.test(c)
					? "nimbostratus"
					: /drizzle/.test(c) || kind === "fog" || (low >= 0.9 && (lowBase < 2000 || !convective))
						? "stratus"
						: towering || (convective && low < 0.6) || (showery && convective)
							? "cumulus"
							: "stratocumulus",
		},
		mid: { cover: Math.min(1, mid), kind: mid >= 0.85 ? "altostratus" : "altocumulus" },
		high: {
			cover: Math.min(1, high),
			kind: high >= 0.6 ? "cirrostratus" : chance(time, 4) < 0.22 ? "cirrocumulus" : "cirrus",
		},
	};

	// kinds asked for by name
	for (const want of report.wanted ?? []) {
		if (LOW_KINDS.includes(want as LowCloud)) {
			layers.low.kind = want as LowCloud;
			layers.low.cover = Math.max(layers.low.cover, want === "cumulus" ? 0.35 : want === "stratocumulus" ? 0.7 : 1);
		} else if (MID_KINDS.includes(want as MidCloud)) {
			layers.mid.kind = want as MidCloud;
			layers.mid.cover = Math.max(layers.mid.cover, want === "altostratus" ? 1 : 0.55);
		} else {
			layers.high.kind = want as HighCloud;
			layers.high.cover = Math.max(layers.high.cover, want === "cirrostratus" ? 0.9 : 0.4);
		}
	}
	return layers;
}

const AMOUNT: Record<WeatherIntensity, number> = { light: 0.45, moderate: 1, heavy: 1.9 };

function compose(report: Report, time: number): Scene {
	const { kind, intensity } = report;
	const c = (report.condition ?? "").toLowerCase();
	const amount = AMOUNT[intensity ?? "moderate"];
	const sky = heavens(time);

	const scene: Scene = {
		kind,
		intensity,
		condition: report.condition,
		temperature: report.temperature,
		live: report.live,
		attribution: report.attribution,
		backdrop:
			rainPhoto && (kind === "rain" || kind === "thunderstorm") ? "photo" : "sky",
		rain: 0,
		drizzle: false,
		snow: 0,
		wet: false,
		pellets: 0,
		hail: false,
		glaze: false,
		lightning: 0,
		cover: coverOf(kind, report.condition),
		layers: {
			low: { cover: 0, kind: "cumulus" },
			mid: { cover: 0, kind: "altocumulus" },
			high: { cover: 0, kind: "cirrus" },
		},
		windy: 0,
		gloom: 0,
		fog: 0,
		wind: 0,
		gust: 0,
		sun: sky.sun,
		moon: sky.moon,
		day: smooth(-7, 5, sky.sun.alt),
	};

	switch (kind) {
		case "rain":
			scene.rain = amount;
			scene.drizzle = /drizzle/.test(c);
			scene.gloom = 0.35 + 0.22 * amount;
			break;
		case "thunderstorm":
			// a storm's rain is never light, whatever the wording
			scene.rain = Math.max(1.3, amount);
			scene.lightning = intensity === "heavy" ? 2.2 : 1.5;
			scene.gloom = 1;
			break;
		case "snow":
			scene.snow = amount;
			scene.gloom = 0.1 + 0.1 * amount;
			if (/blowing|blizzard|squall/.test(c)) scene.fog = 0.35;
			break;
		case "mixed":
			scene.rain = amount * 0.55;
			scene.snow = amount * 0.6;
			scene.wet = true;
			scene.gloom = 0.5;
			break;
		case "ice":
			if (/hail/.test(c)) {
				scene.pellets = amount;
				scene.hail = true;
				scene.rain = amount * 0.5;
				scene.gloom = 0.9;
			} else if (/pellet|crystal/.test(c)) {
				scene.pellets = amount;
				scene.gloom = 0.5;
			} else {
				// freezing rain or drizzle
				scene.rain = amount * 0.8;
				scene.drizzle = /drizzle/.test(c);
				scene.glaze = true;
				scene.gloom = 0.5;
			}
			break;
		case "fog":
			scene.fog = /mist|haze|smoke|shallow|patch/.test(c) ? 0.55 : 0.9;
			scene.cover = 0.75;
			scene.gloom = 0.2;
			break;
		case "cloudy":
		case "unknown":
			break;
		case "clear":
			break;
	}
	// (a storm warned of, with something else going on meanwhile)
	if (report.thunder && !scene.lightning && kind === "rain")
		scene.lightning = report.live ? 0.5 : 1;

	// The wind, across the picture. Looking south, a west wind (one from
	// 270°) blows left to right.
	const speed = report.windSpeed ?? 8;
	const across =
		report.across ??
		(report.windBearing == null
			? speed * 0.7
			: -Math.sin(report.windBearing * RAD) * speed);
	// (never quite none: nothing falls dead straight)
	scene.wind = Math.abs(across) < 2 ? (across < 0 ? -2 : 2) : across;
	scene.gust = Math.max(Math.abs(scene.wind), (report.windGust ?? speed * 1.3) * (Math.abs(across) / Math.max(1, speed)));
	if (report.moon != null) scene.moon = { ...scene.moon, fraction: report.moon };
	scene.windy = Math.min(1, (speed * 0.6 + (report.windGust ?? speed * 1.3) * 0.4) / 50);

	// the cloud, level by level, and all of it together
	scene.layers = layersOf(report, scene.cover, time, sky.sun.alt);
	const { low, mid, high } = scene.layers;
	scene.cover = both(both(low.cover, mid.cover), high.cover * 0.7);
	// (a sky that's only cloudy is as heavy as its low cloud is thick)
	if (kind === "cloudy" || kind === "unknown" || kind === "clear")
		scene.gloom = low.kind === "stratus" || low.kind === "nimbostratus" ? 0.3 * low.cover : 0.1 * low.cover;
	return scene;
}

// ---------------------------------------------------------------------------
// Overrides, for looking at weather that isn't happening.
// ---------------------------------------------------------------------------

interface Override {
	report: Partial<Report> | null;
	/** A time of day: an offset from now to when the sun's where it's wanted. */
	shift: number | null;
	/** ...or a time by the clock in Waterloo, in minutes after midnight: it stays that time. */
	minutes?: number | null;
}

/** What time it is in Waterloo, in minutes after midnight. */
export function minutesNow(time = Date.now()) {
	const parts = new Intl.DateTimeFormat("en-CA", {
		hour: "2-digit",
		minute: "2-digit",
		hourCycle: "h23",
		timeZone: "America/Toronto",
	}).formatToParts(new Date(time));
	const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
	return get("hour") * 60 + get("minute");
}

/** When, today, it's that many minutes after midnight in Waterloo. */
export const atMinutes = (minutes: number) =>
	Date.now() + (minutes - minutesNow()) * 60_000;

/** The time the sky is drawn for: the real one, unless another's been asked for. */
export const skyTime = () =>
	glimpse
		? glimpse.at
		: aside || override == null
			? Date.now()
			: override.minutes != null
				? atMinutes(override.minutes)
				: Date.now() + (override.shift ?? 0);

// When, in the next day, the sun is next at its highest, lowest, or
// coming up or going down through the horizon.
function when(what: "day" | "night" | "dawn" | "dusk") {
	const now = Date.now();
	const step = 5 * 60_000;
	let best = now;
	let bestScore = -Infinity;
	for (let t = now; t < now + 86_400_000; t += step) {
		const alt = sunAltitude(t);
		const rising = sunAltitude(t + step) > alt;
		const score =
			what === "day"
				? alt
				: what === "night"
					? -alt
					: -Math.abs(alt + 1.5) - (rising === (what === "dawn") ? 0 : 90);
		if (score > bestScore) {
			bestScore = score;
			best = t;
		}
	}
	return best - now;
}

const KINDS: Record<string, [WeatherKind, string]> = {
	clear: ["clear", "Clear"],
	sunny: ["clear", "Sunny"],
	fair: ["clear", "Mainly Clear"],
	partly: ["cloudy", "Partly Cloudy"],
	cloudy: ["cloudy", "Mostly Cloudy"],
	overcast: ["cloudy", "Overcast"],
	fog: ["fog", "Fog"],
	mist: ["fog", "Mist"],
	rain: ["rain", "Rain"],
	drizzle: ["rain", "Drizzle"],
	snow: ["snow", "Snow"],
	flurries: ["snow", "Flurries"],
	blizzard: ["snow", "Blizzard"],
	mixed: ["mixed", "Rain and Snow"],
	sleet: ["mixed", "Rain and Snow"],
	ice: ["ice", "Freezing Rain"],
	freezing: ["ice", "Freezing Rain"],
	pellets: ["ice", "Ice Pellets"],
	hail: ["ice", "Hail"],
	storm: ["thunderstorm", "Thunderstorm"],
	thunderstorm: ["thunderstorm", "Thunderstorm"],
};

function parse(spec: string): Override | null {
	const words = spec.toLowerCase().split(/[\s,+_-]+(?=[a-z])/).filter(Boolean);
	if (!words.length || words.includes("live")) return null;
	const report: Partial<Report> = {};
	let shift: number | null = null;
	let named = false;
	const wanted: (LowCloud | MidCloud | HighCloud)[] = [];
	for (const word of words) {
		if ([...LOW_KINDS, ...MID_KINDS, ...HIGH_KINDS].includes(word as LowCloud)) {
			wanted.push(word as LowCloud);
			continue;
		}
		// (moon=25: a quarter of it lit, to see a phase that isn't tonight's)
		const moon = /^moon=?(\d+(?:\.\d+)?)$/.exec(word);
		if (moon) {
			report.moon = Math.min(1, Number(moon[1]) / (Number(moon[1]) > 1 ? 100 : 1));
			continue;
		}
		const wind = /^wind=?(-?\d+(?:\.\d+)?)$/.exec(word);
		if (wind) {
			report.across = Number(wind[1]);
			report.windSpeed = Math.abs(report.across);
		} else if (word in KINDS) {
			const [kind, condition] = KINDS[word];
			const how = report.intensity;
			report.kind = kind;
			report.condition = how && how !== "moderate" ? `${how} ${condition}` : condition;
			if (word === "flurries") report.intensity ??= "light";
			if (word === "blizzard") {
				report.intensity = "heavy";
				report.across ??= 45;
			}
			named = true;
		} else if (word === "light" || word === "moderate" || word === "heavy") {
			report.intensity = word;
		} else if (word === "day" || word === "noon") shift = when("day");
		else if (word === "night") shift = when("night");
		else if (word === "dawn" || word === "sunrise") shift = when("dawn");
		else if (word === "dusk" || word === "sunset") shift = when("dusk");
	}
	// (kinds of cloud alone: a sky with just those in it)
	if (wanted.length && !named) {
		report.kind = "clear";
		report.condition = "Clear";
		named = true;
	}
	if (wanted.length) report.wanted = wanted;
	if (named) {
		// (made-up weather isn't under the airport's real cloud)
		report.clouds = null;
		report.intensity ??= "moderate";
		report.thunder = report.kind === "thunderstorm";
		report.live = false;
		report.attribution = null;
	}
	return {
		report: named || report.across != null || report.moon != null ? report : null,
		shift,
	};
}

// ---------------------------------------------------------------------------

declare global {
	interface Window {
		/** Try some weather on: see the top of src/lib/weather/index.ts. */
		__weather?: (spec?: string) => Scene;
	}
	interface WindowEventMap {
		weatherchange: Event;
	}
}

let latest: Report = DEFAULT;
// everything Environment Canada said, for the weather page (/weather)
let answer: WeatherResponse | null = null;

/** The whole of the last report: the hours ahead, the warnings, the lot. Null until there's been one. */
export const forecast = () => answer;
let override: Override | null = null;
let current: Scene | null = null;

// The weather page shows the weather: whatever's been picked on the about
// page is set aside for as long as that page is up.
let aside = false;

/** Set what's been picked on the about page aside (the real weather shows), or bring it back. */
export function setAside(on: boolean) {
	if (aside === on) return;
	aside = on;
	recompute();
}

const reportNow = (): Report => {
	const base = !aside && override?.report ? { ...latest, ...override.report } : latest;
	return glimpse ? { ...base, ...glimpse.report } : base;
};

/**
 * A look ahead: some hour or day of the forecast, to be shown in place of
 * now for as long as it's wanted (the weather page's, while it's being
 * looked through; nothing's kept). The sky is drawn for that time and that
 * weather: the sun and moon where they'll be, and cloud to suit the words,
 * since nobody's reported any yet.
 */
export interface Glimpse {
	at: number;
	kind: WeatherKind;
	intensity: WeatherIntensity | null;
	condition: string | null;
	temperature: number | null;
	windSpeed?: number | null;
	windGust?: number | null;
	windDirection?: string | null;
}
let glimpse: { at: number; report: Partial<Report> } | null = null;

/** Show that part of the forecast instead of now, or (null) go back to now. */
export function preview(to: Glimpse | null) {
	glimpse = to
		? {
				at: to.at,
				report: {
					kind: to.kind,
					intensity: to.intensity,
					condition: to.condition,
					temperature: to.temperature,
					thunder: to.kind === "thunderstorm",
					clouds: null,
					across: undefined,
					...(to.windSpeed != null
						? {
								windSpeed: to.windSpeed,
								windGust: to.windGust ?? null,
								windBearing: bearingOf(to.windDirection ?? null),
							}
						: {}),
				},
			}
		: null;
	recompute();
}

function recompute() {
	current = compose(reportNow(), skyTime());
	const root = document.documentElement;
	root.dataset.backdrop = current.backdrop;
	root.dataset.weather = current.kind;
	// (how light it is, for the stylesheet's scrim over the background: the
	// sky sets it as it goes, sky.ts, so the two change together. Without
	// a drawn sky it's set here.)
	if (!root.classList.contains("has-sky") || current.backdrop !== "sky")
		root.style.setProperty("--daylight", current.day.toFixed(3));
	window.dispatchEvent(new Event("weatherchange"));
}

/** The weather as the page should show it, right now. */
export function scene(): Scene {
	if (!current) current = compose(reportNow(), skyTime());
	return current;
}

/** The last weather Environment Canada gave, if it's still worth going by. */
function remembered(): Report | null {
	try {
		const kept = JSON.parse(localStorage.getItem(STORE) ?? "null");
		if (kept && Date.now() - kept.at < STORE_FRESH_MS) {
			answer = (kept.data as WeatherResponse | undefined) ?? null;
			return kept.report as Report;
		}
	} catch {
		// (no storage, or not ours: do without)
	}
	return null;
}

/** The weather to choose from on the about page, and the times of day. */
export const FORCE_KINDS = [
	"clear",
	"partly",
	"overcast",
	"fog",
	"drizzle",
	"rain",
	"storm",
	"flurries",
	"snow",
	"blizzard",
	"mixed",
	"ice",
	"hail",
] as const;
export type ForceKind = (typeof FORCE_KINDS)[number];

let forcedKind: ForceKind | null = null;
let forcedTime: number | null = null;

/**
 * What's been picked instead of the real weather and the real time (null:
 * the real one). The time is minutes after midnight in Waterloo.
 */
export const forced = () => ({ kind: forcedKind, time: forcedTime });

/** Pick some weather, a time of day, both, or (null) go back to the real ones. Remembered. */
export function force(kind: ForceKind | null, time: number | null) {
	forcedKind = kind;
	forcedTime = time;
	try {
		if (kind || time != null) localStorage.setItem(FORCE_STORE, `${kind ?? ""}|${time ?? ""}`);
		else localStorage.removeItem(FORCE_STORE);
	} catch {
		// (private window: it'll last as long as the page)
	}
	override = pick(kind, time);
	recompute();
}

function pick(kind: ForceKind | null, time: number | null): Override | null {
	if (!kind && time == null) return null;
	const made = kind ? parse(kind) : null;
	return { report: made?.report ?? null, shift: null, minutes: time };
}

/** Whether what the page shows is something other than the real weather at the real time (picked, or asked for in the address). */
export const pretending = () => (override != null && !aside) || glimpse != null;

/** Whether it's a part of the forecast that's showing (preview()), not now. */
export const previewing = () => glimpse != null;

/** What Environment Canada says it's doing, whatever's been picked; null if it hasn't said. */
export const reported = () =>
	latest.live
		? {
				condition: latest.condition,
				temperature: latest.temperature,
				attribution: latest.attribution,
			}
		: null;

let started = false;

export function startWeather() {
	if (started) return;
	started = true;

	latest = remembered() ?? DEFAULT;
	try {
		const want = new URLSearchParams(location.search).get("rainbg");
		if (want === "photo" || want === "sky") localStorage.setItem(RAIN_STORE, want);
		rainPhoto = localStorage.getItem(RAIN_STORE) === "photo";
	} catch {
		// (no storage)
	}

	// weather asked for in the address, or else picked on the about page
	const asked = new URLSearchParams(location.search).get("weather");
	let kept: string | null = null;
	try {
		kept = localStorage.getItem(FORCE_STORE);
	} catch {
		// (no storage)
	}
	if (asked) override = parse(asked);
	else if (kept) {
		// ("snow|930": the kind, and the minutes after midnight)
		const [word, minutes] = kept.split("|");
		forcedKind = FORCE_KINDS.find((k) => k === word) ?? null;
		forcedTime = minutes && Number.isFinite(Number(minutes)) ? Number(minutes) : null;
		override = pick(forcedKind, forcedTime);
	}
	recompute();

	window.__weather = (spec?: string) => {
		forcedKind = null;
		forcedTime = null;
		override = spec ? parse(spec) : null;
		recompute();
		return scene();
	};

	let fetched = 0; // when the weather was last asked for
	const refresh = async () => {
		fetched = Date.now();
		try {
			answer = await getWeather();
			latest = fromResponse(answer);
			try {
				localStorage.setItem(
					STORE,
					JSON.stringify({ at: Date.now(), report: latest, data: answer })
				);
			} catch {
				// (private window)
			}
			recompute();
		} catch {
			// (not to be had just now: whatever there was stands)
		}
	};
	refresh();
	setInterval(() => {
		if (document.visibilityState === "visible") refresh();
	}, REFRESH_MS);
	// the sun and moon move on, weather or no weather
	setInterval(() => {
		if (document.visibilityState === "visible") recompute();
	}, CLOCK_MS);
	// (a tab that's been in the background hasn't been asking: on coming
	// back to it, the sun's put right at once and the weather's asked for
	// again if what there is has gone stale)
	document.addEventListener("visibilitychange", () => {
		if (document.visibilityState !== "visible") return;
		recompute();
		if (Date.now() - fetched >= REFRESH_MS) refresh();
	});
}
