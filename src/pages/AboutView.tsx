import { FC, createState, Stateful } from "dreamland/core";
import SiteNav, { Pivot } from "../components/SiteNav";
import Footer from "../components/Footer";
import {
	Button,
	Page,
	PageHeader,
	Slider,
	Tile,
	TileLabel,
	Tiles,
	type Material,
	material,
	placeSlider,
	setMaterial,
} from "metro-dreamland";

// (this site's own first: it's what there is until flat is picked)
const MATERIALS: Material[] = ["acrylic", "flat"];
import ColorStrip, { paintStrip, placeStrip } from "../components/ColorStrip";
import {
	ACCENTS,
	currentAccent,
	CUSTOM_ACCENT,
	CUSTOM_RANGE,
	customAccent,
	DEFAULT_ACCENT,
	hexToHsl,
	hslToHex,
	hslVars,
	setAccent,
	setCustomAccent,
	type Hsl,
} from "../lib/accent";
import {
	FORCE_KINDS,
	atMinutes,
	minutesNow,
	sunAltitude,
	force,
	forced,
	type ForceKind,
} from "../lib/weather/index";
import { weatherGlyph } from "../components/WeatherGlyph";
import {
	gpuDetected,
	gpuKnown,
	gpuPicked,
	gpuQuality,
	pickGpu,
	type Quality,
} from "../lib/weather/gpu";
import { airTint } from "../lib/weather/sky";

const archives = [
	{
		version: "v1.0",
		date: "20221208174845",
	},
	{
		version: "v2.0",
		date: "20230329131753",
	},
	{
		version: "v2.5",
		date: "20230601000329",
	},
	{
		version: "v3.0",
		date: "20231228101224",
	},
	{
		version: "v4.0",
		date: "20240215120000",
		origin: "https://bomberfish.neocities.org/",
	},
	{
		version: "v5.0",
		date: "20240510145230",
	},
	{
		version: "v5.1",
		date: "20240512001802",
	},
	{
		version: "v5.1.1",
		date: "20240711023745",
	},
	{
		version: "v5.2",
		date: "20240918135402",
	},
	{
		version: "v5.2.1",
		date: "20241007023446",
	},
	{
		version: "v5.2.2",
		date: "20250121010540",
	},
	{
		version: "v5.3",
		date: "20250330171906",
	},
	{
		version: "v5.4.1",
		date: "20251014143924id_",
	},
	{
		version: "v6.2.0",
		date: "20251031190526",
	},
	{
		version: "v7.0.3",
		date: "20251122233719",
	},
	{
		version: "v8.0.0",
		date: "20251225232714",
	},
	{
		version: "v9.3.2",
		date: "20260328000543",
	},
	{
		version: "v10.1.0",
		date: "20260930175255",
	},
	{
		version: "v10.3.0",
		date: "20261101010933",
	},
	{
		version: "v11.0.5",
		date: "20261108064555"
	}
];

// the surface and text colours, darkest to lightest
const colors = [
	"core",
	"mantle",
	"crust",
	"base",
	"surface0",
	"surface1",
	"surface2",
	"surface3",
	"surface4",
	"surface5",
	"surface6",
	"overlay0",
	"overlay1",
	"overlay2",
	"overlay3",
	"subtext3",
	"subtext2",
	"subtext1",
	"subtext0",
	"text1",
	"text",
	"supertext",
];

// the ones light enough to need dark type on their swatch
const brightColors = [
	"supertext",
	"text",
	"text1",
	"subtext0",
	"subtext1",
	"subtext2",
	"overlay3",
	"overlay2",
	"overlay1",
	"overlay0",
];

