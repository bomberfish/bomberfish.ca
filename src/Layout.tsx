import { ComponentChild, FC } from "dreamland/core";
import { RouterState } from "dreamland/router";
import styleHref from "./style.css?url";
import InteractiveGrid from "./components/InteractiveGrid";

export default function Layout(
	this: FC<{ children?: ComponentChild; routerState?: RouterState }>
) {
	return (
		<div>
			<link rel="stylesheet" href={styleHref} />
			<InteractiveGrid />
			{this.routerState ? use(this.routerState.outlet) : this.children}
		</div>
	);
}
