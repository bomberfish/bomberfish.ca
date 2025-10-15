import { render } from "dreamland/ssr/server";
import App from "./App";

export { router } from "dreamland/router";
export default (path: string) => render(() => App(path));
