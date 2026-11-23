// Little pictures of the weather (and of the times of day), for the
// pickers on the about page: line drawings in the tile's own ink, a cloud
// with whatever's coming out of it. They move a bit (src/style.css,
// .wg-*): rain falls, snow drifts down, the sun turns, lightning flickers.
// Not with prefers-reduced-motion.

const CLOUD =
	"M6.5 15h11.2a4.3 4.3 0 0 0 .5-8.57A5.8 5.8 0 0 0 7.1 5.2 4.9 4.9 0 0 0 6.5 15z";
// (a smaller one, behind and to the right: an overcast is more than one cloud)
const CLOUD_BEHIND = "M14.2 4.3a4.4 4.4 0 0 1 7.3 2.9 3.3 3.3 0 0 1 .6 6.2";

const rays = (cx: number, cy: number, from: number, to: number, only?: number[]) =>
	[0, 45, 90, 135, 180, 225, 270, 315]
		.filter((deg) => !only || only.includes(deg))
		.map((deg) => {
			const a = (deg * Math.PI) / 180;
			const x = (r: number) => (cx + Math.cos(a) * r).toFixed(2);
			const y = (r: number) => (cy + Math.sin(a) * r).toFixed(2);
			return `M${x(from)} ${y(from)}L${x(to)} ${y(to)}`;
		})
		.join("");

const sun = () => (
	<g class="wg-sun">
		<circle cx="12" cy="13" r="4" />
		<path d={rays(12, 13, 6.4, 8.6)} />
	</g>
);
// the sun half out from behind a cloud
const sunBehind = () => (
	<g class="wg-sun wg-sun-behind">
		<path d="M5.1 6.6a3.4 3.4 0 0 1 6.2-1.2" />
		<path d={rays(8, 6.6, 5.2, 6.9, [180, 225, 270, 315])} />
	</g>
);
const moon = () => <path d="M15.2 5.2a7.6 7.6 0 1 0 5.4 12.4 6.2 6.2 0 0 1-5.4-12.4z" />;
const cloud = () => <path d={CLOUD} />;

// what comes out of the cloud, in three places under it
const AT = [8.2, 12.2, 16.2];
const drops = (short = false) => (
	<g class="wg-fall">
		{AT.map((x, i) => (
			<path
				d={`M${x} ${short ? 19 : 18}l-${short ? 0.6 : 1.3} ${short ? 1.6 : 3.6}`}
				style={`animation-delay: ${-i * 0.27}s`}
			/>
		))}
	</g>
);
const flakes = (few = false) => (
	<g class="wg-drift wg-solid">
		{(few ? [9, 14.6] : AT).map((x, i) => (
			<circle cx={x} cy={i % 2 ? 21.6 : 19.4} r="1" style={`animation-delay: ${-i * 0.6}s`} />
		))}
	</g>
);

