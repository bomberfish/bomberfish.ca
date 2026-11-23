import { ComponentChild, FC } from "dreamland/core";
import Link from "./Link";
import { classes, colour, element, rest, transparent } from "./props";

// Tiles. A <Tile> is a flat rectangle of colour (or of glass: metro.css,
// "Tiles") sized in units of the grid it's in (`w` x `h`; `pw` x `ph` where
// a phone's layout wants another size). It leans when it's pressed (tilt)
// and leaves and arrives on its own beat in a page change (feather) unless
// told not to.
//
// What it is depends on where it leads: `to` a page of the app (a <Link>,
// with the page transition), `href` anywhere else (a plain <a>), neither
// (a <div>, or whatever `as` says).
//
// A live tile has two faces, <TileFront> and <TileBack>, and turns over
// between them every so often and when it's pointed at (`flip`); or several
// <TileSlide>s, one pushing the last out (`cycle`).

type Common = {
	class?: string;
	children?: ComponentChild;
} & Record<string, unknown>;

export function Tile(
	this: FC<
		{
			to?: string;
			href?: string;
			as?: string;
			/** "accent", "red", …: one of the palette's (metro.css, "colours") */
			color?: string;
			w?: number;
			h?: number;
			pw?: number;
			ph?: number;
			flip?: boolean;
			cycle?: boolean;
			tilt?: boolean;
			feather?: boolean;
			style?: string | Record<string, string | undefined>;
		} & Common
	>
) {
	const vars: Record<string, string> = {};
	if (this.w != null) vars["--w"] = `${this.w}`;
	if (this.h != null) vars["--h"] = `${this.h}`;
	if (this.pw != null) vars["--pw"] = `${this.pw}`;
	if (this.ph != null) vars["--ph"] = `${this.ph}`;
	const style =
		typeof this.style === "object" && this.style
			? { ...vars, ...this.style }
			: [
					...Object.entries(vars).map(([name, value]) => `${name}: ${value}`),
					this.style,
				]
					.filter(Boolean)
					.join("; ");
	const attrs: Record<string, unknown> = {
		...rest(this, [
			"to",
			"href",
			"as",
			"color",
			"w",
			"h",
			"pw",
			"ph",
			"flip",
			"cycle",
			"tilt",
			"feather",
			"style",
		]),
		class: classes("tile", colour(this.color), this.class),
	};
	if (typeof style === "object" || style) attrs.style = style;
	if (this.tilt !== false) attrs["data-m-tilt"] = true;
	if (this.flip) attrs["data-m-flip"] = true;
	if (this.cycle) attrs["data-m-cycle"] = true;
	if (this.feather !== false) attrs["data-m-feather"] = true;
	const inside = this.flip ? (
		<span class="tile-flipper">{this.children}</span>
	) : (
		this.children
	);
	if (this.to != null)
		return (
			<Link href={this.to} {...attrs}>
				{inside}
			</Link>
		);
	transparent(this);
	if (this.href != null) attrs.href = this.href;
	return element(this.href != null ? "a" : (this.as ?? "div"), attrs, inside);
}

const face = (which: "front" | "back") =>
	function TileFace(this: FC<{ color?: string } & Common>) {
		transparent(this);
		return (
			<span
				class={classes(
					"tile-face",
					`tile-${which}`,
					colour(this.color),
					this.class
				)}
				{...rest(this, ["color"])}
			>
				{this.children}
			</span>
		);
	};

/** The face of a flip tile that shows first. */
export const TileFront = face("front");
/** ...and the one it turns over to. */
export const TileBack = face("back");

/** One of a cycle tile's slides (`current`: the one showing to begin with). */
export function TileSlide(this: FC<{ current?: boolean } & Common>) {
	transparent(this);
	return (
		<span
			class={classes("tile-slide", this.current && "is-current", this.class)}
			{...rest(this, ["current"])}
		>
			{this.children}
		</span>
	);
}

const part = (name: string) =>
	function TilePart(this: FC<Common>) {
		transparent(this);
		return (
			<span class={classes(name, this.class)} {...rest(this)}>
				{this.children}
			</span>
		);
	};

/** A tile's caption, along its foot. */
export const TileLabel = part("tile-label");
/** A big light number on a tile. */
export const TileCount = part("tile-count");
/** A tile's pictogram. */
export const TileIcon = part("tile-icon");

/** A grid of tiles: they place themselves in it by their sizes. */
export function Tiles(this: FC<{ as?: string } & Common>) {
	transparent(this);
	return element(
		this.as ?? "div",
		{ class: classes("tiles", this.class), ...rest(this, ["as"]) },
		this.children
	);
}

export default Tile;
