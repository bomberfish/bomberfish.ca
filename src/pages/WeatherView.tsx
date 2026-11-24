import { FC } from "dreamland/core";
import {
	Link,
	Panorama,
	PanoramaHeading,
	PanoramaSection,
	PanoramaTitle,
	PanoramaTrack,
	RingButton,
} from "../metro-dreamland";
import { glyphFor, weatherGlyph } from "../components/WeatherGlyph";
import { airTint } from "../lib/weather/sky";
import {
	forced,
	forecast,
	minutesNow,
	pretending,
	preview,
	setAside,
	previewing,
	scene,
	skyTime,
	sunAltitude,
	type Glimpse,
} from "../lib/weather/index";
import type { WeatherResponse } from "../lib/siteapi";

// The weather, as a page of its own: what the sky behind every other page
// is made from, written out. After Bing Weather, the one that came with
// Windows 8: a panorama, like the home page (metro-dreamland's <Panorama>),
// that goes sideways. The first screen is the sky with the place's name at
// its top and everything else along its bottom, the temperature in the
// biggest type on the site at the left and the days ahead in a row of
// columns beside it. Pan on, and there are the hours ahead as a line that
// rises and falls with them, and what's overhead (the cloud, level by
// level, the sun's day and the moon).
//
// It's a strip on a phone too (data-m-strip: the home page's panorama is a
// column there), with the ruler (below) docked along the bottom of the
// screen: the stylesheet's doing.
//
// The numbers are Environment Canada's for Kitchener-Waterloo, by way of
// siteapi (src/lib/weather/index.ts keeps the last report); the cloud
// levels are the airport's. None of it is known on the server, so the page
// comes with its headings and is filled in here (fill(), below), again
// whenever the weather's asked for again.
//
// The forecast can be looked through. Under the title is a ruler of the
// days ahead, an hour a tick, that slides under a needle: drag it (or
// scroll it, or pick an hour in the table or a day in the row, which
// slides it there) and the page shows the time under the needle instead of
// now, the sky behind it included. The sun and moon are where they'll be
// at that minute, so they move as it's dragged; the weather is whatever
// the forecast has nearest that time. It lasts as long as the page does.
//
// Styles: "the weather page" in src/style.css.

const PLACE = "America/Toronto";
const clock = (iso: string | null, minutes = true) => {
	if (!iso) return "–";
	const parts = new Intl.DateTimeFormat("en-CA", {
		hour: "numeric",
		minute: minutes ? "2-digit" : undefined,
		hour12: true,
		timeZone: PLACE,
	}).formatToParts(new Date(iso));
	const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
	const half = get("dayPeriod").toLowerCase().replace(/\./g, "");
	return minutes ? `${get("hour")}:${get("minute")} ${half}` : `${get("hour")} ${half}`;
};
const degrees = (n: number | null) => (n == null ? "–" : `${Math.round(n)}°`);
const isNight = (iso: string | null) =>
	sunAltitude(iso ? Date.parse(iso) : Date.now()) < -3;

// the moon's phase, by how much of it is lit and which way that's going
function phaseName(fraction: number, waxing: boolean) {
	if (fraction < 0.03) return "new moon";
	if (fraction > 0.97) return "full moon";
	if (fraction > 0.46 && fraction < 0.54) return waxing ? "first quarter" : "last quarter";
	return `${waxing ? "waxing" : "waning"} ${fraction < 0.5 ? "crescent" : "gibbous"}`;
}

// ...and a picture of it: the lit part is a half disc, with half an
// ellipse added to it (past half) or taken out of it (before)
function moonPicture(fraction: number, waxing: boolean) {
	const r = 10;
	const bulge = (r * Math.abs(1 - 2 * fraction)).toFixed(2);
	const lit = `M12 ${12 - r}A${r} ${r} 0 0 1 12 ${12 + r}A${bulge} ${r} 0 0 ${fraction > 0.5 ? 1 : 0} 12 ${12 - r}z`;
	return (
		<svg xmlns="http://www.w3.org/2000/svg" class="wx-moon" viewBox="0 0 24 24" aria-hidden="true">
			<circle cx="12" cy="12" r={r} class="wx-moon-dark" />
			<path d={lit} class="wx-moon-lit" transform={waxing ? undefined : "matrix(-1 0 0 1 24 0)"} />
		</svg>
	);
}

