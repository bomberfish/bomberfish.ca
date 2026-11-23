import { type ComponentChild, jsx } from "dreamland/core";

// What the components here have in common: they take whatever attributes
// they're given besides their own and pass them on to the element they
// draw (an id, an aria-label, a data-m-keep, an on:click), and a `class`
// that's added to theirs.

/** Everything on a component that isn't one of its own props (`own`). */
export function rest(self: object, own: readonly string[] = []) {
	const out: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(self)) {
		if (
			key === "cx" ||
			key === "root" ||
			key === "children" ||
			key === "class" ||
			own.includes(key)
		)
			continue;
		out[key] = value;
	}
	return out;
}

/** A class attribute from its parts, leaving out the ones that aren't there. */
export const classes = (...parts: (string | false | null | undefined)[]) =>
	parts.filter(Boolean).join(" ");

/**
 * A tile colour as its classes: "accent" (or "c-accent") is
 * "on-color c-accent", the pair every coloured surface has.
 */
export const colour = (name?: string | null) =>
	name ? `on-color ${name.startsWith("c-") ? name : `c-${name}`}` : "";

/** An element whose tag is only known when it's drawn (a tile's `as`). */
export const element = (
	tag: string,
	attrs: Record<string, unknown>,
	children: ComponentChild
): HTMLElement =>
	(jsx as (tag: string, props: Record<string, unknown>) => HTMLElement)(tag, {
		...attrs,
		children,
	});

/**
 * Make a component here stand for the element it draws, no more: as far as
 * dreamland's scoped styles go, its root (and what it wraps its children in)
 * then belongs to whichever component used it, the way a plain <div> written
 * there would. So an app's component can write `.tiles { … }` in its own css
 * and have it reach a <Tiles> it uses.
 *
 * (How: dreamland marks every component's root as one, and a styled parent
 * leaves those alone when it stamps its children with its scope. This takes
 * the mark off again, in the component's init hook, which runs as soon as
 * it's drawn and before the parent sees it.)
 *
 * Call it at the top of the component: `transparent(this)`. Not for one
 * whose root is another component's (a <Tile to>: that's the <Link>'s).
 */
export function transparent(self: {
	root?: unknown;
	cx?: { init?: () => unknown };
}) {
	if (!self.cx) return;
	self.cx.init = () => {
		const el = self.root as (HTMLElement & { $?: unknown }) | undefined;
		el?.classList?.remove("dlc");
		if (el && "$" in el) delete el.$;
	};
}
