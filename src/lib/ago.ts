import humanizeDuration from "humanize-duration";

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
