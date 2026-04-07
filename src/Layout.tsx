import {ComponentChild, FC} from "dreamland/core";
import { RouterState } from "dreamland/router";
import styleHref from "./style.css?url";
import InteractiveGrid from "./components/InteractiveGrid";
import Oneko from "./components/Oneko";

export default function Layout(this: FC<{children?: ComponentChild; routerState?: RouterState}>) {
    return (
        <div class="layout-root">
            <link rel="stylesheet" href={styleHref} />
            <InteractiveGrid />
            {this.routerState ? use(this.routerState.outlet) : this.children}
			<Oneko />
        </div>
    );
}