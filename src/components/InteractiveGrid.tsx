// @ts-nocheck
import { FC, css } from "dreamland/core";

const LERP = 6; // per second

// Hover settings
const HOVER_BRIGHTNESS = 0.5;
const HOVER_RADIUS = 2;
const HOVER_FALLOFF = 2;

// Ripple settings (for clicks)
const RIPPLE_SPEED = 10; // cells per second
const RIPPLE_MAX_RADIUS = 10;
const RIPPLE_WIDTH = 3;
const RIPPLE_BRIGHTNESS = 0.25;

// Wake settings (for dragging)
const WAKE_FADE = 3; // per second
const WAKE_BRIGHTNESS = 0.3;
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
		const hue = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--main-hue")) - 10;
		const lightness = isDarkMode.matches ? 10 : 90;
		return { hue, lightness };
	};

	const buildGrid = () => {
		const container = this.root as HTMLDivElement;
		if (!container) return;

		// Re-read grid size in case it changed
		squareSize = getGridSize();

		// Build grid sized to the viewport only — the grid is anchored to the
		// top of the page and only displays for the first 100vh.
		const width = window.innerWidth;
		const height = window.innerHeight;

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

		for (let dr = -HOVER_RADIUS; dr <= HOVER_RADIUS; dr++) {
			for (let dc = -HOVER_RADIUS; dc <= HOVER_RADIUS; dc++) {
				const r = activeY + dr;
				const c = activeX + dc;
				if (r >= 0 && r < rows && c >= 0 && c < columns) {
					const d = Math.abs(dr) + Math.abs(dc);
					if (d <= HOVER_RADIUS) {
						const progress = d / (HOVER_RADIUS + 1);
						const intensity = 0.7 * Math.pow(1 - progress, HOVER_FALLOFF);
						tgt[r][c] = intensity * HOVER_BRIGHTNESS;
					}
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
						const sat = isDarkMode.matches ? 35 : 60;
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
		// Compute coordinates relative to the grid element rather than the
		// viewport. The grid lives inside a containing block created by an
		// ancestor (body has `perspective`, which makes any descendant
		// containing-block for fixed/absolute positioning), so the element's
		// own top-left is the correct origin for cell math.
		const container = this.root as HTMLDivElement | null;
		if (!container) return { x: -1, y: -1, inside: false };
		const rect = container.getBoundingClientRect();
		const localX = e.clientX - rect.left;
		const localY = e.clientY - rect.top;
		const inside =
			localX >= 0 &&
			localY >= 0 &&
			localX <= rect.width &&
			localY <= rect.height;
		return {
			x: Math.floor(localX / squareSize),
			y: Math.floor(localY / squareSize),
			inside,
		};
	};

	let isPointerDown = false;
	let lastWakeX = -1;
	let lastWakeY = -1;
	let wakePointCount = 0; // Counter to spawn side ripples at intervals

	const onPointerMove = (e: PointerEvent) => {
		const coords = getGridCoords(e);
		// If the pointer left the grid area (e.g., scrolled past 100vh),
		// behave the same as a pointerleave so trailing effects don't linger.
		if (!coords.inside) {
			if (isHovered || isPointerDown) onPointerLeave();
			return;
		}
		isHovered = true;
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
		if (e.target.tagName.toLowerCase() === "a") return;
		const coords = getGridCoords(e);
		if (!coords.inside) return;
		isPointerDown = true;
		lastWakeX = coords.x;
		lastWakeY = coords.y;
		startTick();
	};

	const onPointerUp = (e: PointerEvent) => {
		// Create a ripple on release (like lifting a stick from water)
		if (isPointerDown) {
			const coords = getGridCoords(e);
			if (coords.inside) {
				ripples.push({ x: coords.x, y: coords.y, r: 0 });
				startTick();
			}
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
		updateScrollFade();
	};

	let scrollRafId: number | null = null;
	const updateScrollFade = () => {
		scrollRafId = null;
		const container = this.root as HTMLDivElement | null;
		if (!container) return;
		const vh = window.innerHeight || 1;
		// Linearly fade from 1 → 0 as scrollY goes from 0 → vh.
		const fade = Math.max(0, 1 - window.scrollY / vh);
		container.style.setProperty("--grid-scroll-fade", fade.toFixed(3));
		// Stop running the animation loop entirely once invisible — saves
		// CPU when the user has scrolled past the grid.
		if (fade === 0 && rafId !== null) {
			cancelAnimationFrame(rafId);
			rafId = null;
		}
	};

	const onScroll = () => {
		if (scrollRafId !== null) return;
		scrollRafId = requestAnimationFrame(updateScrollFade);
	};

	// Check if we should disable the effect (mobile/touch devices)
	const isMobile = () => {
		return window.matchMedia("(max-width: 768px), (pointer: coarse)").matches;
	};

	this.cx.mount = () => {
		// Skip initialization on mobile - CSS fallback grid will be used
		if (isMobile() || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

		buildGrid();
		updateScrollFade();
		document.body.classList.add("grid-loaded");

		document.addEventListener("pointermove", onPointerMove, { passive: true });
		document.addEventListener("pointerdown", onPointerDown, { passive: true });
		document.addEventListener("pointerup", onPointerUp);
		document.addEventListener("pointerleave", onPointerLeave);
		window.addEventListener("resize", onResize);
		window.addEventListener("scroll", onScroll, { passive: true });
		isDarkMode.addEventListener("change", () => startTick());
	};

	return <div class="interactive-grid"></div>;
}

InteractiveGrid.style = css`
	:scope {
		position: absolute;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		pointer-events: none;
		z-index: 0;
		/* Fade out the bottom ~25% so the grid doesn't end in a hard line. */
		-webkit-mask-image: linear-gradient(
			to bottom,
			#000 0%,
			#000 70%,
			transparent 100%
		);
		mask-image: linear-gradient(
			to bottom,
			#000 0%,
			#000 70%,
			transparent 100%
		);
		/* Fade the whole element out as the user scrolls past the first
		   viewport. --grid-scroll-fade is driven from JS on scroll/resize. */
		opacity: var(--grid-scroll-fade, 1);
		transition: opacity 0.15s linear;
		will-change: opacity;
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