const PICTURES: Record<string, () => unknown> = {
	// ---- weather ----
	// the real thing: a place, and word coming from it
	live: () => (
		<g>
			<circle class="wg-solid" cx="12" cy="13" r="1.7" />
			<g class="wg-pulse">
				<path d="M8.3 9.3a5.2 5.2 0 0 0 0 7.4M15.7 9.3a5.2 5.2 0 0 1 0 7.4" />
				<path
					d="M5.6 6.6a9 9 0 0 0 0 12.8M18.4 6.6a9 9 0 0 1 0 12.8"
					style="animation-delay: 0.35s"
				/>
			</g>
		</g>
	),
	clear: () => sun(),
	partly: () => (
		<g>
			{sunBehind()}
			<g transform="translate(1 4)">
				{cloud()}
			</g>
		</g>
	),
	// the moon half out from behind a cloud
	"partly-night": () => (
		<g>
			<path d="M9.6 3.2a4.6 4.6 0 0 0 5.6 5.9 4.9 4.9 0 0 1-2.2 1.5" />
			<path d="M9.6 3.2a4.9 4.9 0 0 0-4 4.6" />
			<g transform="translate(1 4)">{cloud()}</g>
		</g>
	),
	overcast: () => (
		<g transform="translate(-1 4)">
			<path d={CLOUD_BEHIND} />
			{cloud()}
		</g>
	),
	fog: () => (
		<g class="wg-waft">
			<path d="M4.5 9.5h15" />
			<path d="M7 13.5h13" style="animation-delay: -1.2s" />
			<path d="M4 17.5h12" style="animation-delay: -2.1s" />
			<path d="M9 21.5h10" style="animation-delay: -0.6s" />
		</g>
	),
	drizzle: () => (
		<g>
			{cloud()}
			{drops(true)}
		</g>
	),
	rain: () => (
		<g>
			{cloud()}
			{drops()}
		</g>
	),
	storm: () => (
		<g>
			{cloud()}
			<path class="wg-flash wg-solid" d="M13.4 16.2l-3.6 4.5h2.6l-1.3 3.6 4.3-5.2h-2.7l1.6-2.9z" />
		</g>
	),
	flurries: () => (
		<g>
			{cloud()}
			{flakes(true)}
		</g>
	),
	snow: () => (
		<g>
			{cloud()}
			{flakes()}
		</g>
	),
	// snow going sideways
	blizzard: () => (
		<g>
			<g class="wg-blow">
				<path d="M3.5 8.5h9.5a2.4 2.4 0 1 0-2.3-3.1" />
				<path d="M3.5 13h14.2a2.6 2.6 0 1 1-2.5 3.4" style="animation-delay: -0.7s" />
			</g>
			<g class="wg-solid">
				<circle cx="6" cy="18.6" r="1" />
				<circle cx="10.6" cy="21.8" r="1" />
				<circle cx="19.4" cy="7.4" r="1" />
				<circle cx="16.2" cy="21.2" r="1" />
			</g>
		</g>
	),
	// one of each
	mixed: () => (
		<g>
			{cloud()}
			<g class="wg-fall">
				<path d="M8.2 18l-1.3 3.6" />
				<path d="M16.2 18l-1.3 3.6" style="animation-delay: -0.4s" />
			</g>
			<g class="wg-drift wg-solid">
				<circle cx="11.6" cy="20.4" r="1" />
			</g>
		</g>
	),
	// freezing rain: what it leaves hanging
	ice: () => (
		<g>
			{cloud()}
			<g class="wg-solid wg-glint">
				<path d="M7.2 17.4h2.2l-1.1 5.2z" />
				<path d="M11.1 17.4h2.2l-1.1 6.6z" style="animation-delay: -0.9s" />
				<path d="M15 17.4h2.2l-1.1 4.2z" style="animation-delay: -1.7s" />
			</g>
		</g>
	),
	hail: () => (
		<g>
			{cloud()}
			<g class="wg-bounce">
				<circle cx="8.2" cy="20" r="1.25" />
				<circle cx="12.2" cy="22.2" r="1.25" style="animation-delay: -0.2s" />
				<circle cx="16.2" cy="20" r="1.25" style="animation-delay: -0.45s" />
			</g>
		</g>
	),

	// ---- times of day ----
	// whatever time it is: a clock
	now: () => (
		<g>
			<circle cx="12" cy="13" r="7.6" />
			<path class="wg-hand" d="M12 13V8.2" />
			<path d="M12 13l3.2 2" />
		</g>
	),
	// the sun on the horizon, on its way up
	dawn: () => (
		<g>
			<path d="M3.5 19.5h17" />
			<path d="M7.6 19.5a4.4 4.4 0 0 1 8.8 0" />
			<path d={rays(12, 19.5, 6.7, 8.7, [180, 225, 270, 315, 0])} />
			<path class="wg-rise" d="M9.8 6.6L12 4.4l2.2 2.2M12 4.6v4.6" />
		</g>
	),
	day: () => sun(),
	// and on its way down
	dusk: () => (
		<g>
			<path d="M3.5 19.5h17" />
			<path d="M7.6 19.5a4.4 4.4 0 0 1 8.8 0" />
			<path d={rays(12, 19.5, 6.7, 8.7, [180, 225, 315, 0])} />
			<path class="wg-set" d="M9.8 7L12 9.2 14.2 7M12 9V4.4" />
		</g>
	),
	night: () => (
		<g>
			<g transform="translate(-2.4 1.6)">
				{moon()}
			</g>
			<g class="wg-twinkle wg-solid">
				<path d="M18.6 4.2l.6 1.6 1.6.6-1.6.6-.6 1.6-.6-1.6-1.6-.6 1.6-.6z" />
				<path
					d="M21.2 11.4l.4 1 1 .4-1 .4-.4 1-.4-1-1-.4 1-.4z"
					style="animation-delay: -1.1s"
				/>
			</g>
		</g>
	),
};

/** Which picture goes with some weather: Environment Canada's kind of it, their words, and whether it's dark. */
export function glyphFor(
	kind: string,
	condition: string | null,
	intensity: string | null,
	night: boolean
) {
	const c = (condition ?? "").toLowerCase();
	switch (kind) {
		case "clear":
			return /mainly|mostly|few/.test(c)
				? night
					? "partly-night"
					: "partly"
				: night
					? "night"
					: "clear";
		case "cloudy":
			return /partly|mix of|few|clearing/.test(c)
				? night
					? "partly-night"
					: "partly"
				: "overcast";
		case "fog":
			return "fog";
		case "rain":
			return /drizzle/.test(c) || intensity === "light" ? "drizzle" : "rain";
		case "thunderstorm":
			return "storm";
		case "snow":
			return /blizzard|blowing|squall/.test(c)
				? "blizzard"
				: /flurr/.test(c) || intensity === "light"
					? "flurries"
					: "snow";
		case "mixed":
			return "mixed";
		case "ice":
			return /hail|pellet/.test(c) ? "hail" : "ice";
		default:
			return "overcast";
	}
}

/** A little picture of some weather or a time of day, by its name in the picker. */
export function weatherGlyph(name: string) {
	const picture = PICTURES[name];
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			class="weather-glyph"
			viewBox="0 0 24 26"
			fill="none"
			stroke="currentColor"
			stroke-width="1.5"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			{picture ? picture() : null}
		</svg>
	);
}
