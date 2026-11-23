import { EASE_OUT, EASE_SPRING, still } from "./core";

// ---------------------------------------------------------------------------
// Tilt
// ---------------------------------------------------------------------------

// Press something and it leans away from the point you pressed, as if it
// were a physical key hinged in the middle; press its centre and it just
// sinks. The lean is sized so the pressed edge always travels about the
// same distance, whatever the size of the thing: small tiles tip a lot,
// wide ones barely.
export const TILT_TRAVEL = 15; // px the pressed edge goes down
export const TILT_MAX = 13; // degrees
export const TILT_SINK = 14; // px, for a dead-centre press

export let pressed: { el: HTMLElement; anim: Animation | null } | null = null;

export const flat =
	"perspective(900px) rotateX(0deg) rotateY(0deg) translateZ(0)";

export function lean(el: HTMLElement, x: number, y: number) {
	const r = el.getBoundingClientRect();
	if (!r.width || !r.height) return flat;
	const nx = Math.max(-1, Math.min(1, ((x - r.left) / r.width - 0.5) * 2));
	const ny = Math.max(-1, Math.min(1, ((y - r.top) / r.height - 0.5) * 2));
	const deg = (half: number) =>
		Math.min(TILT_MAX, (Math.atan(TILT_TRAVEL / half) * 180) / Math.PI);
	const ry = nx * deg(r.width / 2);
	const rx = -ny * deg(r.height / 2);
	const sink = (1 - Math.max(Math.abs(nx), Math.abs(ny))) * TILT_SINK + 2;
	return (
		`perspective(900px) rotateX(${rx.toFixed(2)}deg) ` +
		`rotateY(${ry.toFixed(2)}deg) translateZ(${-sink.toFixed(1)}px)`
	);
}

export function press(el: HTMLElement, x: number, y: number) {
	unpress();
	if (still() || typeof el.animate !== "function") return;
	const anim = el.animate(
		[{ transform: flat }, { transform: lean(el, x, y) }],
		{
			duration: 90,
			easing: EASE_OUT,
			fill: "forwards",
		}
	);
	pressed = { el, anim };
}

export function unpress() {
	if (!pressed) return;
	const { el, anim } = pressed;
	pressed = null;
	if (!anim) return;
	const from = getComputedStyle(el).transform;
	anim.cancel();
	if (!el.isConnected || from === "none") return;
	el.animate([{ transform: from }, { transform: "none" }], {
		duration: 260,
		easing: EASE_SPRING,
	});
}

export function pressTarget(e: Event): HTMLElement | null {
	const hit = e.target as Element | null;
	const el = hit?.closest?.<HTMLElement>("[data-m-tilt]");
	if (!el) return null;
	// a control inside a tile (the player on the last.fm tile, a link in a
	// post) is its own thing: pressing it doesn't push the tile
	const inner = hit!.closest(
		"a, button, input, select, textarea, audio, video, [role=slider], [tabindex]"
	);
	return inner && inner !== el && el.contains(inner) ? null : el;
}

/** What's being pressed right now, if anything is. */
export const pressedEl = () => pressed?.el ?? null;
