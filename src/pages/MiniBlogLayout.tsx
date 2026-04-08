import { FC, css } from "dreamland/core";
import { RouterState } from "dreamland/router";
import { WebButton } from "../components/Buttons";

export default function MiniBlogLayout(this: FC<{ routerState: RouterState }>) {
	return <article>
		<section>
			{use(this.routerState.outlet)}
			<footer>
				<WebButton
					src="/button.gif"
					href="/?ref=button"
					title="back"
				/>
			</footer>
		</section>
	</article>;
}

MiniBlogLayout.style = css`
	:scope {
		font-family: var(--font-mono), "IosevkaFishQuasi", monospace, var(--font-emoji), "Noto Emoji";
		line-height: 1.6;
        /* background: #f4f4f4; */
        color: #303030;
        color: #132526ed;
        text-shadow: 0 -0.5px 0 #00000020;
        accent-color: #339099;
		background: #edf1f0;
		margin: 0;
		padding: 0;
		min-height: 100vh;
	}

	:scope :global(::selection) {
		background: #33909980;
		color: #132526;	
	}

	:scope :global(section) {
		width: min(46rem, 100%);
		margin-inline: auto;
		padding: 1rem;
	}

	:scope :global(h1),
	:scope :global(h2),
	:scope :global(h3) {
		line-height: 1.2;
	}

	:scope :global(.mini-nav-table) {
		border-collapse: collapse;
		margin-bottom: 0.35rem;
	}

	:scope :global(.mini-nav-table td) {
		vertical-align: top;
		padding: 0;
	}

	:scope :global(.mini-path-row td) {
		white-space: nowrap;
	}

	:scope :global(.mini-path-sep) {
		padding-inline: 0.35rem !important;
	}

	:scope :global(.mini-path-sep:first-child) {
		padding-left: 0 !important;
	}

	:scope :global(.mini-path-ghost) {
		color: transparent;
		text-shadow: none;
		user-select: none;
	}

	:scope :global(.mini-filter-row td) {
		padding-top: 0.1rem;
	}

	:scope :global(.mini-filter-cell) {
		padding-left: 0 !important;
	}

	:scope :global(.mini-filter-list) {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	:scope :global(.mini-note) {
		margin-bottom: 0;
	}

	:scope :global(.mini-meta) {
		font-size: 0.67em;
		margin-top: 0;
	}

	:scope :global(a),
	:scope :global(a:visited) {
		color: #2a7e85;
	}
`;