// Styles: "About" in src/style.css.
export function AboutView(this: FC) {
	// Which colour on the strip is the one chosen. Put there by hand, not
	// bound to state: the strip someone lands on is the server's, hydrated,
	// and an attribute on a hydrated node doesn't follow a pointer (so the
	// mark stayed on the default whatever was picked, or remembered).
	const strip = () =>
		this.root?.querySelector<HTMLElement>(".accent-picker .m-colorstrip");
	const mark = (name: string) => placeStrip(strip(), name);

	// The custom colour: its place on the strip takes it on, and its sliders
	// (shown while it's the accent in use) are put where it is, each bar
	// showing the colours that moving along it would give.
	const sliders = () =>
		Array.from(
			this.root?.querySelectorAll<HTMLInputElement>(
				".accent-custom .m-slider input"
			) ?? []
		);
	const showCustom = (hsl: Hsl, open: boolean) => {
		const panel = this.root?.querySelector<HTMLElement>(".accent-custom");
		const [hue, sat, light] = sliders();
		if (!panel || !light) return;
		panel.hidden = !open;
		const [h, s, l] = hsl;
		paintStrip(strip(), CUSTOM_ACCENT, `hsl(${hslVars(h, s, l).hsl})`);
		[hue, sat, light].forEach((input, i) => placeSlider(input, hsl[i]));
		const along = (stops: string[]) =>
			`linear-gradient(to right, ${stops.join(", ")})`;
		hue.style.setProperty(
			"--track",
			along(
				[0, 60, 120, 180, 240, 300, 360].map((d) => `hsl(${d} ${s}% ${l}%)`)
			)
		);
		sat.style.setProperty(
			"--track",
			along([`hsl(${h} 0% ${l}%)`, `hsl(${h} 100% ${l}%)`])
		);
		const [from, to] = [CUSTOM_RANGE.min[2], CUSTOM_RANGE.max[2]];
		light.style.setProperty(
			"--track",
			along([from, (from + to) / 2, to].map((at) => `hsl(${h} ${s}% ${at}%)`))
		);
	};

	// The browser's own colour picker is another way to the same three
	// numbers: an <input type="color"> under a button that opens it. It's
	// kept at the custom colour, so that's where its picker starts. (Not
	// while the picker's the one doing the choosing, though: writing a
	// rounded colour back to it mid-drag would move what's under the hand.)
	const picker = () =>
		this.root?.querySelector<HTMLInputElement>(".accent-pick input") ?? null;
	const setPicker = (hsl: Hsl) => {
		const input = picker();
		if (input) input.value = hslToHex(...hsl);
	};
	const openPicker = () => {
		const input = picker();
		if (!input) return;
		try {
			input.showPicker();
		} catch {
			// no showPicker() here (Safari before 16), or it wouldn't
			input.click();
		}
	};
	// it gives any colour at all; the accent takes the nearest it allows
	const picked = (settled: boolean) => {
		const input = picker();
		if (!input) return;
		const hsl = setCustomAccent(hexToHsl(input.value));
		mark(CUSTOM_ACCENT);
		showCustom(hsl, true);
		if (settled) setPicker(hsl);
	};

	// The material: two sample tiles, one of each, and the one in use is
	// marked (by hand, like the rest here: they're the server's, hydrated).
	const markMaterial = () => {
		const now = material();
		for (const sample of this.root?.querySelectorAll<HTMLElement>(
			".material-sample"
		) ?? []) {
			const on = sample.dataset.name === now;
			sample.setAttribute("aria-checked", on ? "true" : "false");
			sample.tabIndex = on ? 0 : -1;
		}
	};
	const chooseMaterial = (name: Material) => {
		setMaterial(name);
		markMaterial();
	};

	// The weather: the real thing, or one picked here, and likewise the
	// time of day. Marked by hand like the rest.
	// "3:40 pm", from minutes after midnight
	const clockWords = (minutes: number) => {
		const h = Math.floor(minutes / 60);
		const m = `${minutes % 60}`.padStart(2, "0");
		return `${h % 12 || 12}:${m} ${h < 12 ? "am" : "pm"}`;
	};
	let shown = false; // this page has been on screen
	const markWeather = () => {
		const now = forced();
		// (left the page: stop listening. Not just "not on the page", though:
		// a page is made before it's put there.)
		if (this.root?.isConnected) shown = true;
		else if (shown) {
			window.removeEventListener("weatherchange", markWeather);
			return;
		}
		for (const sample of this.root?.querySelectorAll<HTMLElement>(
			".weather-sample"
		) ?? []) {
			const on = (sample.dataset.kind ?? "") === (now.kind ?? "");
			sample.setAttribute("aria-checked", on ? "true" : "false");
			sample.tabIndex = on ? 0 : -1;
		}
		// the time of day: the slider's at the time that's been picked, or
		// follows the clock; the day it runs through is today's, in the
		// colours the sky is at each hour of it
		const slider = this.root?.querySelector<HTMLInputElement>(
			'.time-pick input[type="range"]'
		);
		if (slider) {
			const clock = minutesNow();
			const at = now.time ?? clock;
			placeSlider(slider, at);
			const stops: string[] = [];
			for (let m = 0; m <= 1440; m += 30)
				stops.push(`${airTint(sunAltitude(atMinutes(m)))} ${((m / 1440) * 100).toFixed(2)}%`);
			slider.style.setProperty("--track", `linear-gradient(to right, ${stops.join(", ")})`);
			const pick = slider.closest<HTMLElement>(".time-pick")!;
			pick.style.setProperty("--now", `${((clock / 1439) * 100).toFixed(2)}`);
			pick.classList.toggle("is-live", now.time == null);
			const readout = pick.querySelector("output");
			if (readout)
				readout.textContent = now.time == null ? `now, ${clockWords(clock)}` : clockWords(at);
			const reset = pick.querySelector<HTMLButtonElement>(".time-reset");
			if (reset) reset.hidden = now.time == null;
		}
	};
	// How well the weather's drawn: as well as the graphics card was judged
	// good for (auto), or a tier picked here. A slider of four stops.
	const GPU_STOPS: (Quality | null)[] = [null, "low", "medium", "high"];
	// what each does (LEVELS in sky.ts, PLENTY in rain.ts) and who it's for
	// (the benchmark frame rates are gpu.ts's cut-offs)
	const GPU_NOTES: Record<Quality, string> = {
		low:
			"flat 2d clouds at 15fps and 40% resolution, with half the rain and snow. " +
			"for old integrated graphics, budget phones and anything without a real gpu " +
			"(under 30fps in the benchmark).",
		medium:
			"layered clouds with shaded edges at 24fps and half resolution, with three " +
			"quarters of the rain and snow. for recent integrated graphics and mid-range " +
			"phones (30 to 60fps in the benchmark).",
		high:
			"volumetric, ray-marched clouds at 30fps and 70% resolution, with all of the " +
			"rain and snow. for dedicated cards, apple silicon and flagship phones " +
			"(60fps and up in the benchmark).",
	};
	let gpuShown = false;
	const markGpu = () => {
		if (this.root?.isConnected) gpuShown = true;
		else if (gpuShown) {
			window.removeEventListener("gpuquality", markGpu);
			return;
		}
		const pick = this.root?.querySelector<HTMLElement>(".gpu-pick");
		const slider = pick?.querySelector<HTMLInputElement>('input[type="range"]');
		if (!pick || !slider) return;
		const at = GPU_STOPS.indexOf(gpuPicked());
		placeSlider(slider, at);
		const readout = pick.querySelector("output");
		if (readout) {
			// (the address can overrule both: say what's really being drawn)
			const drawn = gpuQuality();
			const picked = gpuPicked();
			readout.textContent = picked
				? picked === drawn
					? picked
					: `${picked} (${drawn} for this visit)`
				: gpuKnown() || drawn !== gpuDetected()
					? `auto: ${drawn}`
					: "auto: working it out";
		}
		const note = this.root?.querySelector<HTMLElement>(".gpu-note");
		if (note) {
			const picked = gpuPicked();
			note.textContent = picked
				? GPU_NOTES[picked]
				: "looks your graphics card up in a table of benchmark results, once, and " +
					"remembers the answer for a month. " +
					(gpuKnown()
						? `yours came out as ${gpuDetected()}: ${GPU_NOTES[gpuDetected()]}`
						: "until that's in, it's low.");
		}
		pick.querySelectorAll<HTMLElement>(".gpu-stop").forEach((stop, i) => {
			stop.setAttribute("aria-pressed", String(i === at));
		});
	};
	const chooseGpu = (stop: number) => {
		pickGpu(GPU_STOPS[Math.max(0, Math.min(GPU_STOPS.length - 1, Math.round(stop)))]);
		markGpu();
	};
	const chooseWeather = (kind: ForceKind | null) => {
		force(kind, forced().time);
		markWeather();
	};
	// Sliding near enough to the time it is lets go of the slider: it's
	// "now" again, and follows the clock. (The button beside it does the
	// same from anywhere.)
	const chooseTime = (time: number | null) => {
		cancelAnimationFrame(returning);
		this.root?.querySelector(".time-pick")?.classList.remove("is-returning");
		const live = time == null || Math.abs(time - minutesNow()) <= 7;
		force(forced().kind, live ? null : time);
		markWeather();
	};

	// Back to now, from the button: the slider runs back along the day to
	// the time it is, and the sky runs back through that much of the day
	// with it, quickly at first and settling as it gets there.
	let returning = 0;
	const backToNow = () => {
		const from = forced().time;
		if (from == null) return;
		cancelAnimationFrame(returning);
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			chooseTime(null);
			return;
		}
		const to = minutesNow();
		const began = performance.now();
		const takes = 380 + Math.min(520, Math.abs(to - from) * 0.9);
		const step = (at: number) => {
			const t = Math.min(1, (at - began) / takes);
			if (t >= 1 || !this.root?.isConnected) {
				chooseTime(null);
				return;
			}
			// (ease out, as everything Metro does that's coming to rest)
			const eased = 1 - (1 - t) ** 4;
			force(forced().kind, Math.round(from + (to - from) * eased));
			markWeather();
			// (the button's on its way out, not there to be pressed again)
			this.root?.querySelector(".time-pick")?.classList.add("is-returning");
			returning = requestAnimationFrame(step);
		};
		returning = requestAnimationFrame(step);
	};

	this.cx.mount = () => {
		if (import.meta.env.SSR) return;
		markWeather();
		window.addEventListener("weatherchange", markWeather);
		markGpu();
		window.addEventListener("gpuquality", markGpu);
		const name = currentAccent();
		const custom = customAccent();
		mark(name);
		showCustom(custom, name === CUSTOM_ACCENT);
		setPicker(custom);
		markMaterial();
	};

	const pick = (name: string) => {
		setAccent(name);
		mark(name);
		const custom = customAccent();
		showCustom(custom, name === CUSTOM_ACCENT);
		setPicker(custom);
	};

	// a slider moved: the three of them are the colour
	const slide = () => {
		const hsl = sliders().map((input) => +input.value) as Hsl;
		setCustomAccent(hsl);
		mark(CUSTOM_ACCENT);
		showCustom(hsl, true);
		setPicker(hsl);
	};

	// (what the server renders the sliders at: they're hidden until mount()
	// has put them where they belong)
	const start = customAccent();

	return (
		<Page kind="pivot">
			<title>site info – bomberfish.ca</title>
			<div class="layout-container">
				<SiteNav active="about" />
				<div class="main-content about-page">
					<PageHeader>
						<Pivot active="about" />
					</PageHeader>
					<div data-m-content>
						<section class="about-prose" data-m-feather>
							<p>
								i built this website using{" "}
								<a
									href="https://dreamland.js.org"
									target="_blank"
									referrer-policy="unsafe-url"
								>
									dreamland.js
								</a>
								, a small and utilitarian web framework with full reactivity.
								i'm also using <a target="_blank" href="https://github.com/bomberfish/metro-dreamland">metro-dreamland</a>,
								my own custom ui library built to recreate the metro ui from windows phone 7/8 and windows 8.
							</p>
							<p>
								for typography, the site is done up with segoe ui variable, with cascadia mono as the 
								font for code. emoji are the set from windows 10 1903, and the symbols are a custom mix 
								of various symbols from windows 8-10 and some roughly matched material symbols.
							</p>
							<p>this site is also open source, and you can find the source code <a target="_blank" href="https://github.com/bomberfish/bomberfish.ca">here</a>.</p>
						</section>

						<section data-m-feather>
							<h2>graphics quality</h2>
							<p>
								how detailed the weather in the background is. auto goes by your
								graphics card. persists across reloads.
							</p>
							<div class="gpu-pick">
								<Slider
									name="gpu"
									label="quality"
									min={0}
									max={3}
									value={0}
									oninput={chooseGpu}
								/>
								<div class="gpu-stops">
									{["auto", "low", "medium", "high"].map((name, i) => (
										<button
											type="button"
											class="gpu-stop"
											aria-pressed="false"
											style={`--at: ${i}`}
											on:click={() => chooseGpu(i)}
										>
											{name}
										</button>
									))}
								</div>
							</div>
							<p class="gpu-note" aria-live="polite" />
						</section>

						<section data-m-feather>
							<h2>weather</h2>
							<p>
								override the conditions for the weather visualizer in the background, or set it to the current conditions in waterloo.
							</p>
							<div class="weather-pick" role="radiogroup" aria-label="weather">
								{([null, ...FORCE_KINDS] as (ForceKind | null)[]).map((kind) => (
									<Tile
										as="button"
										type="button"
										role="radio"
										aria-checked="false"
										color="accent"
										class="material-sample weather-sample"
										feather={false}
										data-kind={kind ?? ""}
										on:click={() => chooseWeather(kind)}
									>
										{weatherGlyph(kind ?? "live")}
										<TileLabel>{kind ?? "live"}</TileLabel>
										<span class="material-check" aria-hidden="true" />
									</Tile>
								))}
							</div>
							<div class="time-pick is-live">
								<Slider
									name="time"
									label="time of day"
									min={0}
									max={1439}
									value={720}
									oninput={chooseTime}
								/>
								<span class="time-now" aria-hidden="true">
									now
								</span>
								<Button class="time-reset" hidden on:click={backToNow}>
									<span class="material-symbols" aria-hidden="true">
										refresh
									</span>
									back to now
								</Button>
							</div>
						</section>
						
						<section data-m-feather>
							<h2>accent colour</h2>
							<p>
								pick one and the whole site takes it, or make your own with the
								last. persists across reloads.
							</p>
							<div class="accent-picker">
								<ColorStrip
									label="accent colour"
									colors={[
										...ACCENTS.map((accent) => ({
											name: accent.name,
											color: accent.hex,
										})),
										// (the last is your own: until there is one, the
										// colour in use, which mount() paints it)
										{
											name: CUSTOM_ACCENT,
											color: "var(--accent)",
											icon: "Edit",
										},
									]}
									selected={DEFAULT_ACCENT}
									onpick={pick}
								/>
							</div>
							<div class="accent-custom" hidden>
								{(
									[
										["h", "hue", "°"],
										["s", "saturation", "%"],
										["l", "lightness", "%"],
									] as const
								).map(([name, label, unit], i) => (
									<Slider
										name={name}
										label={label}
										unit={unit}
										min={CUSTOM_RANGE.min[i]}
										max={CUSTOM_RANGE.max[i]}
										value={start[i]}
										oninput={slide}
									/>
								))}
								<div class="accent-pick">
									<Button on:click={openPicker}>
										<span class="material-symbols" aria-hidden="true">
											Eyedropper
										</span>
										colour picker
									</Button>
									<input
										type="color"
										value={hslToHex(...start)}
										tabindex="-1"
										aria-hidden="true"
										on:input={() => picked(false)}
										on:change={() => picked(true)}
									/>
								</div>
							</div>
						</section>
						
						<section data-m-feather>
							<h2>material</h2>
							<p>
								pick between windows 10's frosted acrylic or windows 8's flat, vibrant look. persists across reloads.
							</p>
							<div
								class="material-pick"
								role="radiogroup"
								aria-label="material"
							>
								{MATERIALS.map((name) => (
									<span data-m-material={name}>
										<Tile
											as="button"
											type="button"
											role="radio"
											aria-checked="false"
											color="accent"
											class="material-sample"
											feather={false}
											data-name={name}
											on:click={() => chooseMaterial(name)}
										>
											<TileLabel>{name}</TileLabel>
											<span class="material-check" aria-hidden="true" />
										</Tile>
									</span>
								))}
							</div>
						</section>

						<section data-m-feather>
							<h2>archive of previous versions</h2>
							<p>
								versioning started with v6.0.0. previous versioning applied
								retroactively.
							</p>
							<Tiles class="archive-tiles">
								{archives.map((archive) => {
									const broken = archive.date.endsWith("id_");
									return (
										<Tile
											href={`https://web.archive.org/web/${archive.date}/${archive.origin || "https://bomberfish.ca/"}`}
											color={broken ? "chrome" : "accent"}
											class="archive-tile"
											w={1}
											h={1}
											feather={false}
										>
											<span class="archive-version">{archive.version}</span>
											<TileLabel>
												{broken ? "(broken archive)" : archive.date.slice(0, 4)}
											</TileLabel>
										</Tile>
									);
								})}
							</Tiles>
						</section>

						<section data-m-feather>
							<h2>palette</h2>
							<p>the neutrals everything else is drawn in, darkest first.</p>
							<div class="swatches">
								<ColorSwatch color="accent" />
								{colors.map((color) => (
									<ColorSwatch color={color} />
								))}
							</div>
						</section>
					</div>
				</div>
				<div data-m-content>
					<Footer />
				</div>
			</div>
		</Page>
	);
}

