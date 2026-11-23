import { FC } from "dreamland/core";

// A Metro slider: Windows 8's, a thick flat bar with a plain block for a
// thumb, under a small-caps label and the value in light type. There's a
// real <input type="range"> under it, so the keys, touch and screen readers
// are the browser's own.
//
// It comes in three sizes (`size`: small for a control among others, like a
// volume; large for the one thing on the screen; medium if you don't say),
// and `bare` leaves just the bar: no label or value showing, though the
// label is still what a screen reader calls it.
//
// The bar is filled as far as the thumb in the accent (in the tile's ink, on
// a coloured tile), unless `--track` is set on the input: a gradient to show
// there instead (what moving along the bar gives, for a slider that's
// choosing a colour).
// Styles: "Sliders" in metro.css.
//
// It keeps its own bar and readout in step by hand (placeSlider, below, which
// is also how to move it from outside): the sliders someone lands on are the
// server's, hydrated, and attributes on hydrated nodes don't follow state.
function Slider(
	this: FC<{
		name: string;
		label: string;
		min: number;
		max: number;
		value: number;
		unit?: string;
		size?: "small" | "medium" | "large";
		bare?: boolean;
		oninput?: (value: number) => void;
	}>
) {
	const unit = this.unit ?? "";
	const fill = ((this.value - this.min) / (this.max - this.min || 1)) * 100;
	const classes = ["m-slider"];
	if (this.size && this.size !== "medium")
		classes.push(`m-slider-${this.size}`);
	if (this.bare) classes.push("m-slider-bare");
	return (
		<label class={classes.join(" ")}>
			<span class="m-slider-label">{this.label}</span>
			{this.bare ? (
				false
			) : (
				<output class="m-slider-value">{`${this.value}${unit}`}</output>
			)}
			<input
				type="range"
				name={this.name}
				min={`${this.min}`}
				max={`${this.max}`}
				step="1"
				value={`${this.value}`}
				data-unit={unit}
				style={`--fill: ${fill.toFixed(2)}%`}
				on:input={(e: Event) => {
					const input = e.currentTarget as HTMLInputElement;
					placeSlider(input);
					this.oninput?.(+input.value);
				}}
			/>
		</label>
	);
}

/**
 * Put a slider's bar and readout where its value is; given a value, move it
 * there first. (The input of a <Slider>.)
 */
export function placeSlider(input: HTMLInputElement, value?: number) {
	if (value !== undefined) input.value = `${value}`;
	const min = +input.min;
	const max = +input.max;
	const at = ((+input.value - min) / (max - min || 1)) * 100;
	input.style.setProperty("--fill", `${at.toFixed(2)}%`);
	const readout = input.parentElement?.querySelector("output");
	if (readout)
		readout.textContent = `${input.value}${input.dataset.unit ?? ""}`;
}

export default Slider;
