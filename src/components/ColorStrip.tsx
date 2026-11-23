import { FC } from "dreamland/core";

// Windows 8's colour picker, from the "Personalize" page of its setup: a
// strip of colours with no gaps between them, each one a cell in the
// colour's shade with a square of the colour itself in its top corner, and
// a pair of arrowheads, one above and one below, pointing at the cell
// that's chosen.
//
// It's as much a slider as a row of buttons, and works as one: press and
// drag along it, and the choice follows. To the keyboard and a screen reader
// it's a group of radio buttons (the arrow keys move along it, Home and End
// go to the ends).
// Styles: "Colour strip" in src/style.css.
//
// The strip someone lands on is the server's, hydrated, and attributes on
// hydrated nodes don't follow state: so what's chosen is put there by hand
// (placeStrip, below, which is also how to move it from outside), and so is
// a cell's colour if it changes (paintStrip).

export interface StripColor {
	name: string;
	/** Any CSS colour. The cell's shade is worked out from it in the CSS. */
	color: string;
	/**
	 * A glyph of the icon font to show on the cell's square, for one that
	 * isn't a colour like the rest (the one you make yourself: "Edit").
	 */
	icon?: string;
}

const cells = (strip: Element) =>
	Array.from(strip.querySelectorAll<HTMLElement>("[role=radio]"));

/** Mark `name` as the one chosen: the arrowheads go to it, and its name shows. */
export function placeStrip(
	strip: HTMLElement | null | undefined,
	name: string
) {
	if (!strip) return;
	const all = cells(strip);
	const at = Math.max(
		0,
		all.findIndex((cell) => cell.dataset.name === name)
	);
	all.forEach((cell, i) => {
		cell.setAttribute("aria-checked", i === at ? "true" : "false");
		cell.tabIndex = i === at ? 0 : -1;
	});
	strip.style.setProperty("--at", `${at}`);
	const caption = strip.querySelector(".m-colorstrip-name");
	if (caption) caption.textContent = all[at]?.dataset.name ?? "";
}

/** Give the cell called `name` another colour. */
export function paintStrip(
	strip: HTMLElement | null | undefined,
	name: string,
	color: string
) {
	strip
		?.querySelector<HTMLElement>(`[role=radio][data-name="${name}"]`)
		?.style.setProperty("--c", color);
}

function ColorStrip(
	this: FC<{
		label: string;
		colors: StripColor[];
		selected: string;
		onpick?: (name: string) => void;
	}>
) {
	const choose = (cell: HTMLElement | undefined, focus = false) => {
		if (!cell) return;
		if (focus) cell.focus();
		if (cell.getAttribute("aria-checked") === "true") return;
		placeStrip(this.root as HTMLElement, cell.dataset.name!);
		this.onpick?.(cell.dataset.name!);
	};
	// the cell under a pointer: by where along the strip it is, so a drag
	// that strays above or below still counts
	const under = (e: PointerEvent) => {
		const row = e.currentTarget as HTMLElement;
		const all = cells(row);
		const box = row.getBoundingClientRect();
		const along = (e.clientX - box.left) / (box.width || 1);
		return all[
			Math.min(all.length - 1, Math.max(0, Math.floor(along * all.length)))
		];
	};
	let dragging = false;

	const selected = Math.max(
		0,
		this.colors.findIndex((c) => c.name === this.selected)
	);
	return (
		<div
			class="m-colorstrip"
			style={`--n: ${this.colors.length}; --at: ${selected}`}
		>
			<span class="m-colorstrip-mark" aria-hidden="true" />
			<div
				class="m-colorstrip-cells"
				role="radiogroup"
				aria-label={this.label}
				on:pointerdown={(e: PointerEvent) => {
					if (e.pointerType === "mouse" && e.button !== 0) return;
					dragging = true;
					try {
						(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
					} catch {
						// (no such pointer to capture: the drag still works over the strip)
					}
					choose(under(e), true);
				}}
				on:pointermove={(e: PointerEvent) => {
					if (dragging) choose(under(e));
				}}
				on:pointerup={() => (dragging = false)}
				on:pointercancel={() => (dragging = false)}
				on:click={(e: MouseEvent) => {
					// (a click that didn't come from a pointer: Enter or the
					// space bar on a cell, or a screen reader's)
					choose(
						(e.target as Element).closest<HTMLElement>("[role=radio]") ??
							undefined
					);
				}}
				on:keydown={(e: KeyboardEvent) => {
					const all = cells(e.currentTarget as HTMLElement);
					const at = all.findIndex(
						(cell) => cell.getAttribute("aria-checked") === "true"
					);
					const to =
						e.key === "ArrowRight" || e.key === "ArrowDown"
							? at + 1
							: e.key === "ArrowLeft" || e.key === "ArrowUp"
								? at - 1
								: e.key === "Home"
									? 0
									: e.key === "End"
										? all.length - 1
										: -1;
					if (to < 0 || to >= all.length || to === at) return;
					e.preventDefault();
					choose(all[to], true);
				}}
			>
				{this.colors.map((c, i) => (
					<button
						type="button"
						role="radio"
						aria-checked={i === selected ? "true" : "false"}
						aria-label={c.name}
						title={c.name}
						data-name={c.name}
						tabindex={i === selected ? "0" : "-1"}
						style={`--c: ${c.color}`}
					>
						{c.icon ? (
							<span
								class="material-symbols m-colorstrip-icon"
								aria-hidden="true"
							>
								{c.icon}
							</span>
						) : (
							false
						)}
					</button>
				))}
			</div>
			<span class="m-colorstrip-mark" aria-hidden="true" />
			<output class="m-colorstrip-name">{this.colors[selected]?.name}</output>
		</div>
	);
}

export default ColorStrip;
