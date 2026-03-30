// @ts-nocheck
import { FC, css } from "dreamland/core";

const TARGET_BY_DIST = [0.7, 0.5, 0.35, 0.2, 0.1, 0.05];
const MAX_DIST = TARGET_BY_DIST.length - 1;
const LERP = 6; // per second

// Ripple settings (for clicks)
const RIPPLE_SPEED = 8; // cells per second
const RIPPLE_MAX_RADIUS = 32;
const RIPPLE_WIDTH = 3;
const RIPPLE_BRIGHTNESS = 0.6;

// Wake settings (for dragging)
const WAKE_FADE = 3; // per second
const WAKE_BRIGHTNESS = 0.6;
const WAKE_LENGTH = 2; // Length along movement direction
const WAKE_WIDTH = 4; // Width perpendicular to movement

// Side ripple settings (small waves that spawn from wake trail)
const WAKE_RIPPLE_OFFSET = 2.5; // How far out perpendicular the side ripples spawn
const WAKE_RIPPLE_INTERVAL = 3; // Spawn side ripples every N wake points
const WAKE_RIPPLE_MAX_RADIUS = 10; // Smaller than click ripples
const WAKE_RIPPLE_SPEED = 6.25; // cells per second
const WAKE_RIPPLE_BRIGHTNESS = 0.1; // Dimmer than click ripples

interface Ripple {
	x: number;
	y: number;
	r: number;
	maxRadius?: number; // Defaults to RIPPLE_MAX_RADIUS
	speed?: number; // Defaults to RIPPLE_SPEED
	brightness?: number; // Defaults to RIPPLE_BRIGHTNESS
}

interface WakePoint {
	x: number;
	y: number;
	dx: number; // Direction of movement
	dy: number;
	intensity: number;
}

