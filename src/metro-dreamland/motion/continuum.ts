// Continuum, the part that stays: some things are on both sides of a page
// change (the title you tapped and the title of the page it opens; a
// project's picture on its tile and on its page), and those don't leave
// and arrive like the rest. They stay on screen and travel from where they
// were to where they belong next.
//
// Nothing in here knows about the site, its router or its framework: it's
// the DOM and the Web Animations API. To use it somewhere else, take this
// file. Mark the two ends with the same key:
//
//   <h3 data-m-keep="post:hello">Hello</h3>        (the list)
//   <h1 data-m-keep="post:hello">Hello</h1>        (the page it opens)
//
// and around whatever swaps one page for the other:
//
//   const kept = keep(oldPage, { within: theLinkThatWasPressed });
//   ...the old page goes, the new one is put in and laid out...
//   await kept.ready(newPage);    // (a picture it's bound for has loaded)
//   await kept.into(newPage);
//   kept.end();          // always: it's what gives everything back
//
// How it's done: each kept thing is copied into a layer over the page (a
// "ghost", position: fixed, exactly where the original is) and the original
// hidden, so whatever the page does on its way out, the ghost stays put.
// When the next page is in, a second ghost is made of the thing it's to
// become, and the two cross: the first travels to where the second
// belongs, growing or shrinking to its size and fading out, while the
// second comes the other way and fades in. Only transforms and opacity
// move, so it's all on the compositor. A line of type scales evenly, by the
// ratio of the two font sizes (it mustn't stretch, and the two ends often
// wrap differently); a picture goes from box to box.
//
// A kept thing should be a leaf: a line of text, or a picture. The copy
// takes the element's own computed styles with it, not its descendants'.

export interface KeepOptions {
	/**
	 * Only what's in here is kept (a link that was pressed: its title, not
	 * every title in the list; and nothing at all, if it has nothing
	 * marked). Left out, everything marked that's on screen is: for going
	 * back, when there's no telling yet what the page before will have.
	 */
	within?: Element | null;
	/** A further say on whether something can be seen (a tile's far face can't). */
	visible?: (el: HTMLElement) => boolean;
	duration?: number;
	easing?: string;
}

export interface Kept {
	/** Something was kept. */
	readonly any: boolean;
	/** The keys kept. */
	readonly keys: string[];
	/**
	 * The next page is in, but a picture in it that one of these is bound
	 * for may not be: until it's loaded it has no size, and there's nowhere
	 * to aim at. Resolves when they have (or after `patience` ms, whichever
	 * is first). Wait for it, with the page still out of sight, before into().
	 */
	ready(page: Element | null, patience?: number): Promise<void>;
	/**
	 * The next page is in: send each kept thing to its counterpart there
	 * (by key), and fade out the ones that have none. Resolves when they've
	 * all landed. The counterparts are hidden until then.
	 */
	into(page: Element | null): Promise<void>;
	/** Is this element one of the counterparts (so: leave it out of the entrance)? */
	lands(el: Element): boolean;
	/** Take the ghosts away and unhide whatever was hidden. Safe to call twice. */
	end(): void;
}

const ATTR = "data-m-keep";
const LAYER = "m-keep-layer";

// What a copy needs of the original's computed style to look like it once
// it's out of its place in the page.
const COPIED = [
	// (the shorthand, and then its parts: a variable font's computed "font"
	// can come back empty, and then the copy would be in whatever the layer
	// has)
	"font",
	"fontFamily",
	"fontSize",
	"fontWeight",
	"fontStyle",
	"fontStretch",
	"lineHeight",
	// (how the type's drawn, which a page usually sets on <body>: the copy
	// is outside it, and without these comes out heavier than the original)
	"webkitFontSmoothing",
	"textRendering",
	"fontOpticalSizing",
	"fontSynthesis",
	"fontVariantLigatures",
	"fontVariantNumeric",
	"fontKerning",
	"fontFeatureSettings",
	"fontVariationSettings",
	"letterSpacing",
	"wordSpacing",
	"textAlign",
	"textTransform",
	"textShadow",
	"textWrap",
	"whiteSpace",
	"overflowWrap",
	"wordBreak",
	"hyphens",
	"color",
	"paddingTop",
	"paddingRight",
	"paddingBottom",
	"paddingLeft",
	"maskImage",
	"webkitMaskImage",
	"objectFit",
	"objectPosition",
	"imageRendering",
] as const;

const onScreen = (r: DOMRect) =>
	r.width > 0 &&
	r.height > 0 &&
	r.bottom > 0 &&
	r.right > 0 &&
	r.top < innerHeight &&
	r.left < innerWidth;

