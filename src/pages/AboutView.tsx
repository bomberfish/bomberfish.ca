import { Component, createState, css, Stateful } from "dreamland/core";
import Sidebar from "../components/Sidebar";

const archives = [
	{
		version: "v1.0",
		date: "20221208174845",
	},
	{
		version: "v2.0",
		date: "20230329131753",
	},
	{
		version: "v2.5",
		date: "20230601000329",
	},
	{
		version: "v3.0",
		date: "20231228101224",
	},
	{
		version: "v4.0",
		date: "20240215120000",
		origin: "https://bomberfish.neocities.org/",
	},
	{
		version: "v5.0",
		date: "20240510145230",
	},
	{
		version: "v5.1",
		date: "20240512001802",
	},
	{
		version: "v5.1.1",
		date: "20240711023745",
	},
	{
		version: "v5.2",
		date: "20240918135402",
	},
	{
		version: "v5.2.1",
		date: "20241007023446",
	},
	{
		version: "v5.2.2",
		date: "20250121010540",
	},
	{
		version: "v5.3",
		date: "20250330171906",
	},
	{
		version: "v5.4",
	},
	{
		version: "v5.4.1",
		date: "20251014143924id_",
	},
	{
		version: "v6.2.0",
		date: "20251031190526",
	},
	{
		version: "v7.0.3",
		date: "20251122233719",
	}, {
		version: "v8.0.0",
		date: "20251225232714"
	}
];

const colors = [
	"core",
	"mantle",
	"crust",
	"base",
	"surface0",
	"surface1",
	"surface2",
	"surface3",
	"surface4",
	"surface5",
	"surface6",
	"overlay0",
	"overlay1",
	"overlay2",
	"overlay3",
	"supertext",
	"text",
	"text1",
	"subtext0",
	"subtext1",
	"subtext2",
	"subtext3",
	"accent"
];

const brightColors = [
	"supertext",
	"text",
	"text1",
	"subtext0",
	"subtext1",
	"overlay3",
	"overlay2"
]

let aboutState: Stateful<{ customHue: string }> = createState({
	customHue: "210",
});

export const AboutView: Component<{}, {}> = function (cx) {
	
	cx.init = () => {
		if (import.meta.env.SSR) return;

		aboutState.customHue = getComputedStyle(document.documentElement).getPropertyValue('--main-hue') || "210";
		use(aboutState.customHue).listen((newHue) => {
			console.log("updating hue to", newHue);
			document.documentElement.style.setProperty('--main-hue', newHue);
		})
	};
	return (
		<main>
			<title>about – bomberfish.ca</title>
			<div class="layout-container">
				<Sidebar />
				<div class="main-content">
					<h2>about this website</h2>
					<p>
						i built this website using{" "}
						<a href="https://dreamland.js.org" target="_blank" rel="noopener">
							dreamland.js
						</a>
						, a small and utilitarian web framework with full reactivity.
					</p>
					<p>
						it's open-source under the MIT license, and
						you can view the source code{" "}
						<a
							href="https://github.com/bomberfish/bomberfish.ca"
							target="_blank"
							rel="noopener"
						>
							here
						</a>
						.
					</p>
					<p>the body font is Helvetica Now, and the monospace font is a custom variant of <a href="https://typeof.net/Iosevka/" target="_blank" rel="noopener noreferrer">Iosevka</a> i created for my own personal use.</p>
					<h2>archive of previous versions</h2>
					<p>
						versioning started with v6.0.0. previous versioning applied
						retroactively.
					</p>
					<ul class="compact">
						{archives.map((archive) => {
							if (!archive.date) {
								return <li>{archive.version} (no archived version exists)</li>;
							} else if (archive.date?.endsWith("id_")) {
								return (
									<li>
										<a
											href={`https://web.archive.org/web/${archive.date}/https://bomberfish.ca/`}
										>
											{archive.version}
										</a>{" "}
										(broken archive)
									</li>
								);
							} else {
								return (
									<li>
										<a
											href={`https://web.archive.org/web/${archive.date}/${archive.origin || "https://bomberfish.ca/"}`}
										>
											{archive.version}
										</a>
									</li>
								);
							}
						})}
					</ul>
					<input type="range" min="0" max="360" value={use(aboutState.customHue)} />
					<div class="swatches">
						{colors.map((color) => (
							<ColorSwatch color={color} />
						))}
					</div>
				</div>
			</div>
		</main>
	);
};

AboutView.style = css`
	.swatches {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-top: 1rem;
	}

	.main-content {
		width: 884px;
		width: clamp(584px, 40vw - 1rem, 884px);
		max-height: min(65vh, 50rem);
	}
`;

const ColorSwatch: Component<{ color: string }, {}> = function (cx) {
	let state: Stateful<{ value: string }> = createState({
		value: "",
	});

	cx.mount = () => {
		// updateValue();

		use(aboutState.customHue).listen(() => {
			updateValue();
		});

		window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
			updateValue();
		});
	}

	const updateValue = () => {
		if (import.meta.env.SSR) return;
		console.log("updating color swatch for", this.color);
		const computedStyle = getComputedStyle(document.documentElement);
		let val = computedStyle.getPropertyValue(`--${this.color}`).trim();
		console.log(val);
		let hsl = val.replaceAll(", ", ",").match(/hsl\(([^,]+),([^,]+)%,([^)]+)%\)/);
		if (hsl) {
			let [, hue, sat, lum] = hsl;
			console.log(hue, sat, lum);
			if (hue.includes("calc")) {
				hue = (0, eval)(hue.replace("calc", ""));
			}
			val = `hsl(${hue},${sat}%,${lum}%)`;
		}
		state.value = val;
	}

	return (
		<div
			class="swatch"
			style={`color: ${brightColors.includes(this.color) ? "var(--mantle)" : "var(--text)"};`}
		>
			<div class="preview" style={`background-color: var(--${this.color});`}></div>
			<span class="value">{use(state.value)}</span>
			<span class="label">{this.color}</span>
		</div>
	);
};

ColorSwatch.style = css`
	:scope {
		display: inline-flex;
		flex-direction: column;
		align-items: flex-end;
		justify-content: flex-end;
		width: 9rem;
		height: 9rem;
		position: relative;
		padding: 0.5rem;
		box-sizing: border-box;
	}

	.preview {
		position: absolute;
		inset: 0;
		z-index: -1;
	}

	.label,
	.value {
		font-family: var(--font-mono);
		text-align: right;
		line-height: 1.2;
		font-size: 0.75rem;
	}

	.label {
		font-weight: bold;
	}
`;