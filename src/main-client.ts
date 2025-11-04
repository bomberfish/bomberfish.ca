console.log("hiiii :3");
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
		const col = pix > 1.5;
		const err = (pix - (col ? 1 : 0)) / 8;
		m.forEach(x => e[x] += err);
		return col;
	});
}
const width = Math.floor(window.innerWidth / 4);
const height = Math.floor(window.innerHeight / 4);

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
	
	// Convert to grayscale
	const grayscale = [];
	for (let i = 0; i < data.length; i += 4) {
		grayscale.push((data[i] + data[i + 1] + data[i + 2]) / 765);
	}
	
	// Apply dithering
	const dithered = atkinson(grayscale, width);
	
	// Get colors from CSS
	const style = getComputedStyle(document.documentElement);
	const parseHsl = (hsl: string) => {
		const [h, s, l] = hsl.split(',').map(parseFloat);
		const a = s / 100 * Math.min(l / 100, 1 - l / 100);
		const f = (n: number) => {
			const k = (n + h / 30) % 12;
			return Math.round(((l / 100) - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)) * 255);
		};
		return [f(0), f(8), f(4)];
	};
	
	const dark = parseHsl(style.getPropertyValue('--base-hsl'));
	const light = parseHsl(style.getPropertyValue('--surface0-hsl'));
	
	// Apply colors
	for (let i = 0; i < dithered.length; i++) {
		const [r, g, b] = dithered[i] ? light : dark;
		data[i * 4] = r;
		data[i * 4 + 1] = g;
		data[i * 4 + 2] = b;
	}
	
	ctx.putImageData(imageData, 0, 0);
	document.documentElement.style.background = `url(${canvas.toDataURL()})`;
	document.documentElement.style.backgroundSize = "cover";
};

// document.querySelector("#app")!.replaceWith(App());
