// Keeps the page background (.page-bg, see style.css) in place on screen.
// The layers are ordinary content translated down as the page scrolls, by
// scroll-driven animations whose end point needs the page's scroll range in
// CSS: that's --scroll-max, kept up to date here. Browsers without scroll
// timelines (Firefox) get the same translations from a scroll listener.

const PARALLAX_SPEED = 0.35; // keep in sync with --parallax-speed

export function startPageBg() {
	const root = document.documentElement;
	const photo = document.querySelector<HTMLElement>(".page-bg-photo");
	const fixed = document.querySelector<HTMLElement>(".page-bg-fixed");
	const grain = document.querySelector<HTMLElement>(".page-bg-grain");
	if (!photo || !fixed) return;

	let scrollMax = 0;
	const measure = () => {
		const next = Math.max(0, root.scrollHeight - window.innerHeight);
		if (next === scrollMax) return;
		scrollMax = next;
		root.style.setProperty("--scroll-max", `${next}px`);
		if (!scrollDriven) place();
	};

	// fallback: the same translations as the keyframes, set per scroll
	const scrollDriven = CSS.supports("animation-timeline: scroll()");
	const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
	let raf = 0;
	const place = () => {
		raf = 0;
		const y = Math.min(window.scrollY, scrollMax);
		fixed.style.transform = `translateY(${y}px)`;
		if (grain) grain.style.transform = `translateY(${y}px)`;
		if (reduceMotion.matches || !scrollMax) {
			photo.style.transform = `translateY(${y}px)`;
			return;
		}
		// bleed = how far the grain runs past the window's bottom
		const bleed = grain ? grain.offsetHeight - fixed.offsetHeight : 0;
		const travel = Math.max(0, photo.offsetHeight - window.innerHeight - bleed);
		const end = scrollMax - Math.min(travel, PARALLAX_SPEED * scrollMax);
		photo.style.transform = `translateY(${(y / scrollMax) * end}px)`;
	};

	// The iPhone Duo's outer screen puts Safari's controls in a rail down
	// the side: outside the page's width, but drawn over page area, and not
	// reported as a safe area. Safari only draws page there that's inside
	// the scrollable width (not fixed elements, not shadows/outsets), so to
	// get the background under it the page is made wider by the rail's
	// width on its side (--rail-l / --rail-r, see --bg-bleed-l/r in
	// style.css), with sideways panning switched off (html.has-rail). On the
	// left that means pushing the page across and scrolling the extra strip
	// back under the rail, since nothing left of x = 0 is ever drawn.
	//
	// The rail is the gap between the screen and the page. Which side: in
	// portrait it's on the right; in landscape it follows the camera, i.e.
	// the top of the phone: right at angle 270 (window.orientation -90),
	// left at 90. Confirmed on the device.
	const coarse = window.matchMedia("(pointer: coarse)");
	const portrait = window.matchMedia("(orientation: portrait)");
	const orientationAngle = () =>
		screen.orientation?.angle ??
		(window as { orientation?: number }).orientation ??
		0;
	let railLeft = 0;
	const holdRail = () => {
		// keep the left strip tucked under the rail (unless zoomed in, when
		// moving around sideways is the visual viewport's business)
		if (window.scrollX !== railLeft && (window.visualViewport?.scale ?? 1) <= 1.01)
			window.scrollTo(railLeft, window.scrollY);
	};
	const measureRail = () => {
		// measured without any bleed applied, else the page width includes it
		root.style.setProperty("--rail-l", "0px");
		root.style.setProperty("--rail-r", "0px");
		const angle = (orientationAngle() + 360) % 360;
		// screen.width/height don't swap when the phone turns on iOS
		const screenW = portrait.matches
			? Math.min(screen.width, screen.height)
			: Math.max(screen.width, screen.height);
		const gap = screenW - root.clientWidth;
		const rail = coarse.matches && gap >= 8 && gap <= 160 ? gap : 0;
		const onRight = portrait.matches || angle === 270;
		railLeft = rail && !onRight ? rail : 0;
		root.style.setProperty("--rail-l", `${railLeft}px`);
		root.style.setProperty("--rail-r", `${rail && onRight ? rail : 0}px`);
		root.classList.toggle("has-rail", rail > 0);
		holdRail();
		// layout may not have caught up with the new widths yet
		requestAnimationFrame(holdRail);
		setTimeout(holdRail, 250);
	};
	window.addEventListener("scroll", () => railLeft && holdRail(), { passive: true });

	// iOS doesn't turn taps into clicks under the rail lock's
	// touch-action: pan-y pinch-zoom (seen on the Duo: touchstart/end and
	// pointerdown/up all arrive on the link, then no click), which left
	// every link and button dead. So while it's on, a tap (touch that
	// barely moves, quickly) on something clickable gets clicked here, and
	// a real click following it, should iOS ever send one, is swallowed.
	const CLICKABLE = "a[href], button, summary, label, [role=button], [role=link]";
	let tap: { x: number; y: number; time: number; target: EventTarget | null } | null =
		null;
	let synthesizedAt = -Infinity;
	document.addEventListener(
		"touchstart",
		(e) => {
			if (!root.classList.contains("has-rail") || e.touches.length !== 1) {
				tap = null;
				return;
			}
			const t = e.touches[0];
			tap = { x: t.clientX, y: t.clientY, time: performance.now(), target: e.target };
		},
		{ capture: true, passive: true }
	);
	document.addEventListener(
		"touchmove",
		(e) => {
			const t = e.touches[0];
			if (tap && t && Math.hypot(t.clientX - tap.x, t.clientY - tap.y) > 10) tap = null;
		},
		{ capture: true, passive: true }
	);
	document.addEventListener(
		"touchend",
		() => {
			const t = tap;
			tap = null;
			if (!t || performance.now() - t.time > 800) return;
			const el = (t.target as Element | null)?.closest?.(CLICKABLE) as
				| HTMLElement
				| null
				| undefined;
			if (!el || (el as HTMLButtonElement).disabled) return;
			synthesizedAt = performance.now();
			el.click();
		},
		{ capture: true, passive: true }
	);
	document.addEventListener(
		"click",
		(e) => {
			if (e.isTrusted && performance.now() - synthesizedAt < 700) {
				e.preventDefault();
				e.stopImmediatePropagation();
			}
		},
		true
	);

	// before rain.ts's resize handler (registered later), so it sizes its
	// canvas with the new bleed
	measureRail();
	measure();
	// content loading in, route changes, fonts: anything that resizes body
	new ResizeObserver(measure).observe(document.body);
	window.addEventListener("resize", () => {
		measureRail();
		measure();
	});
	// turning the phone 180° (rail from one side to the other) doesn't
	// change the size, so there may be no resize
	screen.orientation?.addEventListener("change", measureRail);
	if (!scrollDriven) {
		window.addEventListener(
			"scroll",
			() => {
				raf ||= requestAnimationFrame(place);
			},
			{ passive: true }
		);
		place();
	}
}
