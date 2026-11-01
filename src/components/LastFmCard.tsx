import { FC, createState, css, Stateful } from "dreamland/core";
import humanizeDuration from "humanize-duration";
import { getLastfm, LastfmProfile, LastfmTrack } from "../lib/siteapi";
import { AppleMusicWordmark, LastFmIcon } from "./SocialIcons";

type View =
	| { kind: "loading" }
	| { kind: "error"; message: string }
	| { kind: "empty" }
	| { kind: "loaded"; track: LastfmTrack; profile: LastfmProfile | null };

const REFRESH_MS = 60_000;

// Resolve a computed line-height value (which may be "normal", "Npx", or a
// unitless multiplier like "1.1") to a concrete pixel height for the element.
function lineHeightPx(cs: CSSStyleDeclaration): number {
	const fontSize = parseFloat(cs.fontSize);
	const raw = cs.lineHeight;
	if (raw === "normal") return fontSize * 1.2;
	if (raw.endsWith("px")) return parseFloat(raw);
	const n = parseFloat(raw);
	return Number.isFinite(n) ? n * fontSize : fontSize * 1.2;
}

// Floor for the JS font-size shrink — below this the title gets unreadable and
// we'd rather switch to the marquee than keep shrinking.
const TITLE_MIN_PX = 16;

