import { FC } from "dreamland/core";

// Windows 8's two indeterminate loaders: "busy, and no telling for how
// long". Both are five dots in the accent (in the tile's ink, on a coloured
// tile), and both move exactly as the originals did: the key frames are
// Microsoft's own, from the controls' default templates (see
// scripts/loaders/keyframes.py, which turns them into the CSS under
// "Loaders" in metro.css).
//
//   <ProgressRing />  the dots chase each other round a circle. For
//                     something with nothing to show yet: it goes where
//                     the thing will be.
//   <ProgressBar />   the dots fly in from the left, bunch up in the middle
//                     and fly off to the right, across the full width of
//                     whatever it's in. For something that's there already
//                     and is fetching more: it goes along its top edge.
//                     (runProgressBar, below, is for showing one only while
//                     that's going on, and only if it goes on a while.)
//
// Neither needs any script: they're animating as soon as they're on the
// page, the server-rendered ones included. `label` is what a screen reader
// calls it ("loading" if you don't say); an empty one hides it from screen
// readers, for a loader inside something that already says it's busy.

const named = (label: string | undefined) =>
	label === ""
		? { "aria-hidden": "true" }
		: { role: "progressbar", "aria-label": label ?? "loading" };

/**
 * The ring. Three sizes, as the control had: small (20px, its default),
 * medium (40px) and large (60px, where it gains a sixth dot).
 */
export function ProgressRing(
	this: FC<{ size?: "small" | "medium" | "large"; label?: string }>
) {
	const size =
		this.size && this.size !== "small" ? ` m-progress-ring-${this.size}` : "";
	return (
		<span class={`m-progress-ring${size}`} {...named(this.label)}>
			<i />
			<i />
			<i />
			<i />
			<i />
			<i />
		</span>
	);
}

// One pass of the bar's dots, and how far into it the last of them has gone
// off the far side (the two numbers are the template's: "Loaders" in
// metro.css). Between the second and the first, nothing's showing.
const BAR_PASS_MS = 3917;
const BAR_CLEAR_MS = 3667;
// How long something has to have been busy before the bar comes out at all.
const BAR_WAIT_MS = 800;

// wait: the timer that will bring it out; since: when it came out; stop:
// the timer that will put it away
const running = new WeakMap<
	HTMLElement,
	{ wait: number; since: number; stop: number }
>();

/**
 * Show a <ProgressBar /> while something is busy: `holder` is an element
 * around the bar that is display: none until it has [data-running], which
 * this sets and takes off again. Call it whenever busy changes.
 *
 * Not at once, on either side. A wait that's over inside most of a second
 * never brings the bar out: that's as good as instant, and dots flickering
 * at an edge for it would only be noise. And once the bar is out it's left
 * to finish the pass its dots are on, however soon after the wait ends: cut
 * off mid-flight it's a flicker again, and left to run the dots gather and
 * go off the far side, as they did every time on the phone. What was being
 * waited for isn't held up, only the bar stays; and a new wait that begins
 * while it's finishing carries on with the same pass.
 */
export function runProgressBar(
	holder: HTMLElement | null | undefined,
	busy: boolean
) {
	if (!holder) return;
	const run = running.get(holder);
	if (busy) {
		if (run) {
			// (already waiting to come out, or out: it carries on)
			clearTimeout(run.stop);
			run.stop = 0;
			return;
		}
		const next = { wait: 0, since: 0, stop: 0 };
		running.set(holder, next);
		next.wait = window.setTimeout(() => {
			next.wait = 0;
			// (display: none to block starts the animations from the top)
			next.since = performance.now();
			holder.dataset.running = "";
		}, BAR_WAIT_MS);
		return;
	}
	if (!run || run.stop) return;
	const end = () => {
		clearTimeout(run.wait);
		delete holder.dataset.running;
		running.delete(holder);
	};
	// over before the bar came out: it never does
	if (run.wait) return end();
	// (nothing's moving: there's no pass to finish)
	if (matchMedia("(prefers-reduced-motion: reduce)").matches) return end();
	const into = (performance.now() - run.since) % BAR_PASS_MS;
	// in the gap between passes already, or else when this pass's last dot
	// has gone (and a moment more: the timer and the animation aren't on
	// quite the same clock)
	if (into > BAR_CLEAR_MS + 60) end();
	else run.stop = window.setTimeout(end, BAR_CLEAR_MS + 120 - into);
}

/** The line. As wide as what it's in; its dots grow with it, as theirs did. */
export function ProgressBar(this: FC<{ label?: string }>) {
	return (
		<span class="m-progress-bar" {...named(this.label)}>
			<span class="m-progress-bar-run">
				{[1, 2, 3, 4, 5].map(() => (
					<i>
						<b />
					</i>
				))}
			</span>
		</span>
	);
}
