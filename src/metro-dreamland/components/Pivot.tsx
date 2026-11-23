import { ComponentChild, FC } from "dreamland/core";
import { norm, pivotPaths } from "../motion/core";
import Link from "./Link";
import { classes, rest, transparent } from "./props";

// The pivot: a page's title, followed on the same line by the other pages
// of its kind, dimmed and running off the edge of the screen. Picking one
// slides it to the front (the "pivot" transition, motion/transitions.ts).
// `items` are all of them in their fixed order and `active` the href of the
// one this page is: the strip starts there and goes round.
//
// The page it's on is a <Page kind="pivot">, and what slides in under the
// strip is marked data-m-content.
export interface PivotItem {
	href: string;
	label: string;
}

export function Pivot(
	this: FC<
		{
			items: PivotItem[];
			active: string;
			label?: string;
			class?: string;
		} & Record<string, unknown>
	>
) {
	transparent(this);
	const at = Math.max(
		0,
		this.items.findIndex((item) => item.href === this.active)
	);
	const rest_ = [...this.items.slice(at + 1), ...this.items.slice(0, at)];
	// (these pages are one place, as far as going back is concerned)
	for (const item of this.items) pivotPaths.add(norm(item.href));

	return (
		<nav
			class={classes("pivot", this.class)}
			aria-label={this.label ?? "sections"}
			data-m-pivot
			{...rest(this, ["items", "active", "label"])}
		>
			<h1 aria-current="page">{this.items[at]?.label}</h1>
			{rest_.map((item) => (
				<Link href={item.href} class="pivot-item" data-m-nav="pivot">
					{item.label}
				</Link>
			))}
		</nav>
	);
}

/**
 * A page's header: its giant lowercase title (an <h1>, or a <Pivot>) and
 * whatever goes under it.
 */
export function PageHeader(
	this: FC<
		{ class?: string; children?: ComponentChild } & Record<string, unknown>
	>
) {
	transparent(this);
	return (
		<div class={classes("page-header", this.class)} {...rest(this)}>
			{this.children}
		</div>
	);
}

export default Pivot;