// A place in the forecast that can be shown instead of now.
interface Stop extends Glimpse {
	key: string;
	/** "3 pm", "wednesday", "thursday night" */
	label: string;
	rain: number | null;
}

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
// When a half-day of the forecast is, near enough: Environment Canada
// names them ("Tonight", "Wednesday", "Wednesday night"), it doesn't date
// them. A day is taken at one in the afternoon and a night at eleven.
function whenIs(name: string, night: boolean) {
	const now = Date.now();
	const today = new Date(
		new Date(now).toLocaleString("en-US", { timeZone: PLACE })
	).getDay();
	const hour = night ? 23 : 13;
	const day = WEEKDAYS.findIndex((d) => name.toLowerCase().startsWith(d));
	// ("tonight", after midnight, is what's left of this night: about now)
	if (day < 0) {
		if (night && minutesNow() < 6 * 60) return now + 30 * 60_000;
		return Math.max(now + 30 * 60_000, now + (hour * 60 - minutesNow()) * 60_000);
	}
	const ahead = (day - today + 7) % 7;
	return now + ahead * 86_400_000 + (hour * 60 - minutesNow()) * 60_000;
}

// Everywhere in the forecast there is to go, in order: the hours, then
// the days and nights past the last of them.
function stopsOf(data: WeatherResponse): Stop[] {
	const stops: Stop[] = data.hourly
		.filter((h) => h.time)
		.map((h) => ({
			key: `h:${h.time}`,
			label: clock(h.time, false),
			at: Date.parse(h.time!),
			kind: h.kind,
			intensity: h.intensity,
			condition: h.condition,
			temperature: h.temperature,
			windSpeed: h.wind.speed,
			windGust: h.wind.gust,
			windDirection: h.wind.direction,
			rain: h.precipChance,
		}));
	const last = stops.length ? stops[stops.length - 1].at : Date.now();
	for (const half of data.daily ?? []) {
		if (!half.name) continue;
		const at = whenIs(half.name, half.night);
		if (at <= last) continue;
		stops.push({
			key: `d:${half.name}`,
			label: half.name.toLowerCase(),
			at,
			kind: half.kind,
			intensity: half.intensity,
			condition: half.summary,
			temperature: half.temperature,
			rain: half.precipChance,
		});
	}
	return stops.sort((a, b) => a.at - b.at);
}

const COVER_WORDS: [number, string][] = [
	[0.1, "a trace"],
	[0.3, "a few"],
	[0.6, "scattered"],
	[0.9, "broken"],
	[2, "overcast"],
];
const coverWord = (cover: number) => COVER_WORDS.find(([upTo]) => cover <= upTo)![1];

