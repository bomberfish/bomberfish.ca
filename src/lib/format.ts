import humanizeDuration from "humanize-duration";

// "5 minutes ago"
export const ago = (since: string) =>
	humanizeDuration(Date.now() - new Date(since).getTime(), {
		largest: 1,
		round: true,
	}) + " ago";

// "5s", "41m", "3h", "2d", "4w", "1y"
export const compactAgo = humanizeDuration.humanizer({
	language: "short",
	languages: {
		short: {
			y: () => "y",
			mo: () => "mo",
			w: () => "w",
			d: () => "d",
			h: () => "h",
			m: () => "m",
			s: () => "s",
			ms: () => "ms",
		},
	},
	units: ["y", "w", "d", "h", "m", "s"],
	largest: 1,
	round: true,
	delimiter: "",
	spacer: "",
});

// Compact "K/M/B" formatter for big counts (listeners, plays, views). Drops
// the decimal once the rounded value reaches 100 (e.g. "174K" not "174.5K")
// and strips trailing ".0" so we never render "1.0K".
export function compactNumber(n: number): string {
	if (n < 1000) return n.toLocaleString();
	const fmt = (v: number, suffix: string) =>
		(v >= 100 ? `${Math.round(v)}` : v.toFixed(1).replace(/\.0$/, "")) + suffix;
	if (n < 1_000_000) return fmt(n / 1000, "K");
	if (n < 1_000_000_000) return fmt(n / 1_000_000, "M");
	return fmt(n / 1_000_000_000, "B");
}
