import { FC, css } from "dreamland/core";
import { RouterState } from "dreamland/router";

export default function MiniBlogLayout(this: FC<{ routerState: RouterState }>) {
	return <section>{use(this.routerState.outlet)}</section>;
}

MiniBlogLayout.style = css`
	:scope {
		width: min(46rem, 100%);
		margin-inline: auto;
		padding: 1rem;
		font-family: var(--font-mono), "IosevkaFishQuasi", monospace, var(--font-emoji), "Noto Emoji";
		line-height: 1.6;
        /* background: #f4f4f4; */
        color: #303030;
        color: #000000c0;
        text-shadow: 0 -0.5px 0 #00000020;
        accent-color: #339099;
	}

    h1,h2,h3{line-height:1.2}
`;
