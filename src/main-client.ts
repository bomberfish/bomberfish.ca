import { hydrate } from "dreamland/ssr/client";
import App from "./App";

hydrate(
	App,
	document.querySelector("#app")!,
	document.head,
	document.querySelector("[dlssr-d]")!
);


document.querySelectorAll(".router-link").forEach((el) => {
	el.setAttribute("target", "_self");
});

function atkinson(pixels: number[], w: number): boolean[] {
	const e = Array(2 * w).fill(0);
	const m = [0, 1, w - 2, w - 1, w, 2 * w - 1];
	return pixels.map(x => {
		const pix = x + (e.push(0), e.shift()!);
		const col = pix > 1.99;
		const err = (pix - (col ? 1 : 0)) / 8;
		m.forEach(x => e[x] += err);
		return col;
	});
}
const fadePadding = 167;

const computeDisplayDimensions = () => ({
	displayWidth: Math.max(1, Math.ceil(window.innerWidth)),
	displayHeight: Math.max(1, Math.ceil(window.innerHeight + fadePadding)),
});

const initialDisplay = computeDisplayDimensions();
const width = Math.max(1, Math.ceil(initialDisplay.displayWidth / 2));
const height = Math.max(1, Math.ceil(initialDisplay.displayHeight / 2));

const schemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
type DitherState = {
	width: number;
	height: number;
	displayWidth: number;
	displayHeight: number;
	canvas: HTMLCanvasElement;
	ctx: CanvasRenderingContext2D;
	mask: boolean[];
};

let ditherState: DitherState | null = null;

const parseHsl = (raw: string) => {
	const [h, s, l] = raw.trim().split(',').map(part => parseFloat(part));
	const saturation = s / 100;
	const lightness = l / 100;
	const a = saturation * Math.min(lightness, 1 - lightness);
	const f = (n: number) => {
		const k = (n + h / 30) % 12;
		return Math.round(((lightness) - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)) * 255);
	};
	return [f(0), f(8), f(4)] as const;
};

const repaintBackground = () => {
	if (!ditherState) return;
	const style = getComputedStyle(document.documentElement);
	const light = parseHsl(style.getPropertyValue('--bg-light'));
	const { ctx, canvas, width: w, height: h, mask, displayWidth: dw, displayHeight: dh } = ditherState;
	const imageData = ctx.createImageData(w, h);
	const out = imageData.data;
	const scaleY = dh / h;
	const fadeLengthDisplay = Math.min(fadePadding, dh);
	const fadeLength = Math.max(1, Math.min(h, Math.round(fadeLengthDisplay / Math.max(scaleY, Number.EPSILON))));
	const fadeStartRow = Math.max(0, h - fadeLength);
	const topFadeLength = Math.max(1, Math.round(fadeLength / 4));
	for (let i = 0; i < mask.length; i++) {
		const isOn = mask[i];
		const color = isOn ? light : [0, 0, 0];
		const idx = i * 4;
		out[idx] = color[0];
		out[idx + 1] = color[1];
		out[idx + 2] = color[2];
		const y = Math.floor(i / w);
		const bottomFadeFactor = y < fadeStartRow ? 1 : Math.max(0, 1 - (y - fadeStartRow) / Math.max(1, fadeLength));
		const topFadeFactor = y < topFadeLength ? (y / Math.max(1, topFadeLength)) : 1;
		const fadeFactor = bottomFadeFactor * topFadeFactor;
		const baseAlpha = isOn ? 255 : 0;
		out[idx + 3] = Math.round(baseAlpha * fadeFactor);
	}

	ctx.putImageData(imageData, 0, 0);
	const root = document.documentElement;
	root.style.backgroundImage = `url(${canvas.toDataURL()})`;
	root.style.backgroundSize = `${dw}px ${dh}px`;
	root.style.backgroundRepeat = "no-repeat";
	root.style.backgroundPosition = "top left";
};

const updateDisplaySize = () => {
	if (!ditherState) return;
	const { displayWidth, displayHeight } = computeDisplayDimensions();
	ditherState.displayWidth = displayWidth;
	ditherState.displayHeight = displayHeight;
	repaintBackground();
};

let resizeRaf: number | null = null;
const handleResize = () => {
	if (resizeRaf !== null) {
		cancelAnimationFrame(resizeRaf);
	}
	resizeRaf = requestAnimationFrame(() => {
		resizeRaf = null;
		updateDisplaySize();
	});
};

window.addEventListener('resize', handleResize);

const handleSchemeChange = () => repaintBackground();

if ('addEventListener' in schemeQuery) {
	schemeQuery.addEventListener('change', handleSchemeChange);
} else {
	// @ts-expect-error addListener exists on older browsers
	schemeQuery.addListener(handleSchemeChange);
}

const image = new Image();
image.crossOrigin = "Anonymous";
image.src = `https://picsum.photos/${width}/${height}`;
image.onload = () => {
	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d')!;
	canvas.width = width;
	canvas.height = height;

	ctx.drawImage(image, 0, 0, width, height);
	const imageData = ctx.getImageData(0, 0, width, height);
	const data = imageData.data;

	const grayscale: number[] = [];
	for (let i = 0; i < data.length; i += 4) {
		grayscale.push((data[i] + data[i + 1] + data[i + 2]) / 765);
	}

	const { displayWidth, displayHeight } = computeDisplayDimensions();
	const mask = atkinson(grayscale, width);
	ditherState = { width, height, displayWidth, displayHeight, canvas, ctx, mask };
	repaintBackground();
};

// document.querySelector("#app")!.replaceWith(App());