function ColorSwatch(this: FC<{ color: string }>) {
	const state: Stateful<{ value: string }> = createState({
		value: "",
	});

	const updateValue = () => {
		if (import.meta.env.SSR) return;
		// the swatch's own background, as the browser resolved it
		const preview = this.root?.querySelector<HTMLElement>(".preview");
		if (!preview) return;
		const rgb = getComputedStyle(preview).backgroundColor.match(/[\d.]+/g);
		if (!rgb || rgb.length < 3) return;
		state.value =
			"#" +
			rgb
				.slice(0, 3)
				.map((c) => Math.round(Number(c)).toString(16).padStart(2, "0"))
				.join("");
	};

	this.cx.mount = () => {
		if (import.meta.env.SSR) return;
		updateValue();
		window.addEventListener("accentchange", updateValue);
		return () => window.removeEventListener("accentchange", updateValue);
	};

	const light =
		this.color === "accent" ? false : brightColors.includes(this.color);

	return (
		<div
			class={`swatch${light ? " light" : ""}${this.color === "accent" ? " is-accent" : ""}`}
		>
			<div
				class="preview"
				style={`background-color: var(--${this.color});`}
			></div>
			<span class="value">{use(state.value)}</span>
			<span class="label">{this.color}</span>
		</div>
	);
}
