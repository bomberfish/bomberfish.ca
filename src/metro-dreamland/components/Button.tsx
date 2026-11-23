import { ComponentChild, FC } from "dreamland/core";
import Link from "./Link";
import { classes, rest, transparent } from "./props";

// Buttons (metro.css: "Square buttons", "Round buttons").
//
// <Button>: the phone's push button, outlined and lowercase. <RingButton>:
// the app bar's, a glyph in a ring (`arrow`: the back/forward arrow that
// comes with its ring as one glyph of the icon font). Either is a <Link>
// with `to`, a plain <a> with `href`, and a <button> otherwise; both lean
// when pressed.

type Props = {
	to?: string;
	href?: string;
	class?: string;
	children?: ComponentChild;
} & Record<string, unknown>;

function button(
	self: Props & Parameters<typeof transparent>[0],
	cls: string,
	own: string[] = []
) {
	const attrs: Record<string, unknown> = {
		...rest(self, ["to", "href", ...own]),
		class: classes(cls, self.class),
		"data-m-tilt": true,
	};
	if (self.to != null)
		return (
			<Link href={self.to} {...attrs}>
				{self.children}
			</Link>
		);
	transparent(self);
	if (self.href != null)
		return (
			<a href={self.href} {...attrs}>
				{self.children}
			</a>
		);
	return (
		<button type="button" {...attrs}>
			{self.children}
		</button>
	);
}

export function Button(this: FC<Props>) {
	return button(this, "m-button");
}

export function RingButton(this: FC<Props & { arrow?: boolean }>) {
	return button(this, classes("ring", this.arrow && "m-ring-arrow"), ["arrow"]);
}

export default Button;
