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
				<Route path="*" show={() => <NotFoundView />} />,
			]}
		/>
	);

	if (import.meta.env.SSR) {
		router.route(page.url, "http://127.0.0.1:5173");
	} else {
		router.route();
	}

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