function WeatherView(this: FC) {
	const part = (name: string) => this.root?.querySelector<HTMLElement>(`.wx-${name}`) ?? null;
	const put = (name: string, ...children: (Node | string)[]) =>
		part(name)?.replaceChildren(...children);

	// The hours ahead, as Bing had them: a table, a row an hour, the rows
	// sharing the section's height between them. (Not a chart: the next
	// twelve hours are often within a degree or two of each other, and a
	// line drawn through that to fill a screen is a cliff made of nothing.)
	const hours = (data: WeatherResponse) => {
		const list = data.hourly.slice(0, 12);
		if (!list.length) return <p class="wx-none">no forecast for the next hours just now.</p>;
		return (
			<table class="wx-table">
				<thead>
					<tr>
						<th scope="col">time</th>
						<th scope="col" colspan="2">
							forecast
						</th>
						<th scope="col">temp</th>
						<th scope="col">chance</th>
						<th scope="col">wind</th>
					</tr>
				</thead>
				<tbody>
					{list.map((h) => (
						<tr
							class={`wx-pick${at === `h:${h.time}` ? " is-picked" : ""}`}
							tabindex="0"
							title="show this hour"
							on:click={() => go(`h:${h.time}`)}
							on:keydown={(e: KeyboardEvent) => e.key === "Enter" && go(`h:${h.time}`)}
						>
							<th scope="row">
								<time>{clock(h.time, false)}</time>
							</th>
							<td class="wx-table-glyph">
								{weatherGlyph(glyphFor(h.kind, h.condition, h.intensity, isNight(h.time)))}
							</td>
							<td class="wx-table-words">{(h.condition ?? "").toLowerCase()}</td>
							<td class="wx-table-temp">{degrees(h.temperature)}</td>
							<td>{h.precipChance ? `${Math.round(h.precipChance)}%` : "–"}</td>
							<td>
								{h.wind.speed != null
									? `${Math.round(h.wind.speed)} km/h${h.wind.direction ? ` ${h.wind.direction.toLowerCase()}` : ""}`
									: "–"}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		);
	};

	// The days ahead, a column a day: its high over its low, a picture and
	// a few words. Environment Canada gives days and nights in turn; a
	// night goes under the day before it. (From an older siteapi there are
	// no days: the next hours stand in for them.)
	const days = (data: WeatherResponse) => {
		interface Day {
			key: string;
			name: string;
			glyph: string;
			words: string | null;
			high: number | null;
			low: number | null;
			rain: number | null;
		}
		const list: Day[] = [];
		for (const half of data.daily ?? []) {
			const last = list[list.length - 1];
			if (half.night && last && last.low == null && last.high != null) {
				last.low = half.temperature;
				continue;
			}
			list.push({
				key: `d:${half.name}`,
				name: (half.name ?? "").toLowerCase().replace(/ night$/, ""),
				glyph: glyphFor(half.kind, half.summary, half.intensity, half.night),
				words: half.summary,
				high: half.night ? null : half.temperature,
				low: half.night ? half.temperature : null,
				rain: half.precipChance,
			});
		}
		if (!list.length)
			for (const h of data.hourly.slice(0, 6))
				list.push({
					key: `h:${h.time}`,
					name: clock(h.time, false),
					glyph: glyphFor(h.kind, h.condition, h.intensity, isNight(h.time)),
					words: h.condition,
					high: h.temperature,
					low: null,
					rain: h.precipChance,
				});
		return list.slice(0, 6).map(
			(d) =>
				(
					<li
						class={`wx-pick${at === d.key ? " is-picked" : ""}`}
						tabindex="0"
						title="show this day"
						on:click={() => go(d.key)}
						on:keydown={(e: KeyboardEvent) => e.key === "Enter" && go(d.key)}
					>
						<b class="wx-day-name">{d.name}</b>
						{weatherGlyph(d.glyph)}
						<span class="wx-day-temps">
							{d.high != null ? <span>{degrees(d.high)}</span> : false}
							{d.low != null ? (
								d.high != null ? (
									<small>{degrees(d.low)}</small>
								) : (
									<span class="wx-day-low">{degrees(d.low)}</span>
								)
							) : (
								false
							)}
						</span>
						<span class="wx-day-words">{(d.words ?? "").toLowerCase()}</span>
						{d.rain ? <span class="wx-day-rain">{Math.round(d.rain)}% chance</span> : false}
					</li>
				) as Node
		);
	};

	const fact = (label: string, value: string, more?: string) => (
		<div class="wx-fact">
			<dt>{label}</dt>
			<dd>
				{value}
				{more ? <small>{more}</small> : false}
			</dd>
		</div>
	);

	// Where in the forecast the page is showing: the stop nearest the time
	// under the ruler's needle (its key), or null for now; and that time.
	let at: string | null = null;
	let needle: number | null = null;
	// the ruler: when its left end is, and how many hours long it is
	let origin = 0;
	let span = 0;
	let ruled = ""; // which forecast it was drawn for

	const ruler = () => this.root?.querySelector<HTMLElement>(".wx-ruler") ?? null;
	// (it's sized in rems, which here go with the window: measured, not known)
	const hoursPerPx = () => {
		const inner = ruler()?.firstElementChild as HTMLElement | null;
		return inner?.offsetWidth ? span / inner.offsetWidth : 0;
	};
	const nearest = (stops: Stop[], time: number) =>
		stops.reduce<Stop | null>(
			(best, s) => (!best || Math.abs(s.at - time) < Math.abs(best.at - time) ? s : best),
			null
		);

	// The ruler's been moved: show what's under the needle now.
	const scrub = () => {
		const r = ruler();
		const data = forecast();
		if (!r || !data) return;
		const hours = r.scrollLeft * hoursPerPx();
		const stop = hours < 0.35 ? null : nearest(stopsOf(data), origin + hours * 3_600_000);
		if (!stop) {
			if (at === null && !previewing()) return;
			at = null;
			needle = null;
			preview(null);
			return;
		}
		at = stop.key;
		needle = origin + hours * 3_600_000;
		// (the stop's weather, at the needle's own time: this redraws the
		// page, the sky's change being the weather's changing)
		preview({ ...stop, at: needle });
	};

	// Go to a stop (an hour of the table, a day of the row), or (null) back
	// to now: the ruler slides there, and the page follows it.
	const go = (key: string | null) => {
		const data = forecast();
		const stops = data ? stopsOf(data) : [];
		let stop = stops.find((s) => s.key === key) ?? null;
		// (a day that's inside the hours' range, "tonight" mostly: the
		// hour nearest it)
		if (!stop && key?.startsWith("d:") && data) {
			const half = (data.daily ?? []).find((d) => `d:${d.name}` === key);
			if (half?.name) stop = nearest(stops, whenIs(half.name, half.night));
		}
		const r = ruler();
		const scale = hoursPerPx();
		if (r && scale) {
			r.scrollTo({
				left: stop ? Math.max(0, (stop.at - origin) / 3_600_000 / scale) : 0,
				behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
					? "auto"
					: "smooth",
			});
			return;
		}
		at = stop?.key ?? null;
		needle = stop?.at ?? null;
		preview(stop);
	};

	// Draw the ruler for a forecast: a tick an hour from now to the end of
	// it, the six-hour ones taller and named (a midnight by the day it
	// starts), a band along it in the colours of the sky at each hour, and
	// over that the forecast's own pictures where it has them.
	const rule = (stops: Stop[]) => {
		const r = ruler();
		if (!r) return;
		origin = Date.now();
		span = stops.length
			? Math.ceil((stops[stops.length - 1].at - origin) / 3_600_000) + 1
			: 0;
		const minute = minutesNow();
		const band: string[] = [];
		for (let h = 0; h <= span; h++)
			band.push(
				`${airTint(sunAltitude(origin + h * 3_600_000))} ${((h / Math.max(1, span)) * 100).toFixed(2)}%`
			);
		const marks: Node[] = [];
		for (let m = (360 - (minute % 360)) % 360; m <= span * 60; m += 360) {
			const clockAt = (minute + m) % 1440;
			const day = clockAt === 0;
			marks.push(
				(
					<span class={`wx-ruler-mark${day ? " is-day" : ""}`} style={`--at: ${(m / 60).toFixed(3)}`}>
						{day
							? new Intl.DateTimeFormat("en-CA", { weekday: "long", timeZone: PLACE })
									.format(origin + m * 60_000)
									.toLowerCase()
							: clockAt === 720
								? "noon"
								: clockAt === 360
									? "6 am"
									: "6 pm"}
					</span>
				) as Node
			);
		}
		const shown = stops.filter((s, i) => s.key.startsWith("d:") || i % 3 === 0);
		const inner = (
			<div
				class="wx-ruler-inner"
				style={
					`--span: ${span}; --hour: ${((60 - (minute % 60)) / 60).toFixed(3)}; ` +
					`--six: ${(((360 - (minute % 360)) % 360) / 60).toFixed(3)}; ` +
					`--band: linear-gradient(to right, ${band.join(", ")})`
				}
			>
				{shown.map((s) => (
					<span
						class="wx-ruler-stop"
						style={`--at: ${((s.at - origin) / 3_600_000).toFixed(3)}`}
					>
						{weatherGlyph(glyphFor(s.kind, s.condition, s.intensity, isNight(new Date(s.at).toISOString())))}
						<b>{degrees(s.temperature)}</b>
					</span>
				))}
				{marks}
			</div>
		) as Node;
		r.replaceChildren(inner);
		r.scrollLeft = 0;
	};

	let shown = false; // this page has been on screen
	let filled = ""; // what the page was last filled in for
	const fill = () => {
		// (left the page: stop listening. Not just "not on the page", though:
		// a page is made before it's put there.)
		if (this.root?.isConnected) shown = true;
		else if (shown) {
			window.removeEventListener("weatherchange", fill);
			return;
		}
		const data = forecast();
		const sky = scene();
		const picked = forced();
		if (!data) {
			put("cond", "waiting to hear from environment canada…");
			return;
		}
		const now = data.current;
		const stops = stopsOf(data);
		const then = (previewing() && stops.find((s) => s.key === at)) || null;
		if (!then) at = null;

		// ---- when: now, or the time under the ruler's needle ----
		const which = `${data.updatedAt}|${stops.length}`;
		if (which !== ruled) {
			ruled = which;
			rule(stops);
		}
		const when = part("when");
		if (when) {
			when.classList.toggle("is-ahead", !!then);
			const time = needle ?? then?.at ?? 0;
			const sameDay =
				new Intl.DateTimeFormat("en-CA", { weekday: "short", timeZone: PLACE }).format(time) ===
				new Intl.DateTimeFormat("en-CA", { weekday: "short", timeZone: PLACE }).format(Date.now());
			put(
				"when-label",
				then
					? (sameDay
							? ""
							: `${new Intl.DateTimeFormat("en-CA", { weekday: "long", timeZone: PLACE }).format(time).toLowerCase()} `) +
							clock(new Date(time).toISOString())
					: "now"
			);
			put("when-note", then ? "forecast" : "drag to look ahead");
			when.querySelector<HTMLElement>(".wx-back-now")!.hidden = !then;
		}

		// (while the needle's moving within one stop of the forecast, the
		// time's all that changes: the rest of the page stays as it is)
		const state = `${which}|${at}|${pretending()}|${picked.kind}|${picked.time}`;
		const full = state !== filled;
		filled = state;
		if (full) {
		// ---- now ----
		put("place", (data.location.name ?? "waterloo").toLowerCase());
		put("days", ...days(data));
		if (then) {
			put("glyph", weatherGlyph(glyphFor(then.kind, then.condition, then.intensity, sky.day < 0.35)) as Node);
			put("temp", degrees(then.temperature));
			put("cond", (then.condition ?? "no word on the sky").toLowerCase());
			put("asof", `the forecast for ${then.label}`);
		} else {
			put("glyph", weatherGlyph(glyphFor(now.kind, now.condition, now.intensity, sky.day < 0.35)) as Node);
			put("temp", degrees(now.temperature));
			put("cond", (now.condition ?? "no word on the sky").toLowerCase());
			put(
				"asof",
				`as of ${clock(now.observedAt)}` +
					(now.station ? ` at ${now.station.toLowerCase()}` : "")
			);
		}
		const wind = now.wind;
		if (then)
			put(
				"facts",
				...([
					then.windSpeed != null
						? fact(
								"wind",
								`${Math.round(then.windSpeed)} km/h`,
								[
									then.windDirection?.toLowerCase(),
									then.windGust ? `gusting ${Math.round(then.windGust)}` : null,
								]
									.filter(Boolean)
									.join(", ")
							)
						: null,
					then.rain ? fact("chance", `${Math.round(then.rain)}%`, "of rain or snow") : null,
				].filter(Boolean) as Node[])
			);
		else put(
			"facts",
			...([
				now.feelsLike != null ? fact("feels like", degrees(now.feelsLike)) : null,
				wind.speed != null
					? fact(
							"wind",
							`${Math.round(wind.speed)} km/h`,
							[wind.direction?.toLowerCase(), wind.gust ? `gusting ${Math.round(wind.gust)}` : null]
								.filter(Boolean)
								.join(", ")
						)
					: null,
				now.humidity != null ? fact("humidity", `${Math.round(now.humidity)}%`) : null,
				now.dewpoint != null ? fact("dew point", degrees(now.dewpoint)) : null,
				now.pressure != null ? fact("pressure", `${now.pressure.toFixed(1)} kPa`) : null,
				now.visibility != null ? fact("visibility", `${Math.round(now.visibility)} km`) : null,
			].filter(Boolean) as Node[])
		);

		// ---- warnings ----
		put(
			"warnings",
			...data.warnings.map(
				(w) =>
					(
						<a class="tile c-red wx-warning" href={w.url ?? data.location.url ?? "#"} target="_blank">
							<b>{(w.description ?? w.type ?? "weather warning").toLowerCase()}</b>
							{w.expiresAt ? <span>until {clock(w.expiresAt)}</span> : false}
						</a>
					) as Node
			)
		);

		// ---- the hours ahead ----
		put("hours", hours(data) as Node);

		// ---- overhead ----
		// The sky from top to bottom, a band a level, each as tall as its
		// share of the section: what kind of cloud is at it, how much, and
		// (from the airport's report, when it's the real sky) how high its
		// base is.
		const seen = pretending() ? [] : (data.clouds?.layers ?? []);
		const BANDS = {
			high: { name: "high", span: "above 6 km", from: 20000, to: Infinity },
			mid: { name: "middle", span: "2 to 6 km", from: 6500, to: 20000 },
			low: { name: "low", span: "under 2 km", from: 0, to: 6500 },
		};
		const levels = (["high", "mid", "low"] as const).map((name) => {
			const layer = sky.layers[name];
			const band = BANDS[name];
			const there = layer.cover > 0.05;
			const bases = seen
				.filter((l) => l.base != null && l.base >= band.from && l.base < band.to)
				.map((l) => l.base!);
			const base = bases.length ? Math.min(...bases) : null;
			return (
				<li class={there ? "" : "is-clear"}>
					<span class="wx-level">
						{band.name}
						<small>{band.span}</small>
					</span>
					<div class="wx-level-what">
						<b class="wx-kind">{there ? layer.kind : "clear"}</b>
						<span class="wx-level-more">
							{there
								? coverWord(layer.cover) +
									(base != null
										? `, base at ${Math.round((base * 0.3048) / 10) * 10} m`
										: "")
								: "nothing at this level"}
						</span>
						<span class="wx-bar" aria-hidden="true">
							<i style={`width: ${Math.round(Math.min(1, layer.cover) * 100)}%`} />
						</span>
					</div>
				</li>
			);
		});
		put("levels", ...(levels as Node[]));
		const raw = data.clouds?.raw;
		const set = [
			picked.kind,
			picked.time != null
				? `${Math.floor(picked.time / 60) % 12 || 12}:${`${picked.time % 60}`.padStart(2, "0")} ${picked.time < 720 ? "am" : "pm"}`
				: null,
		]
			.filter(Boolean)
			.join(", ");
		put("metar", raw && !pretending() ? raw : "");
		put(
			"picked",
			then
				? `(this is the sky that's forecast for ${then.label}: nobody's seen it yet, so the cloud is what usually goes with "${(then.condition ?? "that").toLowerCase()}".)`
				: pretending()
					? `(the sky behind this page is ${set ? `set to ${set} on the site info page` : "one that's been asked for"}, so it and the cloud above aren't the real ones. the numbers are.)`
					: ""
		);

		}

		const rise = data.sun.sunrise;
		const sunset = data.sun.sunset;
		const length =
			rise && sunset ? Math.round((Date.parse(sunset) - Date.parse(rise)) / 60_000) : null;
		// The sun's day: an arc from where it comes up to where it goes
		// down, as much of it drawn solid as there's been of the day, and
		// the sun on it where it is now.
		const drawn = skyTime();
		const day =
			rise && sunset
				? (drawn - Date.parse(rise)) / (Date.parse(sunset) - Date.parse(rise))
				: NaN;
		// (the report's rise and set are today's: another day's sun is
		// placed by the time of day alone)
		const along = Number.isFinite(day) ? day - Math.floor(day / 1) * 0 : NaN;
		const up = along >= 0 && along <= 1;
		const sx = 100 - 88 * Math.cos(Math.PI * Math.min(1, Math.max(0, along)));
		const sy = 86 - 70 * Math.sin(Math.PI * Math.min(1, Math.max(0, along)));
		put(
			"sun",
			(
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="wx-arc"
					viewBox="0 0 200 100"
					aria-hidden="true"
				>
					<path class="wx-arc-all" d="M12 86A88 70 0 0 1 188 86" />
					{up ? (
						<path class="wx-arc-done" d={`M12 86A88 70 0 0 1 ${sx.toFixed(2)} ${sy.toFixed(2)}`} />
					) : (
						false
					)}
					<path class="wx-arc-ground" d="M2 86H198" />
					{up ? <circle class="wx-arc-sun" cx={sx.toFixed(2)} cy={sy.toFixed(2)} r="5" /> : false}
				</svg>
			) as Node,
			(
				<div class="wx-arc-ends">
					{fact("sunrise", clock(rise))}
					{fact(
						up ? "the sun is" : "the sun is",
						sky.sun.alt > 0 ? `${Math.round(sky.sun.alt)}° up` : "down",
						length != null && length > 0
							? `${Math.floor(length / 60)} h ${length % 60} min of daylight today`
							: undefined
					)}
					{fact("sunset", clock(sunset))}
				</div>
			) as Node
		);
		put(
			"moonbox",
			moonPicture(sky.moon.fraction, sky.moon.waxing) as Node,
			(
				<div>
					<b>{phaseName(sky.moon.fraction, sky.moon.waxing)}</b>
					<span>
						{Math.round(sky.moon.fraction * 100)}% lit,{" "}
						{sky.moon.alt > 0 ? `${Math.round(sky.moon.alt)}° up` : "below the horizon"}
					</span>
				</div>
			) as Node
		);

		// ---- credit ----
		const credit = part("credit");
		if (credit) {
			credit.replaceChildren(
				`${data.attribution}. cloud layers: ${data.clouds ? `${data.clouds.station}'s aviation report` : "worked out from the wording"}. `
			);
			if (data.location.url) {
				const a = document.createElement("a");
				a.href = data.location.url;
				a.target = "_blank";
				a.textContent = "the full forecast";
				credit.append(a, ".");
			}
		}
	};

	this.cx.mount = () => {
		if (import.meta.env.SSR) return;
		// (this page is the real weather, whatever's been picked for the rest)
		setAside(true);
		fill();
		window.addEventListener("weatherchange", fill);
		// The ruler: sliding it is scrolling it. A wheel over it turns it
		// (rather than panning the page, which is what a wheel does
		// anywhere else here), and a mouse can take hold of it and drag.
		const r = ruler();
		if (r) {
			let queued = 0;
			r.addEventListener(
				"scroll",
				() => {
					queued ||= requestAnimationFrame(() => {
						queued = 0;
						scrub();
					});
				},
				{ passive: true }
			);
			r.addEventListener(
				"wheel",
				(e) => {
					e.preventDefault();
					e.stopPropagation();
					r.scrollLeft += Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
				},
				{ passive: false }
			);
			let held: { x: number; left: number } | null = null;
			r.addEventListener("pointerdown", (e) => {
				e.stopPropagation();
				if (e.pointerType !== "mouse" || e.button !== 0) return;
				held = { x: e.clientX, left: r.scrollLeft };
				r.setPointerCapture(e.pointerId);
				r.classList.add("is-held");
			});
			r.addEventListener("pointermove", (e) => {
				if (held) r.scrollLeft = held.left - (e.clientX - held.x);
			});
			const letGo = () => {
				held = null;
				r.classList.remove("is-held");
			};
			r.addEventListener("pointerup", letGo);
			r.addEventListener("pointercancel", letGo);
		}
		// (a look ahead is this page's: leaving it is back to now, for the
		// sky behind every other page)
		const leaving = new MutationObserver(() => {
			if (this.root?.isConnected) return;
			if (!shown) return;
			leaving.disconnect();
			window.removeEventListener("weatherchange", fill);
			if (previewing()) preview(null);
			setAside(false);
		});
		leaving.observe(document.querySelector("#app") ?? document.body, {
			childList: true,
			subtree: true,
		});
	};

	return (
		<main class="pano-page weather-page" data-m-page="pano" data-m-strip>
			<title>weather – bomberfish.ca</title>
			<meta
				name="description"
				content="The weather in Waterloo, Ontario right now: what the sky behind the rest of the site is made from."
			/>
			<Panorama>
				<PanoramaTitle class="wx-title">
					<RingButton
						to="/"
						arrow
						class="wx-back"
						title="back"
						aria-label="back"
						data-m-back="/"
					>
						<span class="material-symbols" aria-hidden="true">
							{"\uE071"}
						</span>
					</RingButton>
					<h1 class="wx-place" data-m-feather>
						kitchener-waterloo
					</h1>
				</PanoramaTitle>

				{/* When the page is showing: now, or a step along the forecast.
				    It stays put while the sections pan under it. */}
				<div class="wx-when" data-m-feather>
					<p aria-live="polite">
						<b class="wx-when-label">now</b>
						<span class="wx-when-note">drag to look ahead</span>
					</p>
					<div class="wx-ruler-box">
						<div
							class="wx-ruler"
							tabindex="0"
							role="group"
							aria-label="the forecast: scroll to look ahead"
						/>
					</div>
					<button type="button" class="wx-back-now" hidden on:click={() => go(null)}>
						back to now
					</button>
				</div>

				<PanoramaTrack>
					<PanoramaSection class="wx-now-item" id="now" aria-label="right now">
						<div class="wx-now" data-m-feather>
							<div class="wx-big">
								<p class="wx-temp">–°</p>
								<span class="wx-glyph" />
							</div>
							<p class="wx-cond">…</p>
							<p class="wx-asof" />
							<dl class="wx-facts" />
							<div class="wx-warnings" />
						</div>
					</PanoramaSection>

					<PanoramaSection class="wx-days-item" id="daily">
						<ol class="wx-days" aria-label="the days ahead" data-m-feather />
					</PanoramaSection>

					<PanoramaSection class="wx-hours-item" id="hourly">
						<PanoramaHeading>hourly forecast</PanoramaHeading>
						<div class="wx-hours" data-m-feather />
					</PanoramaSection>

					<PanoramaSection class="wx-cloud" id="overhead">
						<PanoramaHeading>overhead</PanoramaHeading>
						<div data-m-feather>
							<ul class="wx-levels" />
							<code class="wx-metar" />
							<p class="wx-picked" />
						</div>
					</PanoramaSection>

					<PanoramaSection class="wx-lights" id="sun">
						<PanoramaHeading>sun and moon</PanoramaHeading>
						<div data-m-feather>
							<dl class="wx-sun wx-facts" />
							<div class="wx-moonbox" />
						</div>
						<div class="wx-foot" data-m-feather>
							<p class="wx-credit" />
							<p class="wx-more">
								this is the weather the page's background is made of.{" "}
								<Link href="/siteinfo">pick a different one</Link>.
							</p>
						</div>
					</PanoramaSection>
				</PanoramaTrack>
			</Panorama>
		</main>
	);
}

export default WeatherView;
