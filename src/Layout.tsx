import {ComponentChild, FC} from "dreamland/core";
import { RouterState } from "dreamland/router";
import "./style.css";
import InteractiveGrid from "./components/InteractiveGrid";

export default function Layout(this: FC<{children?: ComponentChild; routerState?: RouterState}>) {
    return (
        <div class="layout-root">
            <InteractiveGrid />
            {this.routerState ? use(this.routerState.outlet) : this.children}
        </div>
    );
}