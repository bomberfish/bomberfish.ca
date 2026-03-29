import { render } from "dreamland/ssr/server";
import renderApp from "./App";

export { router } from "dreamland/router";
export default (path: string) => render(() => renderApp(path));
