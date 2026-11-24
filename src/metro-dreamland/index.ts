// metro-dreamland: Windows Phone 7/8 and Windows 8's "Metro", for dreamland.
//
// Three things, meant to be dropped into an app together:
//
//   metro.css     the look: tiles (flat, or Windows 10's acrylic: see
//                 setMaterial), the pivot and panorama layouts, buttons,
//                 sliders, switches, loaders, scrollbars. Import it
//                 before the app's own styles (which then have the last
//                 word): @import "metro-dreamland/metro.css".
//   components/   the markup, as dreamland components: <Page>, <Link>,
//                 <Tile> and its parts, <Pivot>, <Panorama>, <Button>,
//                 <RingButton>, <Slider>, <Toggle>, <ProgressBar>,
//                 <ProgressRing>.
//   motion/       how it all moves (below). Started with startMetro()
//                 before the app hydrates and metroReady() after:
//
//                   startMetro({ outlet: "#app main", host: "#app" });
//                   hydrate(...);
//                   metroReady();
//
// Motion
//
// Windows Phone 7/8 and Windows 8 moved in a handful of well-defined ways.
// These are the ones the site uses, all of them real 3D transforms
// (perspective, rotateX/rotateY, translateZ) run through the Web Animations
// API, so they stay on the compositor and each one is a promise:
//
//   turnstile  a page swings out and the next one swings in, both around
//              the left edge of the screen, like a revolving door
//   feather    the same swing, but piece by piece: every tile on screen
//              leaves on its own beat, the one you tapped last
//   continuum  what's on both pages stays: the title you tapped travels to
//              where it's the title of the page it opened, a picture
//              from its tile to its page (and back again). That part is
//              motion/continuum.ts, which stands alone.
//   pivot      the header strip and the content slide sideways at
//              different speeds; a swipe across the page turns it too
//   tilt       whatever you press leans away under your finger
//   flip       live tiles turn over to their other face
//   cycle      live tiles push a new slide up from underneath
//   swivel     toasts and one-liners swing around a horizontal edge
//   marquee    a line too long for its place travels through it
//   panorama   one wide page: photo, title and tiles pan at three speeds
//   reveal     Windows 10's light under the pointer, on tiles' rims
//              (motion/reveal.ts, which stands alone too)
//
// Markup opts in with data attributes, which is all the components do: they
// don't run motion code, they say what they are. Anything else can say the
// same (a paragraph with data-m-feather, a title with data-m-keep):
//
//   <main data-m-page="pano|pivot|page">   a page (the router's outlet): <Page>
//   data-m-strip                           on a pano page: its panorama is a
//                                          strip on a phone too, not a column
//   data-m-feather                         leaves/arrives on its own beat
//   data-m-tilt                            leans when pressed
//   data-m-flip   (+ .tile-flipper)        a two-faced live tile
//   data-m-cycle  (+ .tile-slide)          a live tile with several slides
//   data-m-pano   (+ data-m-layer)         the panorama scroller
//   data-m-pan                             on a link in it to "#a-section":
//                                          pans along to that section (and
//                                          the address takes the #)
//   data-m-fit                             text in it that has to fit a box
//                                          of a set height (see fitText)
//   data-m-pivot / data-m-content          a pivot page's strip and body
//   data-m-nav="pivot|continuum"           on a link: how to get there
//   data-m-up                              on a link: it leads back up
//   data-m-back="/the/way/up"              the back button: where you came
//                                          from, or failing that, up
//   data-m-keep="some:key"                 on both pages: the same thing,
//                                          which stays through the change
//
// Navigation goes through navigate() (<Link> does), and the
// browser's own back/forward buttons are intercepted so they animate too.
// With prefers-reduced-motion everything here resolves at once and nothing
// moves.

export { type MetroConfig, configure } from "./motion/core";
export { metroReady, navigate, startMetro } from "./motion/navigation";
export { marquee, swapText, swivelIn, swivelOut } from "./motion/text";
export { type KeepOptions, type Kept, keep } from "./motion/continuum";
export { startReveal } from "./motion/reveal";
export { type Material, material, setMaterial } from "./motion/material";

export { Link } from "./components/Link";
export { Page } from "./components/Page";
export {
	Tile,
	TileBack,
	TileCount,
	TileFront,
	TileIcon,
	TileLabel,
	TileSlide,
	Tiles,
} from "./components/Tile";
export { PageHeader, Pivot, type PivotItem } from "./components/Pivot";
export {
	Panorama,
	PanoramaHeading,
	PanoramaSection,
	PanoramaTitle,
	PanoramaTrack,
} from "./components/Panorama";
export { Button, RingButton } from "./components/Button";
export { default as Slider, placeSlider } from "./components/Slider";
export { Toggle, placeToggle } from "./components/Toggle";
export {
	ProgressBar,
	ProgressRing,
	runProgressBar,
} from "./components/Progress";