// the picture in an element, if a picture is what it is
const pictureOf = (el: HTMLElement) =>
	el instanceof HTMLImageElement
		? el
		: el instanceof HTMLPictureElement || el.children.length === 1
			? el.querySelector("img")
			: null;

interface Shot {
	el: HTMLElement;
	ghost: HTMLElement;
	rect: DOMRect;
	/** where its type starts (a block is as wide as its column; its words aren't) */
	ink: DOMRect;
	fontSize: number;
	picture: boolean;
	hid: string;
}

// where an element's own content is, as against its box
function inkOf(el: HTMLElement, rect: DOMRect) {
	try {
		const range = document.createRange();
		range.selectNodeContents(el);
		const ink = range.getBoundingClientRect();
		if (ink.width > 0 && ink.height > 0) return ink;
	} catch {
		// (no ranges here)
	}
	return rect;
}

function layer() {
	let el = document.querySelector<HTMLElement>(`.${LAYER}`);
	if (el) return el;
	el = document.createElement("div");
	el.className = LAYER;
	el.setAttribute("aria-hidden", "true");
	el.style.cssText =
		"position:fixed;inset:0;z-index:2147483000;pointer-events:none;overflow:visible;contain:layout style";
	// (on <html>, not <body>: a body with a transform or a perspective of
	// its own is what "fixed" would then be fixed to, and it scrolls)
	document.documentElement.append(el);
	return el;
}

// Where an element is. (A <picture> is a box round nothing, as often as
// not with no height at all: it's where its <img> is.)
const rectOf = (el: HTMLElement) =>
	(el instanceof HTMLPictureElement
		? (el.querySelector("img") ?? el)
		: el
	).getBoundingClientRect();

// A copy of `el` in the layer, where `el` is; `el` itself hidden.
function shoot(el: HTMLElement): Shot {
	const rect = rectOf(el);
	const style = getComputedStyle(el);
	const img = pictureOf(el);
	const ghost = document.createElement("div");
	ghost.style.cssText = `position:fixed;left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;margin:0;box-sizing:border-box;transform-origin:0 0;will-change:opacity;overflow:hidden;`;
	let copy: HTMLElement;
	if (img) {
		// (whichever file the browser chose, so the copy needs no choosing)
		const pic = document.createElement("img");
		pic.src = img.currentSrc || img.src;
		pic.alt = "";
		pic.decoding = "sync";
		const from = getComputedStyle(img);
		pic.style.cssText = `display:block;width:100%;height:100%;object-fit:${from.objectFit};object-position:${from.objectPosition};image-rendering:${from.imageRendering};`;
		copy = pic;
	} else {
		copy = el.cloneNode(true) as HTMLElement;
		copy.removeAttribute("id");
		copy.removeAttribute(ATTR);
		for (const node of copy.querySelectorAll("[id]"))
			node.removeAttribute("id");
		copy.style.cssText =
			"display:block;margin:0;width:100%;height:100%;box-sizing:border-box;opacity:1;visibility:visible;transform:none;animation:none;transition:none;";
		for (const prop of COPIED) {
			const value = style[prop as keyof CSSStyleDeclaration] as string;
			if (value) copy.style[prop as "color"] = value;
		}
		ghost.style.overflow = "visible";
	}
	ghost.append(copy);
	layer().append(ghost);
	const hid = el.style.visibility;
	el.style.visibility = "hidden";
	return {
		el,
		ghost,
		rect,
		ink: img ? rect : inkOf(el, rect),
		fontSize: parseFloat(style.fontSize) || 16,
		picture: !!img,
		hid,
	};
}

const keyed = (scope: Element) =>
	Array.from(scope.querySelectorAll<HTMLElement>(`[${ATTR}]`)).concat(
		scope instanceof HTMLElement && scope.hasAttribute(ATTR) ? [scope] : []
	);

/**
 * Keep what's marked data-m-keep in `page` (and on screen) through a page
 * change. Call it before the page starts to leave.
 */
