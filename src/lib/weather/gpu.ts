// How much the graphics card can take, so the sky (sky.ts) can be drawn
// as well as it'll stand and no better, and there's no more rain, snow or
// ice in the air (rain.ts) than the machine can keep moving.
//
// The judging is detect-gpu's (https://github.com/pmndrs/detect-gpu): it
// reads the card's name off WebGL and looks it up in a table of benchmark
// results, which gives a tier from 0 (nothing to speak of) to 3 (60fps and
// up). The library and its tables are only fetched once the page is up and
// idle, and only the one table for this make of card; they come from this
// site, not a CDN (the tables are bundled from the package). Until the
// answer's in, quality is "low": the sky starts cheap and gets better, never
// the other way. The answer's kept on the device for a month, so every
// visit after the first starts at the right quality.
//
// It can be overruled: the about page has a slider for it (pickGpu, kept on
// the device until it's put back to auto), and ?gpu=low, medium or high in
// the address overrides both for that page load.
//
// What was decided and from what is logged to the console (at the debug
// level, so it's under "Verbose" in Chrome's): the tier, the card as WebGL
// names it, the benchmark's frame rate, and where the answer came from.

export type Quality = "low" | "medium" | "high";

const STORE = "gpu-quality";
const PICK = "gpu-pick";
const FRESH_MS = 30 * 86_400_000;
const QUALITIES: Quality[] = ["low", "medium", "high"];

declare global {
	interface WindowEventMap {
		gpuquality: Event;
	}
}

// what detect-gpu said, kept with the answer so later visits can say too
interface Details {
	tier: number;
	type: string;
	gpu?: string;
	fps?: number;
	isMobile?: boolean;
	device?: string;
}

function log(from: string, to: Quality, details?: Details | null) {
	console.debug(
		`[gpu] quality: ${to} (${from})`,
		details
			? {
					tier: details.tier,
					type: details.type,
					gpu: details.gpu ?? "unknown",
					benchmarkFps: details.fps ?? null,
					mobile: details.isMobile ?? null,
					device: details.device ?? null,
				}
			: "no details"
	);
}

let quality: Quality = "low"; // the card's, as far as is known
let picked: Quality | null = null; // the about page's, if it's said
let asked: Quality | null = null; // the address's
let known = false;
let started = false;

/** The quality to draw at, as far as is known yet. A "gpuquality" event on window says when it (or what it's made from) changes. */
export const gpuQuality = () => asked ?? picked ?? quality;

/** What the card itself was judged to be good for (see gpuKnown for whether that's in yet). */
export const gpuDetected = () => quality;

/** The quality picked on the about page, or null for the card's own. */
export const gpuPicked = () => picked;

/** Pick a quality whatever the card (null: go by the card again). Kept on the device. */
export function pickGpu(to: Quality | null) {
	if (to === picked) return;
	picked = to;
	try {
		if (to) localStorage.setItem(PICK, to);
		else localStorage.removeItem(PICK);
	} catch {
		// (no storage: it's for this page only)
	}
	console.debug(`[gpu] quality: ${gpuQuality()} (${to ? "picked on the site info page" : "back to the card's own"})`);
	window.dispatchEvent(new Event("gpuquality"));
}

function settle(to: Quality) {
	known = true;
	if (to === quality) return;
	quality = to;
	window.dispatchEvent(new Event("gpuquality"));
}

// the benchmark tables, one file a make of card: each a chunk of its own,
// fetched when asked for
const tables = import.meta.glob<unknown[]>(
	"/node_modules/detect-gpu/dist/benchmarks/*.json",
	{ import: "default" }
);

async function detect() {
	const { getGPUTier } = await import("detect-gpu");
	const result = await getGPUTier({
		override: {
			loadBenchmarks: async (file) => {
				const load = tables[`/node_modules/detect-gpu/dist/benchmarks/${file}`];
				if (!load) throw new Error(`no benchmarks: ${file}`);
				// (the first entry is the tables' version, not a card)
				const [, ...cards] = await load();
				return cards as never;
			},
		},
	});
	// 3: 60fps and over in the benchmark. 2: 30 and over. 1 and 0: less, or
	// no real GPU at all. A card that isn't in the tables comes back as a
	// "fallback" 1: on a desktop that's more likely a new card than a bad one.
	const found: Quality =
		result.tier >= 3
			? "high"
			: result.tier === 2
				? "medium"
				: result.type === "FALLBACK" && !result.isMobile
					? "medium"
					: "low";
	const details: Details = {
		tier: result.tier,
		type: result.type,
		gpu: result.gpu,
		fps: result.fps,
		isMobile: result.isMobile,
		device: result.device,
	};
	return { found, details };
}

/** Find out (once), if it isn't known from an earlier visit. */
export function startGpu() {
	if (started || import.meta.env.SSR) return;
	started = true;

	const inAddress = new URLSearchParams(location.search).get("gpu") as Quality | null;
	if (inAddress && QUALITIES.includes(inAddress)) {
		asked = inAddress;
		log("asked for in the address", asked);
	}
	try {
		const kept = localStorage.getItem(PICK) as Quality | null;
		if (kept && QUALITIES.includes(kept)) {
			picked = kept;
			if (!asked) log("picked on the site info page", picked);
		}
	} catch {
		// (no storage)
	}
	// (the card's still sized up under either, so "auto" has something to say)
	try {
		const kept = JSON.parse(localStorage.getItem(STORE) ?? "null");
		if (kept && QUALITIES.includes(kept.quality) && Date.now() - kept.at < FRESH_MS) {
			quality = kept.quality;
			known = true;
			log(
				`remembered from ${new Date(kept.at).toISOString().slice(0, 10)}`,
				quality,
				kept.details
			);
			return;
		}
	} catch {
		// (no storage: it'll be worked out each visit)
	}

	console.debug("[gpu] quality: low (until the card's been sized up)");
	const run = () => {
		const began = performance.now();
		detect()
			.then(({ found, details }) => {
				try {
					localStorage.setItem(
						STORE,
						JSON.stringify({ quality: found, at: Date.now(), details })
					);
				} catch {
					// (private window)
				}
				log(`detected in ${Math.round(performance.now() - began)}ms`, found, details);
				settle(found);
			})
			.catch((error) => {
				// (couldn't be had: the cheap sky is a fine sky)
				console.debug("[gpu] quality: low (detection failed)", error);
			});
	};
	// not in the way of the page coming up
	if ("requestIdleCallback" in window) requestIdleCallback(run, { timeout: 4000 });
	else setTimeout(run, 1500);
}

/** Whether the quality is the card's real one yet (rather than the cautious first guess). */
export const gpuKnown = () => known;
