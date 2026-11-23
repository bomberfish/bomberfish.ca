import { FC } from "dreamland/core";
import { classes, rest, transparent } from "./props";

// A Metro toggle switch: the phone's, a wide outlined slot that fills with
// the accent when it's on, and a block that slides to the end it's at.
// Beside it, which it is in words (`on` / `off`: "On" and "Off" if you
// don't say). There's a real checkbox under it (a switch, to a screen
// reader, called `label`), so the keys and touch are the browser's own.
// Styles: "Toggle switch" in metro.css.
//
// Like the slider, a hydrated one doesn't follow state: to move it from
// outside, set its input's `checked` (placeToggle).
export function Toggle(
	this: FC<
		{
			label: string;
			checked?: boolean;
			on?: string;
			off?: string;
			onchange?: (checked: boolean) => void;
			class?: string;
		} & Record<string, unknown>
	>
) {
	transparent(this);
	return (
		<label
			class={classes("m-toggle", this.class)}
			{...rest(this, ["label", "checked", "on", "off", "onchange"])}
		>
			<input
				type="checkbox"
				role="switch"
				aria-label={this.label}
				checked={this.checked ? true : undefined}
				on:change={(e: Event) =>
					this.onchange?.((e.currentTarget as HTMLInputElement).checked)
				}
			/>
			<span class="m-toggle-track" aria-hidden="true">
				<span class="m-toggle-thumb" />
			</span>
			<span class="m-toggle-state" aria-hidden="true">
				<span>{this.off ?? "Off"}</span>
				<span>{this.on ?? "On"}</span>
			</span>
		</label>
	);
}

/** Put a toggle (its <label>, or anything it's in) at on or off. */
export function placeToggle(
	toggle: Element | null | undefined,
	checked: boolean
) {
	const input = toggle?.matches("input")
		? (toggle as HTMLInputElement)
		: toggle?.querySelector<HTMLInputElement>("input[role=switch]");
	if (input) input.checked = checked;
}

export default Toggle;