export function keep(page: Element | null, options: KeepOptions = {}): Kept {
	const {
		within,
		visible = () => true,
		duration = 460,
		easing = "cubic-bezier(0.45, 0, 0.15, 1)",
	} = options;
	const can =
		!!page &&
		typeof document.body.animate === "function" &&
		!matchMedia("(prefers-reduced-motion: reduce)").matches;
	const seen = (el: HTMLElement) => onScreen(rectOf(el)) && visible(el);

	const shots = new Map<string, Shot>();
	const landed: Shot[] = [];
	const running: Animation[] = [];
	if (can && page) {
		for (const el of keyed(within ?? page).filter(seen)) {
			const key = el.getAttribute(ATTR);
			// (the first of a key is the one: a list can have a post twice)
			if (key && !shots.has(key)) shots.set(key, shoot(el));
		}
	}

	const fly = (el: Element, frames: Keyframe[], ms = duration) => {
		const anim = el.animate(frames, { duration: ms, easing, fill: "both" });
		running.push(anim);
		return anim.finished.then(
			() => {},
			() => {}
		);
	};

	let ended = false;
	return {
		any: shots.size > 0,
		keys: [...shots.keys()],

		lands: (el) =>
			landed.some((shot) => shot.el === el || el.contains(shot.el)),

		ready(next, patience = 500) {
			if (ended || !shots.size || !next) return Promise.resolve();
			const waits: Promise<unknown>[] = [];
			for (const el of keyed(next)) {
				if (!shots.has(el.getAttribute(ATTR)!)) continue;
				const img = pictureOf(el);
				if (img && !(img.complete && img.naturalWidth))
					// (its load event, not decode(): that gives up at once on a
					// picture that hasn't chosen its file yet)
					waits.push(
						new Promise((resolve) => {
							img.addEventListener("load", resolve, { once: true });
							img.addEventListener("error", resolve, { once: true });
						})
					);
			}
			if (!waits.length) return Promise.resolve();
			return Promise.race([
				Promise.all(waits).then(() => {}),
				new Promise<void>((resolve) => setTimeout(resolve, patience)),
			]);
		},

		into(next) {
			if (ended || !shots.size) return Promise.resolve();
			const flights: Promise<void>[] = [];
			const targets = new Map<string, HTMLElement>();
			if (next)
				for (const el of keyed(next)) {
					const key = el.getAttribute(ATTR)!;
					if (shots.has(key) && !targets.has(key) && seen(el))
						targets.set(key, el);
				}
			for (const [key, from] of shots) {
				const target = targets.get(key);
				if (!target) {
					// nowhere to go: it goes, quietly and at once
					flights.push(fly(from.ghost, [{ opacity: 1 }, { opacity: 0 }], 160));
					continue;
				}
				const to = shoot(target);
				landed.push(to);
				// how much bigger the far end is, each way: a picture's box to
				// its box, type by its size alone
				const scale = from.picture
					? [to.rect.width / from.rect.width, to.rect.height / from.rect.height]
					: Array(2).fill(to.fontSize / from.fontSize);
				// ...and how far it is, from where one's content starts to
				// where the other's does (the ghosts are the boxes, and
				// scale from their corners: the content's offset scales too)
				const dx =
					to.ink.left -
					from.rect.left -
					(from.ink.left - from.rect.left) * scale[0];
				const dy =
					to.ink.top -
					from.rect.top -
					(from.ink.top - from.rect.top) * scale[1];
				const bx =
					from.ink.left -
					to.rect.left -
					(to.ink.left - to.rect.left) / scale[0];
				const by =
					from.ink.top - to.rect.top - (to.ink.top - to.rect.top) / scale[1];
				// Do the two look alike all the way (a picture; type that
				// breaks into as many lines at both ends)? Then one turns
				// into the other slowly, both there for most of the trip.
				// Type that wraps differently can't be laid over itself: the
				// one going is gone before it's grown much, and the one
				// coming is all there soon after.
				const alike =
					from.picture ||
					Math.abs(to.ink.height - from.ink.height * scale[1]) <
						to.ink.height * 0.2;
				const [goes, comes] = alike ? [0.3, 0.7] : [0.12, 0.45];
				flights.push(
					fly(from.ghost, [
						{ transform: "translate(0px, 0px) scale(1, 1)", opacity: 1 },
						{ opacity: 1, offset: goes },
						...(alike ? [] : [{ opacity: 0, offset: 0.5 }]),
						{
							transform: `translate(${dx}px, ${dy}px) scale(${scale[0]}, ${scale[1]})`,
							opacity: 0,
						},
					]),
					fly(to.ghost, [
						{
							transform: `translate(${bx}px, ${by}px) scale(${1 / scale[0]}, ${1 / scale[1]})`,
							opacity: 0,
						},
						{ opacity: 1, offset: comes },
						{ transform: "translate(0px, 0px) scale(1, 1)", opacity: 1 },
					])
				);
			}
			return Promise.all(flights).then(() => {});
		},

		end() {
			if (ended) return;
			ended = true;
			for (const shot of [...shots.values(), ...landed]) {
				shot.el.style.visibility = shot.hid;
				shot.ghost.remove();
			}
			for (const anim of running) anim.cancel();
			const host = document.querySelector(`.${LAYER}`);
			if (host && !host.childElementCount) host.remove();
		},
	};
}
