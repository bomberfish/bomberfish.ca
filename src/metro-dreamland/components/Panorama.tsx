import { ComponentChild, FC } from "dreamland/core";
import { classes, rest, transparent } from "./props";

// The panorama: one wide page that pans sideways, section after section,
// under a title wider than the screen that pans slower than they do
// (motion/panorama.ts; laid out by metro.css, "Panorama"). It goes in a
// <Page kind="pano">:
//
//   <Panorama>
//     <PanoramaTitle>…the title…</PanoramaTitle>
//     <PanoramaTrack>
//       <PanoramaSection id="about">
//         <PanoramaHeading>whoami</PanoramaHeading>
//         …
//       </PanoramaSection>
//       …
//     </PanoramaTrack>
//   </Panorama>
//
// A link in it to "#about" with data-m-pan pans to that section.

type Props = {
	class?: string;
	children?: ComponentChild;
} & Record<string, unknown>;

export function Panorama(this: FC<Props>) {
	transparent(this);
	return (
		<div
			class={classes("pano", this.class)}
			data-m-pano
			tabindex="-1"
			{...rest(this)}
		>
			<div class="pano-inner">{this.children}</div>
		</div>
	);
}

/** The title layer: what's in it pans at its own, slower pace. */
export function PanoramaTitle(this: FC<Props>) {
	transparent(this);
	return (
		<div class={classes(this.class, "pano-title")} {...rest(this)}>
			<div class="pano-title-layer" data-m-layer="title">
				{this.children}
			</div>
		</div>
	);
}

/** The strip of sections. */
export function PanoramaTrack(this: FC<Props>) {
	transparent(this);
	return (
		<div
			class={classes("pano-track", this.class)}
			data-m-pano-track
			{...rest(this)}
		>
			{this.children}
		</div>
	);
}

/** One section of the strip: somewhere the panorama comes to rest. */
export function PanoramaSection(this: FC<Props>) {
	transparent(this);
	return (
		<section
			class={classes("pano-item", this.class)}
			data-m-pano-item
			{...rest(this)}
		>
			{this.children}
		</section>
	);
}

/** A section's heading. */
export function PanoramaHeading(this: FC<Props>) {
	transparent(this);
	return (
		<h3
			class={classes("pano-item-title", this.class)}
			data-m-feather
			{...rest(this)}
		>
			{this.children}
		</h3>
	);
}

export default Panorama;
