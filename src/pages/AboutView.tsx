import { Component } from "dreamland/core";
import Header from "../components/Header";

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
	}
];

export const AboutView: Component<{}, {}> = function () {
	return (
		<main>
			<Header />
			<article>
				<h2>about this website</h2>
				<p>
					i built this website using{" "}
					<a href="https://dreamland.js.org" target="_blank" rel="noopener">
						dreamland.js
					</a>
					, a small and utilitarian web framework. it leverages the ssg
					capabilities first introduced in version 0.1.0 to pre-render all pages at deploy time, and hydrate them with interactive components on the client side.
				</p>
				<p>
					bomberfish.ca is open-source under the MIT license, and
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
				<h2>archive of previous versions</h2>
				<p>
					versioning started with v6.0.0. previous versioning applied
					retroactively.
				</p>
				<ul>
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
			</article>
		</main>
	);
};
