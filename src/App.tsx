import { Component, createState, Stateful } from "dreamland/core";
import { Route, router, Router } from "dreamland/router";

import "./style.css";
import Homepage from "./pages/Homepage";
import NotFoundView from "./pages/404View";
import { projects } from "./Projects";
import ProjectView from "./pages/ProjectView";
import ProjectList from "./pages/ProjectList";
import { AboutView } from "./pages/AboutView";
import Oneko from "./Oneko";

let page: Stateful<{
	url?: string;
}> = createState({});

// declare global {
// 	interface Window {
// 		__bgMoveCleanup?: () => void;
// 	}
// }

const App: Component<{}, {}> = function (cx) {
	cx.init = () => {
		if (import.meta.env.SSR) {
			router.route(page.url, "http://127.0.0.1:5173");
		} else {
			router.route();
		}
	};

	cx.mount = () => {
		if (import.meta.env.SSR) {
			return;
		}
	};

	const routes = [
		{ path: undefined, show: <Homepage /> },
		{ path: "projects/index", show: <ProjectList /> },
		...projects.map((project) => ({
			path: `projects/${project.lastPathComponent}`,
			show: <ProjectView project={project} />,
		})),
		{ path: "siteinfo", show: <AboutView /> },
		{ path: "*", show: <NotFoundView /> },
	];

	return (
		<app id="app">
			<Router>
				{routes.map((route) => (
					<Route path={route.path} show={route.show} />
				))}
			</Router>
			<Oneko />
		</app>
	);
};

export default (path?: string) => {
	page.url = path;
	return <App />;
};