function InteractiveGrid(this: FC) {
	// Skip on SSR
	if (import.meta.env.SSR) {
		return <div class="interactive-grid"></div>;
	}

	// Read grid size from CSS variable (default 30px)
	const getGridSize = () => {
		const value = getComputedStyle(document.documentElement)
			.getPropertyValue("--grid-size")
			.trim();
		return parseInt(value, 10) || 30;
	};

	let squareSize = getGridSize();
	let columns = 0;
	let rows = 0;
	let cells: HTMLDivElement[][] = [];
	let cur: Float32Array[] = [];
	let tgt: Float32Array[] = [];
	let ripples: Ripple[] = [];
	let wake: WakePoint[] = [];

	let activeX = -1;
	let activeY = -1;
	let isHovered = false;
	let rafId: number | null = null;
	let lastTime = 0;

	const reduceMotionQuery = window.matchMedia(
		"(prefers-reduced-motion: reduce)"
	);
	const isDarkMode = window.matchMedia("(prefers-color-scheme: dark)");

	const getGridColor = () => {
		// Use the site's color scheme - subtle grid lines
		const hue = isDarkMode.matches ? 192 : 185;
		const lightness = isDarkMode.matches ? 20 : 70;
		return { hue, lightness };
	};

	const buildGrid = () => {
		const container = this.root as HTMLDivElement;
		if (!container) return;

		// Re-read grid size in case it changed
		squareSize = getGridSize();

		// Use the larger of viewport or document dimensions to cover everything
		const viewportWidth = window.innerWidth;
		const viewportHeight = window.innerHeight;
		const docWidth = document.documentElement.scrollWidth;
		const docHeight = document.documentElement.scrollHeight;

		const width = Math.max(viewportWidth, docWidth);
		const height = Math.max(viewportHeight, docHeight);

		columns = Math.ceil(width / squareSize) + 1;
		rows = Math.ceil(height / squareSize) + 1;

		container.innerHTML = "";
		cells = [];
		cur = [];
		tgt = [];

		const fragment = document.createDocumentFragment();

		for (let r = 0; r < rows; r++) {
			const rowEl = document.createElement("div");
			rowEl.style.cssText = "display:flex;flex-shrink:0;";
			cells[r] = [];
			cur[r] = new Float32Array(columns);
			tgt[r] = new Float32Array(columns);

			for (let c = 0; c < columns; c++) {
				const cell = document.createElement("div");
				cell.style.cssText = `width:${squareSize}px;height:${squareSize}px;flex-shrink:0;border-right:1px solid hsl(var(--bg-light));border-bottom:1px solid hsl(var(--bg-light));`;
				rowEl.appendChild(cell);
				cells[r][c] = cell;
			}
			fragment.appendChild(rowEl);
		}
		container.appendChild(fragment);
	};

	const updateTargets = () => {
		for (let r = 0; r < rows; r++) tgt[r].fill(0);
		if (!isHovered || activeX < 0) return;

		for (let dr = -MAX_DIST; dr <= MAX_DIST; dr++) {
			for (let dc = -MAX_DIST; dc <= MAX_DIST; dc++) {
				const r = activeY + dr;
				const c = activeX + dc;
				if (r >= 0 && r < rows && c >= 0 && c < columns) {
					const d = Math.abs(dr) + Math.abs(dc);
					if (d <= MAX_DIST) tgt[r][c] = TARGET_BY_DIST[d];
				}
			}
		}
	};

	const tick = (time: number) => {
		if (reduceMotionQuery.matches) {
			rafId = null;
			return;
		}

		// Calculate delta time in seconds (cap at 100ms to avoid jumps)
		const dt = Math.min((time - lastTime) / 1000, 0.1);
		lastTime = time;

		// Update ripples (each can have its own speed)
		ripples.forEach((rip) => (rip.r += (rip.speed ?? RIPPLE_SPEED) * dt));
		ripples = ripples.filter(
			(rip) => rip.r < (rip.maxRadius ?? RIPPLE_MAX_RADIUS)
		);

		// Update wake - fade out and remove dead points
		wake.forEach((w) => (w.intensity -= WAKE_FADE * dt));
		wake = wake.filter((w) => w.intensity > 0.01);

		let anyMoving = ripples.length > 0 || wake.length > 0;
		const { hue, lightness } = getGridColor();

		for (let r = 0; r < rows; r++) {
			for (let c = 0; c < columns; c++) {
				let v = cur[r][c];
				const t = tgt[r][c];

				// Calculate ripple influence with smooth interference
				let rippleIntensity = 0;
				let waveCount = 0;

				for (const rip of ripples) {
					const dist = Math.sqrt((r - rip.y) ** 2 + (c - rip.x) ** 2);
					const diff = Math.abs(dist - rip.r);
					const maxR = rip.maxRadius ?? RIPPLE_MAX_RADIUS;
					const brightness = rip.brightness ?? RIPPLE_BRIGHTNESS;

					if (diff < RIPPLE_WIDTH) {
						// Steeper falloff using quadratic decay
						const fade = Math.pow(1 - rip.r / maxR, 2);
						// Smooth bell curve falloff
						const strength = (1 - diff / RIPPLE_WIDTH) * fade;
						rippleIntensity += strength * brightness;
						waveCount++;
					}
				}

				// Calculate wake influence (trail from dragging)
				// Wake is elongated perpendicular to movement direction
				let wakeIntensity = 0;
				for (const w of wake) {
					const relX = c - w.x;
					const relY = r - w.y;

					// Project onto movement direction and perpendicular
					const alongDir = relX * w.dx + relY * w.dy;
					const perpDir = relX * -w.dy + relY * w.dx;

					// Elliptical falloff: shorter along movement, wider perpendicular
					const normalizedDist = Math.sqrt(
						(alongDir / WAKE_LENGTH) ** 2 + (perpDir / WAKE_WIDTH) ** 2
					);

					if (normalizedDist < 1) {
						const strength = (1 - normalizedDist) * w.intensity;
						wakeIntensity = Math.max(wakeIntensity, strength * WAKE_BRIGHTNESS);
					}
				}

				// Boost intensity where multiple ripples interact
				if (waveCount > 1) {
					rippleIntensity *= 1 + (waveCount - 1) * 0.5;
				}

				const delta = t - v;
				if (Math.abs(delta) > 0.0004) {
					v += delta * LERP * dt;
					cur[r][c] = v;
					anyMoving = true;
				} else {
					v = t;
					cur[r][c] = t;
				}

				const finalOpacity = Math.min(v + rippleIntensity + wakeIntensity, 1);
				const cell = cells[r]?.[c];
				if (cell) {
					if (finalOpacity < 0.001) {
						cell.style.backgroundColor = "";
					} else {
						// Use theme-aware colors with more prominent highlighting
						const sat = isDarkMode.matches ? 35 : 40;
						const lit = isDarkMode.matches
							? lightness + finalOpacity * 40
							: lightness - finalOpacity * 45;
						cell.style.backgroundColor = `hsla(${hue}, ${sat}%, ${lit}%, ${(finalOpacity * 1.2).toFixed(4)})`;
					}
				}
			}
		}

		if (anyMoving || isHovered) {
			rafId = requestAnimationFrame(tick);
		} else {
			rafId = null;
		}
	};

	const startTick = () => {
		if (!rafId && !reduceMotionQuery.matches) {
			lastTime = performance.now();
			rafId = requestAnimationFrame(tick);
		}
	};

	const getGridCoords = (e: MouseEvent | PointerEvent) => {
		const x = Math.floor(e.clientX / squareSize);
		const y = Math.floor(e.clientY / squareSize);
		return { x, y };
	};

	let isPointerDown = false;
	let lastWakeX = -1;
	let lastWakeY = -1;
	let wakePointCount = 0; // Counter to spawn side ripples at intervals

	const onPointerMove = (e: PointerEvent) => {
		isHovered = true;
		const coords = getGridCoords(e);
		if (coords.x !== activeX || coords.y !== activeY) {
			// Create wake trail while dragging (like a stick through water)
			if (isPointerDown && lastWakeX >= 0 && lastWakeY >= 0) {
				// Calculate movement direction
				let dx = coords.x - lastWakeX;
				let dy = coords.y - lastWakeY;
				const len = Math.sqrt(dx * dx + dy * dy);
				if (len > 0) {
					dx /= len;
					dy /= len;
				} else {
					dx = 1;
					dy = 0;
				}
				wake.push({ x: coords.x, y: coords.y, dx, dy, intensity: 1 });
				wakePointCount++;

				// Spawn side ripples perpendicular to movement at intervals
				if (wakePointCount % WAKE_RIPPLE_INTERVAL === 0) {
					// Perpendicular direction (rotate 90 degrees)
					const perpX = -dy;
					const perpY = dx;

					// Spawn ripple on both sides of the wake
					ripples.push({
						x: coords.x + perpX * WAKE_RIPPLE_OFFSET,
						y: coords.y + perpY * WAKE_RIPPLE_OFFSET,
						r: 0,
						maxRadius: WAKE_RIPPLE_MAX_RADIUS,
						speed: WAKE_RIPPLE_SPEED,
						brightness: WAKE_RIPPLE_BRIGHTNESS,
					});
					ripples.push({
						x: coords.x - perpX * WAKE_RIPPLE_OFFSET,
						y: coords.y - perpY * WAKE_RIPPLE_OFFSET,
						r: 0,
						maxRadius: WAKE_RIPPLE_MAX_RADIUS,
						speed: WAKE_RIPPLE_SPEED,
						brightness: WAKE_RIPPLE_BRIGHTNESS,
					});
				}

				lastWakeX = coords.x;
				lastWakeY = coords.y;
			}

			activeX = coords.x;
			activeY = coords.y;
			updateTargets();
			startTick();
		}
	};

	const onPointerDown = (e: PointerEvent) => {
		isPointerDown = true;
		const coords = getGridCoords(e);
		lastWakeX = coords.x;
		lastWakeY = coords.y;
		startTick();
	};

	const onPointerUp = (e: PointerEvent) => {
		// Create a ripple on release (like lifting a stick from water)
		if (isPointerDown) {
			const coords = getGridCoords(e);
			ripples.push({ x: coords.x, y: coords.y, r: 0 });
			startTick();
		}
		isPointerDown = false;
		lastWakeX = -1;
		lastWakeY = -1;
		wakePointCount = 0;
	};

	const onPointerLeave = () => {
		isHovered = false;
		isPointerDown = false;
		activeX = -1;
		activeY = -1;
		lastWakeX = -1;
		lastWakeY = -1;
		wakePointCount = 0;
		updateTargets();
		startTick();
	};

	let resizeTimer: ReturnType<typeof setTimeout>;
	const onResize = () => {
		clearTimeout(resizeTimer);
		resizeTimer = setTimeout(buildGrid, 150);
	};

	// Check if we should disable the effect (mobile/touch devices)
	const isMobile = () => {
		return window.matchMedia("(max-width: 768px), (pointer: coarse)").matches;
	};

	this.cx.mount = () => {
		// Skip initialization on mobile - CSS fallback grid will be used
		if (isMobile() || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

		buildGrid();
		document.body.classList.add("grid-loaded");

		document.addEventListener("pointermove", onPointerMove, { passive: true });
		document.addEventListener("pointerdown", onPointerDown, { passive: true });
		document.addEventListener("pointerup", onPointerUp);
		document.addEventListener("pointerleave", onPointerLeave);
		window.addEventListener("resize", onResize);
		isDarkMode.addEventListener("change", () => startTick());
	};

	return <div class="interactive-grid"></div>;
}

InteractiveGrid.style = css`
	:scope {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		pointer-events: none;
		z-index: 0;
	}

	@media (prefers-reduced-motion: reduce) {
		:scope {
			display: none;
		}
	}

	@media (max-width: 768px), (pointer: coarse) {
		:scope {
			display: none;
		}
	}
`;

export default InteractiveGrid;