// "3:42" / "1:02:33" style runtime from a millisecond duration.
function formatDuration(ms: number): string {
	const totalSec = Math.max(0, Math.round(ms / 1000));
	const h = Math.floor(totalSec / 3600);
	const m = Math.floor((totalSec % 3600) / 60);
	const s = totalSec % 60;
	const ss = String(s).padStart(2, "0");
	if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${ss}`;
	return `${m}:${ss}`;
}

// Compact "K/M/B" formatter for big counts (listeners, plays). Drops the
// decimal once the rounded value reaches 100 (e.g. "174K" not "174.5K") and
// strips trailing ".0" so we never render "1.0K".
function compactNumber(n: number): string {
	if (n < 1000) return n.toLocaleString();
	const fmt = (v: number, suffix: string) =>
		(v >= 100 ? `${Math.round(v)}` : v.toFixed(1).replace(/\.0$/, "")) + suffix;
	if (n < 1_000_000) return fmt(n / 1000, "K");
	if (n < 1_000_000_000) return fmt(n / 1_000_000, "M");
	return fmt(n / 1_000_000_000, "B");
}

// Number of bars in the preview waveform. On narrow waveforms only every
// 2nd/4th one is shown (fitWave sets data-wave-step).
const WAVE_BARS = 90;

// Loading sweep: when the crest reaches bar i (s). The crest travels an
// ease-in-out-quart path that starts and ends a little past the waveform
// (WAVE_SWEEP_OVERSHOOT of its width each side), so the bars see it
// accelerate out of the left and decelerate into the right, ~3.5x faster
// in the middle, without the near-standstill at the very ends of the curve
// (which left a lone bar hanging at the edge).
const WAVE_SWEEP_S = 0.8; // left edge to right edge
const WAVE_SWEEP_OVERSHOOT = 0.1;
const quartInOutInverse = (x: number) =>
	x < 0.5 ? Math.pow(x / 8, 1 / 4) : 1 - Math.pow(2 * (1 - x), 1 / 4) / 2;
function sweepDelay(i: number): string {
	const o = WAVE_SWEEP_OVERSHOOT;
	const u = (x: number) => (x + o) / (1 + 2 * o);
	const t0 = quartInOutInverse(u(0));
	const t1 = quartInOutInverse(u(1));
	const t = quartInOutInverse(u(i / (WAVE_BARS - 1)));
	return (((t - t0) / (t1 - t0)) * WAVE_SWEEP_S).toFixed(3);
}

// Stand-in waveform shown before a preview has been downloaded: a seeded
// random walk, so a given track always gets the same shape.
function placeholderPeaks(seed: string, n: number): number[] {
	let h = 2166136261;
	for (let i = 0; i < seed.length; i++) {
		h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
	}
	const rand = () => {
		h = Math.imul(h ^ (h >>> 15), 2246822507);
		h = Math.imul(h ^ (h >>> 13), 3266489909);
		h ^= h >>> 16;
		return (h >>> 0) / 4294967296;
	};
	const out: number[] = [];
	let v = 0.5;
	for (let i = 0; i < n; i++) {
		v = Math.min(0.85, Math.max(0.2, v + (rand() - 0.5) * 0.35));
		out.push(v * (0.75 + rand() * 0.25));
	}
	return out;
}

// Each bar is the loudest ~25ms window inside it, scaled between the 5th
// percentile and the max. Plain per-bar RMS comes out as a flat block on
// modern, heavily compressed masters; short windows catch the transients
// (drums etc.) that give a SoundCloud-style waveform its texture.
function computePeaks(buf: AudioBuffer, n: number): number[] {
	const channels = Array.from({ length: buf.numberOfChannels }, (_, c) =>
		buf.getChannelData(c)
	);
	const size = Math.floor(buf.length / n);
	const win = Math.max(1, Math.round(buf.sampleRate * 0.025));
	const step = 2; // every other sample is plenty at this resolution
	const raw: number[] = [];
	for (let i = 0; i < n; i++) {
		let loudest = 0;
		for (let w = i * size; w + win <= (i + 1) * size; w += win) {
			let sum = 0;
			for (const data of channels) {
				for (let j = w; j < w + win; j += step) sum += data[j] * data[j];
			}
			loudest = Math.max(loudest, sum / ((win / step) * channels.length));
		}
		raw.push(Math.sqrt(loudest));
	}
	const sorted = [...raw].sort((a, b) => a - b);
	const lo = sorted[Math.floor(n * 0.05)];
	const hi = sorted[n - 1] || 1;
	return raw.map((v) => {
		const t = hi > lo ? (v - lo) / (hi - lo) : 1;
		return Math.pow(Math.min(1, Math.max(0.12, 0.15 + 0.85 * t)), 1.2);
	});
}

// ---- Album art palette -------------------------------------------------
// The waveform is tinted with a gradient of the cover's colours, like the
// Dynamic Island's music visualiser: a few distinct colours (not just the
// dominant one), laid out left to right in the order they sit in the art,
// and pushed bright and vivid so they glow against the dark card.

type Lab = [number, number, number];

const srgbToLinear = (c: number) =>
	c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
const linearToSrgb = (c: number) =>
	c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;

// OKLab: perceptually even, so clustering, distances and the gradient
// in between colours all behave the way they look
function toOklab(r: number, g: number, b: number): Lab {
	const R = srgbToLinear(r / 255);
	const G = srgbToLinear(g / 255);
	const B = srgbToLinear(b / 255);
	const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
	const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
	const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
	return [
		0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
		1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
		0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
	];
}

function oklabToRgb([L, a, b]: Lab): string {
	const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
	const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
	const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
	const ch = (v: number) =>
		Math.round(Math.min(1, Math.max(0, linearToSrgb(v))) * 255);
	return `rgb(${ch(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s)}, ${ch(
		-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
	)}, ${ch(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s)})`;
}

const labDist = (p: Lab, q: Lab) =>
	Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);

const PALETTE_SIZE = 32; // px, the art is sampled at this size
const PALETTE_K = 8; // clusters; up to PALETTE_MAX of them are kept
const PALETTE_MAX = 4;
const PALETTE_MAX_GREYS = 2;
const GREY_CHROMA = 0.035; // OKLab chroma below this reads as grey

// k-means over the pixels, then keep the clusters that are big and/or
// vivid, skipping near-duplicates. Returns the colours ordered by where
// they sit in the art, left to right.
function extractPalette(px: Uint8ClampedArray, size: number): Lab[] {
	const pts: Lab[] = [];
	const xs: number[] = [];
	for (let i = 0; i < px.length; i += 4) {
		if (px[i + 3] < 128) continue;
		pts.push(toOklab(px[i], px[i + 1], px[i + 2]));
		xs.push(((i / 4) % size) / (size - 1));
	}
	if (!pts.length) return [];

	// farthest-point seeding: deterministic, and finds small accent colours
	// that random seeding tends to miss
	const centres: Lab[] = [pts[0]];
	while (centres.length < PALETTE_K) {
		let best = 0;
		let bestD = -1;
		for (let i = 0; i < pts.length; i++) {
			let d = Infinity;
			for (const c of centres) d = Math.min(d, labDist(pts[i], c));
			if (d > bestD) [best, bestD] = [i, d];
		}
		if (bestD < 0.02) break; // the art just doesn't have that many colours
		centres.push(pts[best]);
	}

	const assign = new Uint8Array(pts.length);
	for (let iter = 0; iter < 8; iter++) {
		for (let i = 0; i < pts.length; i++) {
			let best = 0;
			for (let c = 1; c < centres.length; c++) {
				if (labDist(pts[i], centres[c]) < labDist(pts[i], centres[best]))
					best = c;
			}
			assign[i] = best;
		}
		const sums = centres.map(() => [0, 0, 0, 0]);
		for (let i = 0; i < pts.length; i++) {
			const s = sums[assign[i]];
			s[0] += pts[i][0];
			s[1] += pts[i][1];
			s[2] += pts[i][2];
			s[3]++;
		}
		sums.forEach((s, c) => {
			if (s[3]) centres[c] = [s[0] / s[3], s[1] / s[3], s[2] / s[3]];
		});
	}

	const clusters = centres.map((lab) => ({ lab, n: 0, x: 0, score: 0 }));
	for (let i = 0; i < pts.length; i++) {
		clusters[assign[i]].n++;
		clusters[assign[i]].x += xs[i];
	}
	for (const c of clusters) {
		if (!c.n) continue;
		c.x /= c.n;
		const vivid = Math.min(1, Math.hypot(c.lab[1], c.lab[2]) / 0.1);
		// near-black and near-white areas (borders, backgrounds) make dull bars
		const tone = c.lab[0] < 0.2 || c.lab[0] > 0.95 ? 0.3 : 1;
		// sqrt: a small splash of strong colour (the thing you remember about
		// a cover) can beat a big plain area, like the Island does
		c.score = Math.sqrt(c.n / pts.length) * (0.12 + vivid) * tone;
	}
	clusters.sort((p, q) => q.score - p.score);

	const picked: typeof clusters = [];
	let greys = 0;
	for (const c of clusters) {
		if (!c.n || picked.length >= PALETTE_MAX) continue;
		if (picked.some((p) => labDist(p.lab, c.lab) < 0.1)) continue;
		const grey = Math.hypot(c.lab[1], c.lab[2]) < GREY_CHROMA;
		if (grey && greys >= PALETTE_MAX_GREYS) continue;
		greys += grey ? 1 : 0;
		picked.push(c);
	}
	return picked.sort((p, q) => p.x - q.x).map((c) => c.lab);
}

// Brighten and saturate a palette colour so it reads on the dark card,
// keeping its hue. Greys stay grey (a monochrome cover gets a monochrome
// waveform).
function glow([L, a, b]: Lab): Lab {
	const chroma = Math.hypot(a, b);
	const boost = chroma < 0.02 ? 1 : Math.min(1.35, 0.17 / chroma);
	return [Math.min(0.9, Math.max(0.72, L * 0.6 + 0.4)), a * boost, b * boost];
}

// One colour per bar, interpolating between the palette's stops (evenly
// spread) in OKLab.
function paletteGradient(palette: Lab[], n: number): string[] {
	const stops = palette.map(glow);
	// a single colour still gets some movement: a lighter and a deeper end
	if (stops.length === 1) {
		const [L, a, b] = stops[0];
		stops.splice(0, 1, [Math.min(0.92, L + 0.08), a * 0.8, b * 0.8], [
			L - 0.08,
			a * 1.15,
			b * 1.15,
		]);
	}
	const out: string[] = [];
	for (let i = 0; i < n; i++) {
		const t = (i / (n - 1)) * (stops.length - 1);
		const k = Math.min(stops.length - 2, Math.floor(t));
		const f = t - k;
		const p = stops[k];
		const q = stops[k + 1];
		out.push(
			oklabToRgb([
				p[0] + (q[0] - p[0]) * f,
				p[1] + (q[1] - p[1]) * f,
				p[2] + (q[2] - p[2]) * f,
			])
		);
	}
	return out;
}

// The art comes through wsrv.nl (CORS-enabled), which can hand over a tiny
// copy; for anything else, the canvas downsamples it.
function smallArtUrl(src: string): string {
	try {
		const u = new URL(src);
		if (u.hostname === "wsrv.nl") {
			u.searchParams.set("w", String(PALETTE_SIZE));
			u.searchParams.set("h", String(PALETTE_SIZE));
		}
		return u.href;
	} catch {
		return src;
	}
}

function LastFmCard(this: FC) {
	const state: Stateful<{ view: View; refreshing: boolean }> = createState({
		view: { kind: "loading" } as View,
		refreshing: false,
	});

	let cancelled = false;
	let controller: AbortController | null = null;

	const load = async (cacheBust = false) => {
		if (import.meta.env.SSR) return;
		controller?.abort();
		const request = new AbortController();
		controller = request;
		state.refreshing = true;
		try {
			const data = await getLastfm(request.signal, cacheBust);
			if (cancelled || controller !== request) return;
			state.view = data.track
				? { kind: "loaded", track: data.track, profile: data.profile }
				: { kind: "empty" };
			// also done from the view listener in mount, but that doesn't
			// reliably fire for the first load, and the player depends on it
			requestAnimationFrame(afterRender);
		} catch (e: unknown) {
			if (cancelled || controller !== request) return;
			if (e instanceof DOMException && e.name === "AbortError") return;
			state.view = {
				kind: "error",
				message: e instanceof Error ? e.message : "unknown_error",
			};
		} finally {
			if (!cancelled && controller === request) {
				controller = null;
				state.refreshing = false;
			}
		}
	};

	const onRefresh = (e: MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		if (state.refreshing) return;
		// Restart the spin animation on every click — remove → reflow →
		// re-add so a second click within the 0.5s window kicks fresh
		// instead of being ignored as a no-op class toggle.
		const btn = e.currentTarget as HTMLElement;
		btn.classList.remove("spin");
		void btn.offsetWidth;
		btn.classList.add("spin");
		load(true);
	};

	// Sizes the lastfm title to at most ~2 lines:
	//   1. Reset overrides, let the CSS clamp drive the natural size.
	//   2. If natural rendering exceeds 2 lines, shrink font-size proportionally
	//      (up to two passes — the first pass usually nails it, the second
	//      stabilises any line-break shifts caused by the new size).
	//   3. If the title still doesn't fit at the 1rem floor, enable marquee
	//      mode: single-line nowrap + a bouncing translateX animation whose
	//      distance and duration are computed from the actual overflow.
	const fitTitle = () => {
		if (!this.root) return;
		const title = this.root.querySelector<HTMLElement>(".lastfm-title");
		const inner = this.root.querySelector<HTMLElement>(".lastfm-title-inner");
		if (!title || !inner) return;

		// Wipe any prior overrides so we measure against the natural CSS size.
		title.classList.remove("is-marquee");
		title.style.removeProperty("font-size");
		title.style.removeProperty("--marquee-distance");
		title.style.removeProperty("--marquee-duration");

		const cs = getComputedStyle(title);
		const naturalSize = parseFloat(cs.fontSize);
		let lh = lineHeightPx(cs);
		let maxHeight = lh * 2 + 0.5;
		let height = title.offsetHeight;
		if (height <= maxHeight) return; // already fits in 1–2 lines

		// Proportional shrink. line-height is a unitless multiplier so it
		// scales with font-size and we have to re-read it after each change.
		let size = naturalSize;
		for (let i = 0; i < 2; i++) {
			const target = Math.max(TITLE_MIN_PX, (size * (lh * 2)) / height);
			if (Math.abs(target - size) < 0.5) break;
			size = target;
			title.style.fontSize = `${size}px`;
			const cs2 = getComputedStyle(title);
			lh = lineHeightPx(cs2);
			maxHeight = lh * 2 + 0.5;
			height = title.offsetHeight;
			if (height <= maxHeight) return; // fits now
			if (size <= TITLE_MIN_PX + 0.5) break; // hit the floor
		}

		// Still too tall even at the floor → marquee mode.
		title.style.fontSize = `${TITLE_MIN_PX}px`;
		title.classList.add("is-marquee");

		const overflow = inner.scrollWidth - title.clientWidth;
		if (overflow <= 0) {
			// Pathological: text actually fits on one line at the floor size.
			// No animation needed.
			title.classList.remove("is-marquee");
			return;
		}

		// Motion runs across 80% of the animation; the other 20% is split into
		// two end-pauses (see keyframes). Aim for ~40 px/s of perceived motion
		// and clamp the total duration to keep short/long titles both sane.
		const motionSec = overflow / 40;
		const totalSec = Math.min(22, Math.max(6, motionSec / 0.8));
		title.style.setProperty("--marquee-distance", `${overflow}px`);
		title.style.setProperty("--marquee-duration", `${totalSec}s`);
	};

	// Thin out the waveform bars when it's narrow so each stays >= ~1.5px.
	// (Done here rather than with a container query: dreamland's CSS
	// processing drops @container rules.)
	const fitWave = () => {
		const el = this.root?.querySelector<HTMLElement>(".lastfm-player");
		const wave = el?.querySelector<HTMLElement>(".lastfm-wave");
		if (!el || !wave) return;
		const w = wave.clientWidth;
		// 1.5px bars with at least 1px between: 90 bars need 224px, 45 need 112
		el.dataset.waveStep = w >= 224 ? "1" : w >= 112 ? "2" : "4";
	};

	let rafId = 0;
	const scheduleFit = () => {
		if (typeof requestAnimationFrame === "undefined") return;
		cancelAnimationFrame(rafId);
		rafId = requestAnimationFrame(() => {
			fitTitle();
			fitWave();
		});
	};

	// ---- Apple Music preview player ----------------------------------------
	// The card's body is re-rendered on every refresh, so the audio element and
	// all player state live out here, and the (possibly brand new) player DOM
	// is looked up and synced from this state rather than holding references.

	// The preview is downloaded once (hovering the play button starts it) and
	// decoded for the real waveform. Playback itself never waits on that:
	// Safari only allows play() synchronously inside the click, so a click
	// plays the downloaded copy if it's ready and streams from Apple if not.
	type Preview = { src: string; duration: number };
	const previews = new Map<string, Promise<Preview>>();
	const ready = new Map<string, Preview>();
	const realPeaks = new Map<string, number[]>();
	const failedPeaks = new Set<string>();
	const buffers = new Map<string, AudioBuffer>(); // decoded, for scrubbing
	const blobUrls: string[] = [];
	const fetchAbort =
		typeof AbortController !== "undefined" ? new AbortController() : null;
	let audio: HTMLAudioElement | null = null;
	let audioFor: string | null = null; // preview URL currently in `audio`
	let pendingSeek: number | null = null; // 0..1, applied at loadedmetadata
	let dragging = false;
	// active waveform scrub (see Scrubbing below)
	type Scrub = {
		url: string;
		buf: AudioBuffer;
		frac: number; // where the pointer is, 0..1
		pos: number; // where the audio is, s (chases frac * duration)
		rate: number; // current playback speed, signed (< 0 = backwards)
		dir: 1 | -1; // direction the live source plays in
		moving: boolean;
		src: AudioBufferSourceNode | null;
		srcGain: GainNode | null;
		out: GainNode; // mutes the scrub audio while it's (nearly) stopped
		lastFrame: number; // performance.now(), ms
		lastSync: number;
		resume: boolean; // play on release
		raf: number;
	};
	let scrub: Scrub | null = null;
	let progressRaf = 0;
	let previewObserver: IntersectionObserver | null = null;

	// Volume: 40% by default, remembered per browser. It's applied through a
	// Web Audio gain node rather than audio.volume, because iOS ignores
	// audio.volume entirely but does respect gain. Falls back to
	// audio.volume where Web Audio isn't available; the control only hides
	// if neither works (volumeSupported, feature-tested at mount).
	const VOLUME_KEY = "lastfm-preview-volume";
	let volume = 0.4;
	let muted = false;
	let volumeSupported = true;
	let audioCtx: AudioContext | null = null;
	let gain: GainNode | null = null;
	try {
		const saved = parseFloat(localStorage.getItem(VOLUME_KEY) ?? "");
		if (saved >= 0 && saved <= 1) volume = saved;
	} catch {
		// storage blocked / SSR: keep the default
	}

	const AudioCtx = (): typeof AudioContext | undefined =>
		typeof window === "undefined"
			? undefined
			: (window.AudioContext ??
				(window as unknown as { webkitAudioContext?: typeof AudioContext })
					.webkitAudioContext);

	// element -> gain -> speakers. Has to be built (and resumed) inside a
	// user gesture for Safari, so it's called from playPreview.
	const ensureGraph = () => {
		if (gain || !audio) return;
		const Ctx = AudioCtx();
		if (!Ctx) return;
		try {
			// without this, Web Audio on iOS goes quiet with the silent switch,
			// unlike a normal media player
			const session = (navigator as { audioSession?: { type: string } })
				.audioSession;
			if (session) session.type = "playback";
			audioCtx = new Ctx();
			gain = audioCtx.createGain();
			audioCtx.createMediaElementSource(audio).connect(gain);
			gain.connect(audioCtx.destination);
		} catch {
			audioCtx = null;
			gain = null;
		}
	};

	// Turntable-style start/stop: a single 0..1 "spin" level drives both the
	// playback rate (with pitch correction off, so the pitch sags too) and
	// the volume. Pausing spins down to SPIN_MIN_RATE while fading out and
	// only then actually pauses; playing spins up from there while fading in.
	const SPIN_DOWN_MS = 550;
	const SPIN_UP_MS = 380;
	const SPIN_MIN_RATE = 0.3;
	// starting from 0:00 skips the spin-up: full speed, just a quick fade-in
	const FADE_IN_MS = 120;
	let spinLevel = 1;
	let spinRaf = 0;
	let stopping = false; // spinning down, about to pause

	// Apple's previews are cut out of the middle of the song, so they start
	// and stop abruptly: fade the first/last moments of the clip by playback
	// position (so it also behaves when seeking into them), smoothstepped.
	const CLIP_FADE_IN_S = 0.8;
	const CLIP_FADE_OUT_S = 2;
	const clipEnvelope = () => {
		if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0)
			return 1;
		const t = audio.currentTime;
		const x = Math.min(
			1,
			t / CLIP_FADE_IN_S,
			Math.max(0, (audio.duration - t) / CLIP_FADE_OUT_S)
		);
		return x * x * (3 - 2 * x);
	};

	const applyVolume = () => {
		if (!audio) return;
		const target = scrub
			? muted
				? 0
				: volume
			: (muted ? 0 : volume) * spinLevel * clipEnvelope();
		if (gain && audioCtx) {
			audio.volume = 1;
			audio.muted = false;
			// short ramp instead of a jump, so dragging the slider doesn't crackle
			gain.gain.setTargetAtTime(target, audioCtx.currentTime, 0.015);
		} else {
			audio.volume = Math.min(1, target);
			audio.muted = muted;
		}
	};

	// withRate false: volume only, speed stays at 1x
	const setSpin = (level: number, withRate = true) => {
		spinLevel = level;
		if (!audio) return;
		try {
			audio.playbackRate = withRate
				? SPIN_MIN_RATE + (1 - SPIN_MIN_RATE) * level
				: 1;
		} catch {
			// rate out of this browser's range: the fade still happens
		}
		applyVolume();
	};

	// duration scales with how far there is to go, so reversing mid-spin
	// takes proportionally less time
	const spinTo = (
		to: number,
		ms: number,
		ease: (t: number) => number,
		done?: () => void,
		withRate = true
	) => {
		cancelAnimationFrame(spinRaf);
		const from = spinLevel;
		const total = ms * Math.abs(to - from);
		const start = performance.now();
		const step = (now: number) => {
			const t = total > 0 ? Math.min(1, (now - start) / total) : 1;
			setSpin(from + (to - from) * ease(t), withRate);
			if (t < 1) spinRaf = requestAnimationFrame(step);
			else done?.();
		};
		spinRaf = requestAnimationFrame(step);
	};

	const easeIn = (t: number) => t * t; // motor cut: slow to start, then sags
	const easeOut = (t: number) => 1 - (1 - t) * (1 - t);

	// spin up, or just fade in when starting from the very beginning
	const startSpin = (fromBeginning: boolean) => {
		if (fromBeginning) spinTo(1, FADE_IN_MS, easeOut, undefined, false);
		else spinTo(1, SPIN_UP_MS, easeOut);
	};

	const pausePreview = () => {
		if (!audio || audio.paused || stopping) return;
		stopping = true;
		syncPlayer();
		spinTo(0, SPIN_DOWN_MS, easeIn, () => {
			stopping = false;
			audio?.pause();
		});
	};

	const loadPreview = (url: string): Promise<Preview> => {
		let p = previews.get(url);
		if (p) return p;
		failedPeaks.delete(url); // retrying
		p = (async () => {
			const res = await fetch(url, { signal: fetchAbort?.signal });
			if (!res.ok) throw new Error(`preview ${res.status}`);
			const bytes = await res.arrayBuffer();
			// blob first: decoding detaches the buffer
			const src = URL.createObjectURL(new Blob([bytes], { type: "audio/mp4" }));
			blobUrls.push(src);
			let duration = 30;
			try {
				const buf = await new OfflineAudioContext(1, 1, 44100).decodeAudioData(
					bytes
				);
				duration = buf.duration;
				buffers.set(url, buf);
				realPeaks.set(url, computePeaks(buf, WAVE_BARS));
			} catch {
				// can't decode here: still playable, keep the placeholder shape
			}
			const preview = { src, duration };
			ready.set(url, preview);
			syncPlayer(); // morph to the real waveform if this player is showing
			return preview;
		})();
		// a failed download only costs the real waveform; allow a retry later
		p.catch(() => {
			previews.delete(url);
			failedPeaks.add(url);
			syncPlayer(); // fall back to the placeholder shape
		});
		previews.set(url, p);
		syncPlayer(); // show the loading ripple
		return p;
	};

	// art URL -> one colour per bar (empty when the art couldn't be read:
	// the waveform just keeps its default colours)
	const palettes = new Map<string, string[]>();
	const paletteLoads = new Set<string>();

	const loadPalette = (art: string) => {
		if (paletteLoads.has(art)) return;
		paletteLoads.add(art);
		const img = new Image();
		img.crossOrigin = "anonymous";
		img.decoding = "async";
		img.src = smallArtUrl(art);
		img
			.decode()
			.then(() => {
				const canvas = document.createElement("canvas");
				canvas.width = canvas.height = PALETTE_SIZE;
				const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
				ctx.drawImage(img, 0, 0, PALETTE_SIZE, PALETTE_SIZE);
				const px = ctx.getImageData(0, 0, PALETTE_SIZE, PALETTE_SIZE).data;
				const palette = extractPalette(px, PALETTE_SIZE);
				palettes.set(art, palette.length ? paletteGradient(palette, WAVE_BARS) : []);
			})
			.catch(() => palettes.set(art, [])) // no CORS / broken image
			.finally(() => syncPlayer());
	};

	// colour each bar (all three rows) once its card's palette is in
	const applyPalette = (el: HTMLElement) => {
		const art = el.dataset.art;
		const colors = art ? palettes.get(art) : undefined;
		if (!colors?.length || el.dataset.palette === art) return;
		el.dataset.palette = art;
		for (const layer of el.querySelectorAll(".lastfm-wave-bars")) {
			layer.querySelectorAll<HTMLElement>("i").forEach((bar, i) => {
				bar.style.setProperty("--c", colors[i]);
			});
		}
	};

	const playerEl = () =>
		this.root?.querySelector<HTMLElement>(".lastfm-player") ?? null;

	const setText = (el: Element | null | undefined, text: string) => {
		if (el && el.textContent !== text) el.textContent = text;
	};

	const isCurrent = (url: string | undefined) => !!audio && audioFor === url;
	const currentDuration = () =>
		audio && Number.isFinite(audio.duration) && audio.duration > 0
			? audio.duration
			: 30;

	// Cheap per-frame part: progress, clock and slider value.
	const syncProgress = () => {
		const el = playerEl();
		if (!el) return;
		const mine = isCurrent(el.dataset.src);
		const scrubbing = !!scrub && scrub.url === el.dataset.src;
		const dur = scrubbing ? scrub!.buf.duration : mine ? currentDuration() : 30;
		const t = scrubbing ? scrub!.frac * dur : mine ? audio!.currentTime : 0;
		el.style.setProperty("--progress", String(Math.min(1, t / dur)));
		setText(
			el.querySelector(".lastfm-time"),
			`${formatDuration(t * 1000)} / ${formatDuration(dur * 1000)}`
		);
		const wave = el.querySelector(".lastfm-wave");
		const now = String(Math.floor(t));
		if (wave && wave.getAttribute("aria-valuenow") !== now) {
			wave.setAttribute("aria-valuemax", String(Math.round(dur)));
			wave.setAttribute("aria-valuenow", now);
			wave.setAttribute(
				"aria-valuetext",
				`${formatDuration(t * 1000)} of ${formatDuration(dur * 1000)}`
			);
		}
	};

	// What the waveform shows:
	// - empty: nothing yet (all bars at 0)
	// - loading: download/decode in flight, a ripple animation
	// - real: the decoded peaks
	// - placeholder: a seeded stand-in shape, only when it failed (or decoded
	//   to nothing) or won't be fetched yet because the browser asks to save
	//   data
	const waveStatus = (url: string) =>
		realPeaks.has(url)
			? "real"
			: failedPeaks.has(url) || ready.has(url)
				? "placeholder"
				: previews.has(url)
					? "loading"
					: saveData()
						? "placeholder"
						: "empty";

	// Everything else: state, button, and swapping in the real waveform.
	const syncPlayer = () => {
		const el = playerEl();
		if (!el) return;
		const url = el.dataset.src;
		const mine = isCurrent(url);
		const playing = mine && !audio!.paused && !stopping;
		const st =
			playing && audio!.readyState < HTMLMediaElement.HAVE_FUTURE_DATA
				? "loading" // asked to play, still buffering
				: playing
					? "playing"
					: mine && audio!.currentTime > 0
						? "paused"
						: "idle";
		el.dataset.state = st;
		const btn = el.querySelector(".lastfm-play");
		setText(
			btn?.querySelector(".material-symbols"),
			st === "playing"
				? "pause"
				: st === "loading"
					? "progress_activity"
					: "play_arrow"
		);
		btn?.setAttribute(
			"aria-label",
			st === "playing" ? "pause preview" : "play preview"
		);

		const silent = muted || volume === 0;
		el.dataset.volume = volumeSupported ? "" : "unsupported";
		el.style.setProperty("--vol", String(silent ? 0 : volume));
		// the inline slider and the touch popover's one
		const pct = String(Math.round((silent ? 0 : volume) * 100));
		for (const range of el.querySelectorAll<HTMLInputElement>(".lastfm-vol-range"))
			if (range.value !== pct) range.value = pct;
		const icon = silent ? "volume_off" : volume < 0.5 ? "volume_down" : "volume_up";
		const muteLabel = silent ? "unmute" : "mute";
		for (const btn of el.querySelectorAll(".lastfm-vol-btn")) {
			setText(btn.querySelector(".material-symbols"), icon);
			// on touch screens the inline one opens the volume control first
			const opener =
				btn.parentElement?.classList.contains("lastfm-volume") &&
				touchMQ?.matches &&
				(portraitMQ?.matches || el.dataset.volOpen !== "1");
			btn.setAttribute("aria-label", opener ? "volume" : muteLabel);
		}

		const status = url ? waveStatus(url) : "empty";
		if (el.dataset.peaks !== status) {
			const bars = el.querySelectorAll<HTMLElement>(".lastfm-wave-bars i");
			if (el.dataset.peaks === "loading") {
				// Freeze every bar where the ripple has it, then stop the
				// animation; the transition below then morphs from there rather
				// than everything snapping to the resting height first.
				bars.forEach((bar) => {
					const t = getComputedStyle(bar).transform;
					const scale = t === "none" ? 1 : new DOMMatrixReadOnly(t).d;
					bar.style.transition = "none";
					bar.style.setProperty("--h", String(scale));
				});
				el.dataset.peaks = status;
				void el.offsetWidth; // commit the frozen state before re-enabling transitions
				bars.forEach((bar) => bar.style.removeProperty("transition"));
			} else {
				el.dataset.peaks = status;
			}
			const heights =
				status === "real"
					? realPeaks.get(url!)!
					: status === "placeholder"
						? placeholderPeaks(el.dataset.seed || url!, WAVE_BARS)
						: null;
			// loading: the ripple's resting scale (the animation takes over)
			const flat = status === "loading" ? "0.09" : "0";
			for (const layer of el.querySelectorAll(".lastfm-wave-bars")) {
				layer.querySelectorAll<HTMLElement>("i").forEach((bar, i) => {
					bar.style.setProperty("--h", heights ? heights[i].toFixed(3) : flat);
				});
			}
		}
		applyPalette(el);
		syncProgress();
	};

	const progressLoop = () => {
		syncProgress();
		applyVolume(); // follows the clip start/end fades
		progressRaf = requestAnimationFrame(progressLoop);
	};

	const ensureAudio = () => {
		if (audio) return audio;
		audio = new Audio();
		audio.preload = "auto";
		// needed to route it through Web Audio (for volume); Apple's CDN sends
		// Access-Control-Allow-Origin: *, and blob copies are same-origin
		audio.crossOrigin = "anonymous";
		// let the pitch drop with the speed during spin-up/down, like vinyl
		audio.preservesPitch = false;
		(
			audio as unknown as { webkitPreservesPitch?: boolean }
		).webkitPreservesPitch = false;
		audio.addEventListener("play", () => {
			// e.g. resumed from media keys after the context was suspended
			void audioCtx?.resume();
			cancelAnimationFrame(progressRaf);
			progressRaf = requestAnimationFrame(progressLoop);
			syncPlayer();
		});
		audio.addEventListener("pause", () => {
			cancelAnimationFrame(progressRaf);
			syncPlayer();
		});
		audio.addEventListener("ended", () => {
			audio!.currentTime = 0;
			syncPlayer();
		});
		audio.addEventListener("loadedmetadata", () => {
			if (pendingSeek != null)
				audio!.currentTime = pendingSeek * currentDuration();
			pendingSeek = null;
			syncPlayer();
		});
		// buffering state drives the spinner
		audio.addEventListener("waiting", syncPlayer);
		audio.addEventListener("playing", syncPlayer);
		applyVolume();
		return audio;
	};

	const onVolumeInput = (e: Event) => {
		volume = (e.currentTarget as HTMLInputElement).valueAsNumber / 100;
		if (volume > 0) muted = false;
		try {
			localStorage.setItem(VOLUME_KEY, String(volume));
		} catch {
			// not persisted, still applies for this visit
		}
		applyVolume();
		syncPlayer();
	};

	const toggleMute = () => {
		if (volume === 0) {
			volume = 0.4; // unmuting from a zeroed slider: back to the default
			muted = false;
		} else {
			muted = !muted;
		}
		applyVolume();
		syncPlayer();
	};

	const onMuteClick = (e: MouseEvent) => {
		e.preventDefault();
		toggleMute();
	};

	// Volume on touch screens, where there's no hover to slide the slider
	// out: in portrait the icon opens a popover with a mute button and a
	// bigger slider; in landscape the first tap slides the slider out
	// (after which the icon mutes), and a tap anywhere else puts it away.
	// With a mouse it's the hover slider, and the icon just mutes.
	const touchMQ =
		typeof window !== "undefined" ? window.matchMedia("(hover: none)") : null;
	const portraitMQ =
		typeof window !== "undefined"
			? window.matchMedia("(orientation: portrait)")
			: null;
	const canPopover =
		typeof HTMLElement !== "undefined" && "showPopover" in HTMLElement.prototype;

	const collapseVolume = () => {
		const el = playerEl();
		if (el) delete el.dataset.volOpen;
		document.removeEventListener("pointerdown", onOutsideVolume, true);
		syncPlayer();
	};
	const onOutsideVolume = (e: PointerEvent) => {
		if ((e.target as Element | null)?.closest?.(".lastfm-volume")) return;
		collapseVolume();
	};

	const closeVolumePopover = () => {
		playerEl()
			?.querySelector<HTMLElement>(".lastfm-vol-pop")
			?.hidePopover?.();
	};
	// tapping the icon while it's open: the popover light-dismisses on the
	// pointerdown, then the click would open it straight back up
	let volumePopoverClosedAt = 0;
	const onVolumePopoverBeforeToggle = (e: Event) => {
		if ((e as ToggleEvent).newState === "closed")
			volumePopoverClosedAt = performance.now();
	};
	// it's in the top layer, positioned once on open; scrolling would leave
	// it floating where the button was, so it just closes then
	const onVolumePopoverToggle = (e: Event) => {
		const pop = e.currentTarget as HTMLElement;
		const open = (e as ToggleEvent).newState === "open";
		pop.closest(".lastfm-player")
			?.querySelector(".lastfm-volume > .lastfm-vol-btn")
			?.setAttribute("aria-expanded", String(open));
		if (open) window.addEventListener("scroll", closeVolumePopover, { passive: true });
		else window.removeEventListener("scroll", closeVolumePopover);
	};
	const openVolumePopover = (btn: HTMLElement, pop: HTMLElement) => {
		pop.showPopover();
		const b = btn.getBoundingClientRect();
		const p = pop.getBoundingClientRect();
		const margin = 8;
		const left = Math.min(
			window.innerWidth - p.width - margin,
			Math.max(margin, b.left + b.width / 2 - p.width / 2)
		);
		pop.style.left = `${left}px`;
		pop.style.top = `${Math.max(margin, b.top - p.height - margin)}px`;
	};

	// turning the phone switches between the two, so put either away
	portraitMQ?.addEventListener("change", () => {
		closeVolumePopover();
		collapseVolume();
	});

	const onVolumeButtonClick = (e: MouseEvent) => {
		e.preventDefault();
		const el = playerEl();
		if (!el || !touchMQ?.matches) {
			toggleMute();
			return;
		}
		const btn = e.currentTarget as HTMLElement;
		const pop = el.querySelector<HTMLElement>(".lastfm-vol-pop");
		if (portraitMQ?.matches && canPopover && pop) {
			if (performance.now() - volumePopoverClosedAt > 400)
				openVolumePopover(btn, pop);
			return;
		}
		if (el.dataset.volOpen !== "1") {
			el.dataset.volOpen = "1";
			document.addEventListener("pointerdown", onOutsideVolume, true);
			syncPlayer();
			return;
		}
		toggleMute();
	};

	const setMediaSession = (track: LastfmTrack) => {
		if (!("mediaSession" in navigator)) return;
		const art = track.appleMusic?.artwork ?? track.image;
		navigator.mediaSession.metadata = new MediaMetadata({
			title: track.name,
			artist: track.artist,
			album: track.album,
			artwork: art ? [{ src: art, sizes: "192x192" }] : [],
		});
		navigator.mediaSession.setActionHandler("play", () => {
			if (audioFor) playPreview(audioFor);
		});
		navigator.mediaSession.setActionHandler("pause", pausePreview);
		navigator.mediaSession.setActionHandler("seekto", (d) => {
			if (audio && d.seekTime != null) audio.currentTime = d.seekTime;
		});
	};

	// Must stay synchronous up to play(): it's called from click/key/pointer
	// handlers and Safari drops the user-gesture permission across an await.
	const playPreview = (url: string, at?: number) => {
		const unlockGraph = () => {
			ensureGraph();
			void audioCtx?.resume();
			applyVolume();
		};
		if (isCurrent(url)) {
			unlockGraph();
			if (at != null) audio!.currentTime = at * currentDuration();
			const fromBeginning =
				at === 0 || (at == null && audio!.currentTime === 0);
			if (stopping) {
				stopping = false; // caught it mid spin-down: back up from here
			} else if (audio!.paused) {
				setSpin(0, !fromBeginning);
				audio!.play().catch(() => {});
			}
			startSpin(fromBeginning);
			syncPlayer();
			return;
		}
		cancelAnimationFrame(spinRaf);
		stopping = false;
		audio?.pause();
		const a = ensureAudio();
		unlockGraph();
		const fromBeginning = !at;
		setSpin(0, !fromBeginning);
		a.src = ready.get(url)?.src ?? url;
		audioFor = url;
		pendingSeek = at ?? null;
		const v = state.view;
		if (v.kind === "loaded") setMediaSession(v.track);
		a.play().catch(() => syncPlayer());
		startSpin(fromBeginning);
		// make sure the real waveform is on its way (no-op if already loaded)
		loadPreview(url).catch(() => {});
		syncPlayer();
	};

	const onPlayClick = (e: MouseEvent) => {
		e.preventDefault();
		const url = playerEl()?.dataset.src;
		if (!url) return;
		if (isCurrent(url) && !audio!.paused && !stopping) pausePreview();
		else playPreview(url);
	};

	// start downloading as soon as the pointer heads for the button
	// Lazily fetch the preview (and so the real waveform) once the player is
	// about to scroll into view, in idle time so it never competes with the
	// page loading. Skipped when the browser asks to save data; hovering or
	// playing still loads it then.
	const saveData = () => {
		const c = (
			navigator as {
				connection?: { saveData?: boolean; effectiveType?: string };
			}
		).connection;
		return !!c?.saveData || /(^|-)2g$/.test(c?.effectiveType ?? "");
	};

	// Safari has no requestIdleCallback
	const whenIdle = (fn: () => void) => {
		if (typeof window.requestIdleCallback === "function") {
			window.requestIdleCallback(fn, { timeout: 2000 });
		} else {
			setTimeout(fn, 300);
		}
	};

	// The album art palette rides along: it's a few hundred bytes, so it's
	// fetched even when saving data.
	const watchPlayer = () => {
		const el = playerEl();
		const url = el?.dataset.src;
		const art = el?.dataset.art;
		const wantsPreview = !!url && !previews.has(url) && !saveData();
		const wantsPalette = !!art && !paletteLoads.has(art);
		if (!el || (!wantsPreview && !wantsPalette)) return;
		previewObserver ??= new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (!entry.isIntersecting) continue;
					previewObserver?.unobserve(entry.target);
					const { src: u, art: a } = (entry.target as HTMLElement).dataset;
					whenIdle(() => {
						if (a) loadPalette(a);
						if (u && !saveData()) void loadPreview(u).catch(() => {});
					});
				}
			},
			{ rootMargin: "200px" }
		);
		previewObserver.observe(el);
	};

	// after the card body (re-)renders: fit the title and waveform, bring the
	// fresh player node in line with the audio, and set up its lazy load.
	// Safe to run more than once per render.
	const afterRender = () => {
		scheduleFit();
		syncPlayer();
		watchPlayer();
	};

	const onPlayHover = () => {
		const el = playerEl();
		const url = el?.dataset.src;
		if (el?.dataset.art) loadPalette(el.dataset.art);
		if (url) void loadPreview(url).catch(() => {});
	};

	const waveFraction = (e: PointerEvent) => {
		const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
		return Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
	};

	const seekTo = (frac: number) => {
		const url = playerEl()?.dataset.src;
		if (!url) return;
		if (!isCurrent(url)) {
			playPreview(url, frac);
		} else if (audio!.readyState < HTMLMediaElement.HAVE_METADATA) {
			pendingSeek = frac; // duration unknown yet; applied at loadedmetadata
		} else {
			audio!.currentTime = frac * currentDuration();
			syncProgress();
		}
	};

	// ---- Scrubbing --------------------------------------------------------
	// Dragging across the waveform plays the decoded audio through Web Audio
	// at the speed you drag, like moving a tape or record by hand: slow is
	// slow and low, fast is fast and high, left plays it backwards (from a
	// reversed copy), and holding still is silent. One buffer source plays
	// continuously while you drag; its own playhead (pos) chases the
	// pointer with a short spring (SCRUB_FOLLOW_S) and its playbackRate is
	// whatever speed that takes, so it doesn't stutter. Changing direction
	// crossfades to a source on the other buffer. The <audio> element is
	// paused throughout and seeks once, on release. Without decoded audio
	// yet it falls back to one element seek a frame.

	const reversed = new Map<string, AudioBuffer>();
	// how loosely the audio follows the pointer: higher averages out an
	// unsteady hand (smoother speed) at the cost of trailing it a little more
	const SCRUB_FOLLOW_S = 0.18;
	const SCRUB_RATE_SMOOTH_S = 0.12; // averages the speed over ~this long
	const SCRUB_MAX_RATE = 8;
	const SCRUB_MIN_RATE = 0.04; // below this it's treated as stopped (silent)
	const SCRUB_JUMP_S = 1.5; // further than this behind: jump instead of racing
	const SCRUB_RESYNC_S = 1; // restart the source at pos this often, so it can't drift
	const SCRUB_XFADE_S = 0.015;

	const reversedBuffer = (url: string, buf: AudioBuffer) => {
		let r = reversed.get(url);
		if (!r && audioCtx) {
			r = audioCtx.createBuffer(buf.numberOfChannels, buf.length, buf.sampleRate);
			for (let c = 0; c < buf.numberOfChannels; c++) {
				r.getChannelData(c).set(buf.getChannelData(c).slice().reverse());
			}
			reversed.set(url, r);
		}
		return r;
	};

	// fade out and stop whatever source is playing
	const releaseSource = (s: Scrub) => {
		if (!audioCtx || !s.src || !s.srcGain) return;
		const now = audioCtx.currentTime;
		s.srcGain.gain.cancelScheduledValues(now);
		s.srcGain.gain.setValueAtTime(s.srcGain.gain.value, now);
		s.srcGain.gain.linearRampToValueAtTime(0, now + SCRUB_XFADE_S);
		s.src.stop(now + SCRUB_XFADE_S + 0.005);
		s.src = null;
		s.srcGain = null;
	};

	// (re)start playback at s.pos in `dir`, crossfading from any current source
	const startSource = (s: Scrub, dir: 1 | -1) => {
		if (!audioCtx) return;
		const buf = dir > 0 ? s.buf : reversedBuffer(s.url, s.buf);
		if (!buf) return;
		releaseSource(s);
		const now = audioCtx.currentTime;
		const src = audioCtx.createBufferSource();
		src.buffer = buf;
		src.playbackRate.value = Math.max(0.01, Math.abs(s.rate));
		const g = audioCtx.createGain();
		g.gain.setValueAtTime(0, now);
		g.gain.linearRampToValueAtTime(1, now + SCRUB_XFADE_S);
		src.connect(g).connect(s.out);
		const offset = dir > 0 ? s.pos : s.buf.duration - s.pos;
		src.start(now, Math.min(s.buf.duration - 0.001, Math.max(0, offset)));
		s.src = src;
		s.srcGain = g;
		s.dir = dir;
		s.lastSync = performance.now();
	};

	const scrubLoop = (now: number) => {
		const s = scrub;
		if (!s || !audioCtx) return;
		const dt = Math.min(0.05, Math.max(0.001, (now - s.lastFrame) / 1000));
		s.lastFrame = now;
		const dur = s.buf.duration;
		const target = s.frac * dur;
		let error = target - s.pos;
		if (Math.abs(error) > SCRUB_JUMP_S) {
			s.pos = target;
			error = 0;
			if (s.src) startSource(s, s.dir);
		}
		// speed the spring wants, eased so jittery pointer events don't warble
		const want = Math.max(-SCRUB_MAX_RATE, Math.min(SCRUB_MAX_RATE, error / SCRUB_FOLLOW_S));
		s.rate += (want - s.rate) * Math.min(1, dt / SCRUB_RATE_SMOOTH_S);
		s.pos = Math.min(dur, Math.max(0, s.pos + s.rate * dt));

		const moving = Math.abs(s.rate) > SCRUB_MIN_RATE;
		const dir: 1 | -1 = s.rate >= 0 ? 1 : -1;
		if (
			moving &&
			(!s.moving || !s.src || dir !== s.dir || now - s.lastSync > SCRUB_RESYNC_S * 1000)
		) {
			startSource(s, dir); // starting, turning round, or re-syncing
		}
		s.moving = moving;
		const ctxNow = audioCtx.currentTime;
		s.src?.playbackRate.setTargetAtTime(Math.max(0.01, Math.abs(s.rate)), ctxNow, 0.01);
		s.out.gain.setTargetAtTime(moving ? 1 : 0, ctxNow, 0.02);
		syncProgress();
		s.raf = requestAnimationFrame(scrubLoop);
	};

	let fallbackRaf = 0;
	let fallbackFrac: number | null = null;

	// Ends a drag: stops the scrub audio and (with commit) seeks the element
	// there and resumes it. Safe to call more than once, which matters: the
	// card re-renders every minute, and if that replaces the player mid-drag
	// the release can land anywhere. Before this, a missed release left the
	// old scrub alive, and the next press orphaned its source, which kept
	// playing at its last speed alongside the real playback.
	const endScrub = (commit: boolean) => {
		dragging = false;
		window.removeEventListener("pointerup", onWindowUp, true);
		window.removeEventListener("pointercancel", onWindowUp, true);
		const s = scrub;
		if (!s) return;
		scrub = null;
		cancelAnimationFrame(s.raf);
		releaseSource(s);
		// every source of this drag goes through `out`, so cutting it after
		// the fade silences anything that slipped through, too
		const out = s.out;
		setTimeout(() => out.disconnect(), 100);
		if (!commit || !audio) {
			syncPlayer();
			return;
		}
		const a = audio;
		if (a.readyState < HTMLMediaElement.HAVE_METADATA) pendingSeek = s.frac;
		else a.currentTime = s.frac * currentDuration();
		if (s.resume) {
			// carry on with a quick fade-in rather than the vinyl spin-up
			setSpin(0, false);
			a.play().catch(() => syncPlayer());
			startSpin(true);
		} else {
			applyVolume();
		}
		syncPlayer();
	};

	const onWindowUp = () => endScrub(true);

	const onWaveDown = (e: PointerEvent) => {
		if (e.button !== 0) return;
		e.preventDefault();
		// a previous drag that never got its release
		endScrub(false);
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		dragging = true;
		window.addEventListener("pointerup", onWindowUp, true);
		window.addEventListener("pointercancel", onWindowUp, true);
		const url = playerEl()?.dataset.src;
		if (!url) return;
		const frac = waveFraction(e);
		const buf = buffers.get(url);

		// scrubbing needs the decoded audio and the Web Audio graph (which
		// has to be unlocked here, inside the gesture)
		const fresh = !isCurrent(url);
		if (buf) {
			if (fresh) {
				audio?.pause();
				const a = ensureAudio();
				a.src = ready.get(url)?.src ?? url;
				audioFor = url;
				const v = state.view;
				if (v.kind === "loaded") setMediaSession(v.track);
			}
			ensureGraph();
			void audioCtx?.resume();
		}
		if (!buf || !audioCtx || !gain) {
			seekTo(frac);
			return;
		}
		const wasPlaying = !audio!.paused && !stopping;
		cancelAnimationFrame(spinRaf);
		stopping = false;
		audio!.pause();
		const out = audioCtx.createGain();
		out.gain.value = 0;
		out.connect(gain);
		scrub = {
			url,
			buf,
			frac,
			pos: frac * buf.duration,
			rate: 0,
			dir: 1,
			moving: false,
			src: null,
			srcGain: null,
			out,
			lastFrame: performance.now(),
			lastSync: 0,
			resume: wasPlaying || fresh, // a click on an idle player plays from there
			raf: 0,
		};
		reversedBuffer(url, buf); // now, rather than mid-drag
		applyVolume();
		syncPlayer();
		scrub.raf = requestAnimationFrame(scrubLoop);
	};

	const onWaveMove = (e: PointerEvent) => {
		const frac = waveFraction(e);
		playerEl()?.style.setProperty("--hover", String(frac));
		if (!dragging) return;
		// the button's up but we never heard about it: don't scrub on hover
		if (e.pointerType === "mouse" && e.buttons === 0) {
			endScrub(true);
			return;
		}
		if (scrub) {
			scrub.frac = frac; // picked up by the next scrubLoop frame
		} else {
			// no decoded audio yet: at most one element seek per frame
			fallbackFrac = frac;
			if (!fallbackRaf) {
				fallbackRaf = requestAnimationFrame(() => {
					fallbackRaf = 0;
					if (fallbackFrac != null) seekTo(fallbackFrac);
				});
			}
		}
	};

	const onWaveUp = () => endScrub(true);

	// capture can also go away without a pointerup (the element was
	// re-rendered away, the OS took the pointer)
	const onWaveLostCapture = () => {
		if (dragging) endScrub(true);
	};

	const onWaveLeave = () => {
		if (!dragging) playerEl()?.style.setProperty("--hover", "0");
	};

	const onWaveKey = (e: KeyboardEvent) => {
		const url = playerEl()?.dataset.src;
		if (!url) return;
		if (e.key === " " || e.key === "Enter") {
			e.preventDefault();
			if (isCurrent(url) && !audio!.paused && !stopping) pausePreview();
			else playPreview(url);
			return;
		}
		if (!isCurrent(url)) return;
		const dur = currentDuration();
		const step = e.shiftKey ? 5 : 2;
		const t = audio!.currentTime;
		const next =
			e.key === "ArrowRight" || e.key === "ArrowUp"
				? t + step
				: e.key === "ArrowLeft" || e.key === "ArrowDown"
					? t - step
					: e.key === "Home"
						? 0
						: e.key === "End"
							? dur - 0.05
							: null;
		if (next == null) return;
		e.preventDefault();
		audio!.currentTime = Math.min(dur, Math.max(0, next));
		syncProgress();
	};

	let ro: ResizeObserver | null = null;
	let initialTimer = 0;
	const refreshWhenVisible = () => {
		if (
			document.visibilityState === "visible" &&
			this.root?.isConnected &&
			!state.refreshing &&
			// don't swap the card's DOM out from under a playing preview
			!(audio && !audio.paused)
		) {
			load();
		}
	};

	this.cx.mount = () => {
		if (import.meta.env.SSR) return;
		cancelled = false;

		// Tag the card so the fade-in rules apply. We do this imperatively
		// instead of in the JSX because dreamland's SSR hydration strips
		// any static or reactive class binding on this element. Removing
		// it after the initial reveal is enough to gate refreshes — fresh
		// DOM nodes inserted later won't match the rule.
		this.root?.classList.add("is-initial");

		// Web Audio gain works everywhere it exists (iOS included); otherwise
		// see whether plain audio.volume sticks
		volumeSupported = !!AudioCtx();
		if (!volumeSupported) {
			try {
				const probe = new Audio();
				probe.volume = 0.5;
				volumeSupported = Math.abs(probe.volume - 0.5) < 0.01;
			} catch {
				volumeSupported = false;
			}
		}

		load();
		const id = setInterval(() => {
			refreshWhenVisible();
		}, REFRESH_MS);
		document.addEventListener("visibilitychange", refreshWhenVisible);

		// Re-fit when the card's column width changes (responsive resize).
		if (typeof ResizeObserver !== "undefined") {
			ro = new ResizeObserver(scheduleFit);
			ro.observe(this.root);
		}

		// View changes (new track, refresh, error→ok) replace the title node
		// inside the reactive subtree, so re-run fit on the new node. Also
		// arms a one-shot timer on the first transition out of "loading"
		// that strips .is-initial — without it, every refresh would replay
		// the fade-in (since fresh DOM nodes restart CSS animations). 1s
		// is long enough for the slowest animation (the 0.9s bleed) to
		// finish before the gate disappears.
		let firstTransitionDone = false;
		use(state.view).listen((v) => {
			if (!firstTransitionDone && v.kind !== "loading") {
				firstTransitionDone = true;
				initialTimer = window.setTimeout(() => {
					if (!cancelled) this.root?.classList.remove("is-initial");
				}, 1000);
			}
			scheduleFit();
			// a fresh player node starts out idle; bring it in line with the audio
			requestAnimationFrame(afterRender);
		});

		return () => {
			cancelled = true;
			controller?.abort();
			fetchAbort?.abort();
			cancelAnimationFrame(progressRaf);
			cancelAnimationFrame(spinRaf);
			if (audio) {
				audio.pause();
				audio.removeAttribute("src");
				audio.load();
			}
			void audioCtx?.close();
			blobUrls.forEach((u) => URL.revokeObjectURL(u));
			clearInterval(id);
			document.removeEventListener("visibilitychange", refreshWhenVisible);
			ro?.disconnect();
			previewObserver?.disconnect();
			cancelAnimationFrame(rafId);
			clearTimeout(initialTimer);
		};
	};

	const fallbackUrl = "https://www.last.fm/user/bmbrfsh";

	return (
		<div class="livecard lastfm-card background-container">
			<p class="livecard-header">
				<span class="livecard-icon">
					<LastFmIcon />
				</span>
				<span class="livecard-platform">last.fm</span>
				{use(state.view).map((v) =>
					v.kind === "loaded" ? (
						<>
							{v.profile?.totalScrobbles != null ? (
								<span class="livecard-stat">
									{" "}
									• {v.profile.totalScrobbles.toLocaleString()} total scrobbles
								</span>
							) : null}
							{v.track.nowPlaying ? (
								<span class="livecard-badge">now playing</span>
							) : null}
						</>
					) : null
				)}
				<button
					type="button"
					class="livecard-topbtn livecard-refresh"
					class:refreshing={use(state.refreshing)}
					title="refresh"
					aria-label="refresh"
					on:click={onRefresh}
				>
					<span class="material-symbols">refresh</span>
				</button>
				<a
					href={use(state.view).map((v) =>
						v.kind === "loaded" && v.track.url ? v.track.url : fallbackUrl
					)}
					target="_blank"
					rel="me"
					class="livecard-topbtn"
				>
					<span class="material-symbols">open_in_new</span>
				</a>
			</p>

			{use(state.view).map((v) => {
				if (v.kind === "loading")
					return <p class="livecard-status">loading…</p>;
				if (v.kind === "error")
					return <p class="livecard-status">couldn't load ({v.message})</p>;
				if (v.kind === "empty")
					return <p class="livecard-status">no recent scrobbles</p>;

				const t = v.track;
				const hasStats =
					t.duration != null ||
					(t.userPlayCount != null && t.userPlayCount > 0) ||
					(t.listeners != null && t.listeners > 0) ||
					t.loved;
				const am = t.appleMusic;
				const previewUrl = am?.previewUrl ?? null;
				// starts empty (or real, if already decoded); syncPlayer moves it
				// through loading / real / placeholder from there
				const known = previewUrl ? realPeaks.get(previewUrl) : undefined;
				const peaks = known ?? new Array<number>(WAVE_BARS).fill(0);
				// three identical bar rows stacked: base, hover highlight, played
				// s2/s4 mark the bars dropped when the waveform is narrow (see
				// fitWave); classes because dreamland's CSS scoping breaks
				// :nth-child() arguments
				const bars = () =>
					peaks.map((h, i) => (
						<i
							class={i % 2 ? "s2" : i % 4 ? "s4" : ""}
							style={`--h: ${h.toFixed(3)}; --d: ${sweepDelay(i)}s`}
						/>
					));
				const player = previewUrl ? (
					<div
						class="lastfm-player"
						data-src={previewUrl}
						data-state="idle"
						data-peaks={known ? "real" : "empty"}
						data-seed={am?.id || previewUrl}
						// the cover the card shows, for the waveform palette
						data-art={t.image ?? am?.artwork ?? ""}
					>
						<button
							type="button"
							class="lastfm-play"
							aria-label="play preview"
							title="30 second preview"
							on:click={onPlayClick}
							on:pointerenter={onPlayHover}
							on:focus={onPlayHover}
						>
							<span class="material-symbols">play_arrow</span>
						</button>
						<div
							class="lastfm-wave"
							role="slider"
							tabindex="0"
							aria-label="preview position"
							aria-valuemin="0"
							aria-valuemax="30"
							aria-valuenow="0"
							aria-valuetext="0:00 of 0:30"
							on:pointerdown={onWaveDown}
							on:pointermove={onWaveMove}
							on:pointerup={onWaveUp}
							on:pointercancel={onWaveUp}
							on:lostpointercapture={onWaveLostCapture}
							on:pointerleave={onWaveLeave}
							on:keydown={onWaveKey}
						>
							<div class="lastfm-wave-bars is-base">{bars()}</div>
							<div class="lastfm-wave-bars is-hover">{bars()}</div>
							<div class="lastfm-wave-bars is-played">{bars()}</div>
						</div>
						<span class="lastfm-time">0:00 / 0:30</span>
						<div class="lastfm-volume">
							<button
								type="button"
								class="lastfm-vol-btn"
								aria-label="mute"
								on:click={onVolumeButtonClick}
							>
								<span class="material-symbols">volume_down</span>
							</button>
							<input
								type="range"
								class="lastfm-vol-range"
								min="0"
								max="100"
								step="1"
								value={String(Math.round(volume * 100))}
								aria-label="preview volume"
								on:input={onVolumeInput}
							/>
							{/* touch screens in portrait: opened by the button above */}
							<div
								class="lastfm-vol-pop"
								popover="auto"
								on:beforetoggle={onVolumePopoverBeforeToggle}
								on:toggle={onVolumePopoverToggle}
							>
								<button
									type="button"
									class="lastfm-vol-btn"
									aria-label="mute"
									on:click={onMuteClick}
								>
									<span class="material-symbols">volume_down</span>
								</button>
								<input
									type="range"
									class="lastfm-vol-range"
									min="0"
									max="100"
									step="1"
									value={String(Math.round(volume * 100))}
									aria-label="preview volume"
									on:input={onVolumeInput}
								/>
							</div>
						</div>
						{am?.url ? (
							<a
								class="lastfm-am-link"
								href={am.url}
								target="_blank"
								title="listen on apple music"
								aria-label="listen on apple music"
							>
								<AppleMusicWordmark />
							</a>
						) : null}
					</div>
				) : null;
				return (
					<>
						<div class="lastfm-track">
							{t.image ? (
								<>
									<img
										class="lastfm-art-bleed"
										src={t.image}
										alt=""
										loading="lazy"
									/>
									<img class="lastfm-art" src={t.image} alt="" loading="lazy" />
								</>
							) : null}
							<div class="lastfm-meta">
								<a class="lastfm-title-link" href={t.url}>
									<h3 class="lastfm-title">
										<span class="lastfm-title-inner">{t.name}</span>
									</h3>
								</a>
								<p class="lastfm-artist">
									{t.artistUrl ? (
										<a href={t.artistUrl}>{t.artist}</a>
									) : (
										t.artist
									)}
									{t.album ? (
										<span class="lastfm-album">
											{" – "}
											{t.albumUrl ? (
												<a href={t.albumUrl}>{t.album}</a>
											) : (
												t.album
											)}
										</span>
									) : null}
								</p>
								{hasStats ? (
									<p class="lastfm-stats">
										{t.duration != null ? (
											<span class="lastfm-stat" title="duration">
												<span class="material-symbols">schedule</span>
												{formatDuration(t.duration)}
											</span>
										) : null}
										{t.userPlayCount != null && t.userPlayCount > 0 ? (
											<span
												class="lastfm-stat"
												title={
													t.userPlayCount === 1
														? "1 play by me"
														: `${t.userPlayCount.toLocaleString()} plays by me`
												}
											>
												<span class="material-symbols">play_arrow</span>
												{t.userPlayCount.toLocaleString()}
											</span>
										) : null}
										{t.listeners != null && t.listeners > 0 ? (
											<span
												class="lastfm-stat"
												title={`${t.listeners.toLocaleString()} listeners on last.fm`}
											>
												<span class="material-symbols">headphones</span>
												{compactNumber(t.listeners)}
											</span>
										) : null}
										{t.loved ? (
											<span
												class="lastfm-stat lastfm-stat-loved"
												title="loved"
												aria-label="loved track"
											>
												<span class="material-symbols">favorite</span>
											</span>
										) : null}
									</p>
								) : null}
								{!t.nowPlaying && t.playedAt ? (
									<p class="lastfm-when">
										{humanizeDuration(
											Date.now() - new Date(t.playedAt).getTime(),
											{ largest: 1, round: true }
										)}{" "}
										ago
									</p>
								) : null}
							</div>
						</div>
						{player}
					</>
				);
			})}
		</div>
	);
}

// Shared .livecard / .livecard-* styles live in src/style.css so they apply
// here without re-declaration. Only lastfm-track-specific styles below.
LastFmCard.style = css`
	:scope {
		overflow: hidden;
		contain: paint layout;
		display: flex;
		flex-direction: column;
	}

	.lastfm-track {
		display: flex;
		gap: 1rem;
		align-items: center;
		margin-block: auto;
	}

	.lastfm-meta {
		min-width: 0;
		/* must be explicit: container-type: inline-size adds size containment,
		   which hides children from the flex sizing algo, so without flex: 1
		   the column collapses to 0 width */
		flex: 1 1 0;
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		/* establish a containment context so children can size against the
		   actual meta column width (~55% of the card) instead of the viewport */
		container-type: inline-size;
	}

	/* applies to the <h1> title too, not just <p>, so long words break */
	.lastfm-meta :is(p, h1) {
		margin: 0;
		overflow-wrap: anywhere;
	}

	/* title/artist/album are three independent links: inherit the visual
	   styles set on the surrounding text rather than the global link color,
	   and only show the underline/accent affordance on hover */
	.lastfm-meta a {
		color: inherit;
		text-decoration: none;
		transition:
			color 0.2s ease,
			text-decoration-color 0.2s ease;
	}

	.lastfm-meta a:hover,
	.lastfm-meta a:focus-visible {
		color: var(--supertext);
		text-decoration: underline;
		text-decoration-color: var(--supertext);
		text-decoration-thickness: 2px;
	}

	/* the title's <a> wraps a heading so it needs to be block to wrap properly
	   and not eat extra space */
	.lastfm-title-link {
		display: block;
	}

	.lastfm-art {
		width: 40%;
		height: auto;
		aspect-ratio: 1;
		object-fit: cover;
		flex-shrink: 0;
		border: 1px solid var(--surface2);
	}

	.lastfm-art-bleed {
		height: 100%;
		position: absolute;
		left: 0;
		top: 0;
		z-index: -1;
		transform: translateX(-28%) translateY(-2%) scale(2);
		transform-origin: left center;
		filter: brightness(0.75) contrast(1.1) saturate(1.3) blur(0.8px);
		mask-image: linear-gradient(
			105deg,
			rgba(0, 0, 0, 0.2) 0%,
			rgba(0, 0, 0, 0.15) 40%,
			transparent 72%
		);
	}

	.lastfm-title {
		color: var(--supertext);
		margin-block: 0;
		/* fluid baseline driven by the meta column width. JS may override
		   font-size inline if the natural value wraps to >2 lines. */
		font-size: clamp(1.25rem, 13cqi, 2.25rem);
		line-height: 1.1;
		font-variation-settings: "ELSH" 85;
	}

	/* When a title still doesn't fit two lines even at the floor font size,
	   the component switches to single-line marquee mode. The mask fades the
	   text at the clip edges so it doesn't pop in/out abruptly. */
	.lastfm-title.is-marquee {
		white-space: nowrap;
		overflow: hidden;
		hyphens: none;
		text-wrap: nowrap;
		-webkit-mask-image: linear-gradient(
			90deg,
			transparent 0,
			#000 0.75rem,
			#000 calc(100% - 0.75rem),
			transparent 100%
		);
		mask-image: linear-gradient(
			90deg,
			transparent 0,
			#000 0.75rem,
			#000 calc(100% - 0.75rem),
			transparent 100%
		);
	}

	.lastfm-title.is-marquee .lastfm-title-inner {
		display: inline-block;
		animation: lastfm-title-marquee var(--marquee-duration, 10s) ease-in-out
			infinite alternate;
		will-change: transform;
	}

	/* Pause while the user is reading / interacting. */
	.lastfm-title.is-marquee:hover .lastfm-title-inner,
	.lastfm-title.is-marquee:focus-within .lastfm-title-inner {
		animation-play-state: paused;
	}

	/* alternate + the 10% pauses on each end give a smooth bounce that lingers
	   long enough on each side to actually read the start/end of the title. */
	@keyframes lastfm-title-marquee {
		0%,
		10% {
			transform: translateX(0);
		}
		90%,
		100% {
			transform: translateX(calc(-1 * var(--marquee-distance, 0px)));
		}
	}

	/* The global prefers-reduced-motion rule kills the animation; fall back to
	   plain ellipsis so the title is still readable as truncation. */
	@media (prefers-reduced-motion: reduce) {
		.lastfm-title.is-marquee {
			text-overflow: ellipsis;
		}
	}

	.lastfm-artist {
		color: var(--text);
		font-size: clamp(1rem, 6cqi, 1.3rem);
		line-height: 1.25;
	}
	.lastfm-album {
		color: var(--text1);
		font-size: clamp(0.9rem, 5.2cqi, 1.15rem);
	}
	.lastfm-when {
		color: var(--subtext2);
		margin-top: 0.2rem !important;
		font-size: 0.85rem;
	}

	/* Footer stats row — lives at the bottom of the meta column so it fills the
	   leftover space beneath title/artist/when. margin-top: auto pushes it down
	   regardless of how short the metadata block above ends up. */
	.lastfm-stats {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.3rem 0.55rem;
		margin: 0;
		margin-top: auto !important;
		padding-top: 0.4rem;
		color: var(--subtext2);
		font-size: 0.8rem;
		line-height: 1.4;
		/* numbers feel more "stat-like" when monowidth */
		font-variant-numeric: tabular-nums;
	}

	.lastfm-stat {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		white-space: nowrap;
	}

	/* "/" separator between consecutive stats. Sibling-only selector means
	   conditionally-hidden stats don't leave dangling slashes. */
	.lastfm-stat + .lastfm-stat::before {
		content: "/";
		color: var(--subtext1);
		margin-right: 0.3rem;
	}

	.lastfm-stats .material-symbols {
		font-size: 1rem;
		color: var(--subtext1);
	}

	/* Loved indicator: warm rose-red that reads on both light and dark themes */
	.lastfm-stat-loved {
		color: hsl(354, 70%, 64%);
	}

	.lastfm-stat-loved .material-symbols {
		color: inherit;
	}

	/* ---- Apple Music preview player ---- */

	/* --progress (0-1) and --hover (0-1) are set from JS */
	.lastfm-player {
		--progress: 0;
		--hover: 0;
		--vol: 0.4;
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto auto auto;
		align-items: center;
		gap: 0.7rem;
		margin-top: 0.9rem;
	}

	.lastfm-play {
		display: inline-grid;
		place-items: center;
		width: 2.25rem;
		height: 2.25rem;
		padding: 0;
		border: none;
		cursor: pointer;
		color: var(--accent);
		background: hsla(var(--accent-hsl), 0.14);
		transition:
			background 0.15s ease,
			color 0.15s ease;
	}

	.lastfm-play:hover {
		color: var(--supertext);
		background: hsla(var(--accent-hsl), 0.24);
	}

	.lastfm-play .material-symbols {
		font-size: 1.4rem;
	}

	.lastfm-player[data-state="loading"] .lastfm-play .material-symbols {
		animation: lastfm-spin 0.9s linear infinite;
	}

	@keyframes lastfm-spin {
		to {
			transform: rotate(1turn);
		}
	}

	/* SoundCloud-style: bars sit on a baseline 66% of the way down, with a
	   reflection underneath that fades out (it can spill a little past the
	   bottom of the box; the tallest ones run into the card's padding). Three identical rows are stacked and
	   clipped: the dim base, a hover highlight up to the pointer, and the
	   played part up to --progress. */
	.lastfm-wave {
		position: relative;
		height: 2.6rem;
		cursor: pointer;
		touch-action: none;
		outline-offset: 3px;
	}

	.lastfm-wave-bars {
		position: absolute;
		inset: 0 0 34% 0;
		display: flex;
		align-items: flex-end;
		/* thin fixed-width bars, evenly spread: the spacing absorbs the width */
		justify-content: space-between;
		pointer-events: none;
	}

	/* narrow waveform: fitWave thins the bars out so they stay visible */
	.lastfm-player[data-wave-step="2"] .lastfm-wave-bars .s2,
	.lastfm-player[data-wave-step="4"] .lastfm-wave-bars .s2,
	.lastfm-player[data-wave-step="4"] .lastfm-wave-bars .s4 {
		display: none;
	}

	/* Bars are full height, drawn at scaleY(--h) from the baseline, so the
	   loading ripple and the morph into the real waveform are both
	   transforms (GPU only; animating height on 270 bars meant a layout pass
	   every frame). The reflection scales along with its bar. */
	.lastfm-wave-bars i {
		position: relative;
		flex: 0 0 1.5px;
		height: 100%;
		background: currentColor;
		transform-origin: bottom;
		transform: scaleY(var(--h));
		transition:
			transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1),
			color 0.8s ease;
		/* keep them as (tiny) GPU layers for good: otherwise the browser
		   promotes all 270 when the morph starts and demotes them when it
		   ends, and each of those costs a dropped frame or two */
		will-change: transform;
	}

	.lastfm-wave-bars i::after {
		content: "";
		position: absolute;
		left: 0;
		right: 0;
		top: calc(100% + 1.5px);
		height: 70%;
		background: linear-gradient(to bottom, currentColor, transparent);
		opacity: 0.55;
		/* soft, like a reflection on a wet surface; bars stay crisp */
		filter: blur(0.9px);
	}

	.lastfm-wave-bars.is-base {
		color: hsla(var(--overlay1-hsl), 0.4);
	}

	/* the shape is a guess when the real audio couldn't be decoded */
	.lastfm-player[data-peaks="placeholder"] .lastfm-wave-bars.is-base {
		color: hsla(var(--overlay1-hsl), 0.28);
	}

	/* while the preview downloads: a single low, broad crest sweeping left
	   to right over and over, like an indeterminate progress bar. Each bar
	   rises over 30% of the 1.5s cycle; --d (sweepDelay) staggers the start
	   along an ease-in-out-quart, so the crest creeps out, whips across
	   the middle (stretching wide there) and settles in at the right.
	   transform keeps it off the main thread; reduced motion leaves it as
	   a flat line. */
	.lastfm-player[data-peaks="loading"] .lastfm-wave-bars i {
		animation: lastfm-wave-sweep 1.5s ease-in-out infinite both;
		animation-delay: var(--d);
	}

	@keyframes lastfm-wave-sweep {
		0%,
		30%,
		100% {
			transform: scaleY(0.09);
		}

		15% {
			transform: scaleY(0.41);
		}
	}

	/* negative bottom inset keeps the (longer) reflections inside the clip */
	.lastfm-wave-bars.is-hover {
		color: hsla(var(--overlay3-hsl), 0.55);
		clip-path: inset(0 calc((1 - var(--hover)) * 100%) -100% 0);
		opacity: 0;
		transition: opacity 0.15s ease;
	}

	.lastfm-wave:hover .lastfm-wave-bars.is-hover {
		opacity: 1;
	}

	.lastfm-wave-bars.is-played {
		color: var(--accent);
		clip-path: inset(0 calc((1 - var(--progress)) * 100%) -100% 0);
	}

	/* Album art palette (see applyPalette): every bar gets its own --c along
	   the cover's gradient. Played is the full colour; the rest of the track
	   is a faint version of the same gradient, so the colours are there
	   before you press play, like the Dynamic Island's idle tint. */
	.lastfm-player[data-palette] .lastfm-wave-bars.is-played i {
		color: var(--c);
	}

	.lastfm-player[data-palette] .lastfm-wave-bars.is-hover i {
		color: color-mix(in oklab, var(--c) 55%, transparent);
	}

	.lastfm-player[data-palette] .lastfm-wave-bars.is-base i {
		color: color-mix(in oklab, var(--c) 30%, transparent);
	}

	.lastfm-player[data-palette][data-peaks="placeholder"]
		.lastfm-wave-bars.is-base
		i {
		color: color-mix(in oklab, var(--c) 20%, transparent);
	}

	.lastfm-time {
		color: var(--subtext1);
		font-size: 0.75rem;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	/* Volume. With a mouse: the icon mutes and the slider slides out on
	   hover/focus. On touch screens (no hover) it's tucked away: in
	   landscape the first tap on the icon slides it out (data-vol-open) and
	   the icon mutes from then on; in portrait the icon opens a popover
	   (.lastfm-vol-pop) with a mute button and a bigger slider. See
	   onVolumeButtonClick. */
	.lastfm-volume {
		display: flex;
		align-items: center;
	}

	.lastfm-player[data-volume="unsupported"] .lastfm-volume {
		display: none;
	}

	.lastfm-vol-btn {
		display: inline-grid;
		place-items: center;
		padding: 0;
		border: none;
		background: none;
		cursor: pointer;
		color: var(--subtext1);
		transition: color 0.15s ease;
	}

	.lastfm-vol-btn:hover {
		color: var(--supertext);
	}

	.lastfm-vol-btn .material-symbols {
		font-size: 1.15rem;
	}

	.lastfm-vol-range {
		-webkit-appearance: none;
		appearance: none;
		height: 1.25rem;
		margin: 0;
		background: transparent;
		cursor: pointer;
	}

	/* the inline one, next to the icon */
	.lastfm-volume > .lastfm-vol-range {
		width: 0;
		opacity: 0;
		transition:
			width 0.2s ease,
			margin 0.2s ease,
			opacity 0.2s ease;
	}

	@media (hover: hover) {
		.lastfm-volume:hover > .lastfm-vol-range,
		.lastfm-volume:focus-within > .lastfm-vol-range {
			width: 4.5rem;
			margin-left: 0.35rem;
			opacity: 1;
		}
	}

	.lastfm-player[data-vol-open="1"] .lastfm-volume > .lastfm-vol-range {
		width: 4.5rem;
		margin-left: 0.35rem;
		opacity: 1;
	}

	/* Portrait touch popover: in the top layer, so the card can't clip it;
	   onVolumeButtonClick places it above the icon. Hidden unless open
	   (also where popovers aren't supported, which fall back to the
	   landscape behaviour). */
	.lastfm-vol-pop {
		display: none;
		position: fixed;
		inset: auto;
		margin: 0;
		border: none;
		padding: 0.4rem 0.75rem 0.4rem 0.5rem;
		color: inherit;
		background: hsla(var(--crust-hsl), 0.72);
		-webkit-backdrop-filter: blur(14px) saturate(160%);
		backdrop-filter: blur(14px) saturate(160%);
	}

	.lastfm-vol-pop:popover-open {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}

	.lastfm-vol-pop .lastfm-vol-btn .material-symbols {
		font-size: 1.4rem;
	}

	/* bigger, for a finger */
	.lastfm-vol-pop .lastfm-vol-range {
		width: 9rem;
		height: 2rem;
	}

	.lastfm-vol-pop .lastfm-vol-range::-webkit-slider-thumb {
		width: 16px;
		height: 16px;
		margin-top: -6.5px;
	}

	.lastfm-vol-pop .lastfm-vol-range::-moz-range-thumb {
		width: 16px;
		height: 16px;
	}

	.lastfm-vol-range::-webkit-slider-runnable-track {
		height: 3px;
		background: linear-gradient(
			to right,
			var(--accent) calc(var(--vol) * 100%),
			hsla(var(--overlay1-hsl), 0.35) 0
		);
	}

	.lastfm-vol-range::-moz-range-track {
		height: 3px;
		background: linear-gradient(
			to right,
			var(--accent) calc(var(--vol) * 100%),
			hsla(var(--overlay1-hsl), 0.35) 0
		);
	}

	.lastfm-vol-range::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 10px;
		height: 10px;
		margin-top: -3.5px;
		border: none;
		border-radius: 0;
		background: var(--supertext);
	}

	.lastfm-vol-range::-moz-range-thumb {
		width: 10px;
		height: 10px;
		border: none;
		border-radius: 0;
		background: var(--supertext);
	}

	.lastfm-am-link {
		display: inline-grid;
		place-items: center;
		color: var(--subtext2);
		text-decoration: none;
		transition: color 0.15s ease;
	}

	.lastfm-am-link:hover {
		color: var(--supertext);
	}

	/* sizes the wordmark (it's 1em tall); kept above Apple's 12px minimum
	   for their small badge */
	.lastfm-am-link {
		font-size: 0.8rem;
		margin-left: 0.15rem;
	}

	/* The wordmark's lettering sits low in its box, so centring the box
	   put the letters' visual centre ~1.15px below the time's digits
	   (measured from the rendered ink). Lift it so the centres match. On
	   the link, not the <svg>: that comes from AppleMusicWordmark, so it
	   doesn't carry this component's scoped class and rules targeting it
	   here never match. */
	.lastfm-am-link {
		translate: 0 -0.09em;
	}
`;

export default LastFmCard;
