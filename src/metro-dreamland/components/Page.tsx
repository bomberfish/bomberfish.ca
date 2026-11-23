import { ComponentChild, FC } from "dreamland/core";
import { rest, transparent } from "./props";

// A page: what the router puts in its outlet, and what a page change swings
// out and in. `kind` says how it's laid out and so how it moves: a plain
// "page" (turnstile), a "pivot" (its header strip and content slide), or a
// "pano" (a <Panorama>).
export function Page(
	this: FC<
		{
			kind?: "page" | "pivot" | "pano";
			class?: string;
			children?: ComponentChild;
		} & Record<string, unknown>
	>
) {
	transparent(this);
	const attrs = rest(this, ["kind"]);
	if (this.class) attrs.class = this.class;
	return (
		<main data-m-page={this.kind ?? "page"} {...attrs}>
			{this.children}
		</main>
	);
}

export default Page;
