import { Component, createState, Stateful } from "dreamland/core";
import { Route, router, Router } from "dreamland/router";

import "./style.css";
import Homepage from "./pages/Homepage";
import NotFoundView from "./pages/404View";
import { projects } from "./Projects";
import ProjectView from "./pages/ProjectView";
import ProjectList from "./pages/ProjectList";
import { AboutView } from "./pages/AboutView";

let page: Stateful<{
	url?: string;
}> = createState({});

declare global {
	interface Window {
		__bgMoveCleanup?: () => void;
	}
}

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

		window.__bgMoveCleanup?.();

		const root = document.documentElement;
		const reduceMotionQuery = window.matchMedia(
			"(prefers-reduced-motion: reduce)"
		);
		let posX = window.innerWidth / 10;
		let posY = window.innerHeight / 10;
		let targetX = posX;
		let targetY = posY;
		let velX = 0;
		let velY = 0;
		let rafId = 0;

		const updateCssVars = () => {
			root.style.setProperty("--bgmoveX", `${posX}px`);
			root.style.setProperty("--bgmoveY", `${posY}px`);
		};

		const resetPosition = () => {
			posX = window.innerWidth / 10;
			posY = window.innerHeight / 10;
			targetX = posX;
			targetY = posY;
			updateCssVars();
		};

		const step = () => {
			if (!reduceMotionQuery.matches) {
				const obedience = 0.05;
				velX = obedience * (targetX - posX);
				velY = obedience * (targetY - posY);
				posX += velX;
				posY += velY;
				updateCssVars();
			}
			rafId = window.requestAnimationFrame(step);
		};

		const handlePointerMove = (event: PointerEvent) => {
			if (reduceMotionQuery.matches) {
				return;
			}
			targetX = event.clientX / 4;
			targetY = event.clientY / 4;
		};

		const handleResize = () => {
			resetPosition();
		};

		const handleMotionPreferenceChange = () => {
			if (reduceMotionQuery.matches) {
				resetPosition();
			}
		};

		document.addEventListener("pointermove", handlePointerMove, {
			passive: true,
		});
		window.addEventListener("resize", handleResize);
		if (reduceMotionQuery.addEventListener) {
			reduceMotionQuery.addEventListener(
				"change",
				handleMotionPreferenceChange
			);
		} else if (reduceMotionQuery.addListener) {
			reduceMotionQuery.addListener(handleMotionPreferenceChange);
		}

		resetPosition();
		rafId = window.requestAnimationFrame(step);

		window.__bgMoveCleanup = () => {
			document.removeEventListener("pointermove", handlePointerMove);
			window.removeEventListener("resize", handleResize);
			reduceMotionQuery.removeEventListener(
				"change",
				handleMotionPreferenceChange
			);
			window.cancelAnimationFrame(rafId);
			window.__bgMoveCleanup = undefined;
		};
	};

	const routes = [
		{ path: undefined, show: <Homepage /> },
		{ path: "member", show: <NotFoundView /> },
		{ path: "projects", show: <ProjectList /> },
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
		</app>
	);
};

export default (path?: string) => {
	page.url = path;
	return <App />;
};
