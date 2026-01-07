import { Component, css } from "dreamland/core";
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
	"base",
	"surface0",
	"surface1",
	"surface2",
	"surface3",
	"overlay0",
	"overlay1",
	"overlay2",
	"overlay3",
	"supertext",
	"text",
	"subtext0",
	"subtext1",
	"subtext2",
	"subtext3",
	"accent"
];

export const AboutView: Component<{}, {}> = function () {
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
					<p>the body font is Helvetica Now, and the monospace font is a custom variant of <a href="https://typeof.net/Iosevka/" target="_blank" rel="noopener noreferrer">Iosevka</a> i created for my own use.</p>
					<p>the background pulls images from <a href="https://picsum.photos" target="_blank" rel="noopener noreferrer">Lorem Picsum</a> and applies Atkinson dithering as described in <a href="https://beyondloom.com/blog/dither.html" target="_blank" rel="noopener noreferrer">this blogpost</a>.</p>
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
`;

const ColorSwatch: Component<{ color: string }, { value: string }> = function (cx) {
	this.value = "";
	cx.mount = () => {
		this.value = document.documentElement.style.getPropertyValue(`--${this.color}-hsl`);
	}
	return (
		<div
			class="swatch"
			style={`color: ${this.color.endsWith("text") ? "black" : "white"};`}
		>
			<div class="preview" style={`background-color: var(--${this.color});`}></div>
			<span class="label">{this.color}</span>
			{/* <span class="value">hsl {use(this.value)}</span> */}
		</div>
	);
};

ColorSwatch.style = css`
	.swatch {
		display: inline-flex;
		flex-direction: column;
		align-items: flex-end;
		justify-content: flex-end;
		width: 100px;
		height: 100px;
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