// @ts-nocheck ts pmo
import { Component, createState, Stateful } from "dreamland/core";
import { Route, router, Router } from "dreamland/router";

import "./style.css";
import Homepage from "./pages/Homepage";
import NotFoundView from "./pages/404View";
import { projects } from "./Projects";
import ProjectView from "./pages/ProjectView";
import ProjectList from "./pages/ProjectList";
import { AboutView } from "./pages/AboutView";
import BlogList from "./pages/BlogList";
import BlogPost from "./pages/BlogPost";
import Oneko from "./Oneko";

let page: Stateful<{
	url?: string;
}> = createState({});

declare global {
	interface Window {
		__bgMoveCleanup?: () => void;
	}
}

const App: Component<{}, {}> = function (cx) {
	
	const blogModules = import.meta.glob("./blog/*.mdx", { eager: true });
	const blogPosts = Object.keys(blogModules)
		.map((path) => {
			const match = path.match(/\/(\d{4}-\d{2}-\d{2})-(.+)\.mdx$/);
			if (!match) return null;
			const [, , slug] = match;
			return { slug };
		})
		.filter((p) => p !== null) as { slug: string }[];

	blogPosts.sort((a, b) => b.slug.localeCompare(a.slug));

	const routerInstance = (
		<Router
			children={[
				<Route path="" show={() => <Homepage />} />,
				<Route path="projects" show={() => <ProjectList />} />,
				...projects.map((project) => (
					<Route
						path={`projects/${project.lastPathComponent}`}
						show={() => <ProjectView project={project} />}
					/>
				)),
				<Route path="blog" show={() => <BlogList />} />,
				...blogPosts.map((post) => (
					<Route
						path={`blog/${post.slug}`}
						show={() => <BlogPost slug={post.slug} />}
					/>
				)),
				<Route path="siteinfo" show={() => <AboutView />} />,
				// <Route path="*" show={() => <NotFoundView />} />,
			]}
		/>
	);

	if (import.meta.env.SSR) {
		router.route(page.url, "http://127.0.0.1:5173");
	} else {
		router.route();
	}

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
				const obedience = 0.025;
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
			targetX = event.clientX / 6;
			targetY = event.clientY / 6;
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

	return (
		<app id="app">
			{routerInstance}
			<Oneko />
		</app>
	);
};

export default (path?: string) => {
	page.url = path;
	return <App />;
};
