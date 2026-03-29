// @ts-nocheck ts pmo
import { FC } from "dreamland/core";
import { Route, Router } from "dreamland/router";

import "./style.css";
import Homepage from "./pages/Homepage";
import { projects } from "./Projects";
import ProjectView from "./pages/ProjectView";
import ProjectList from "./pages/ProjectList";
import { AboutView } from "./pages/AboutView";
import NotFoundView from "./pages/NotFoundView";
import BlogList from "./pages/BlogList";
import BlogPost from "./pages/BlogPost";
import PhotoSphereTool from "./pages/PhotoSphereTool";
import Oneko from "./Oneko";
import InteractiveGrid from "./components/InteractiveGrid";

type AppProps = {
	initial?: [path: string, origin: string];
};

function App(this: FC<AppProps>) {
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

	return (
		<app id="app">
			<InteractiveGrid />
			<Router
				initial={this.initial}
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
					<Route path="tools/photosphere" show={() => <PhotoSphereTool />} />,
					<Route path="*" show={() => <NotFoundView />} />,
				]}
			/>
			<Oneko />
		</app>
	);
}

export default function renderApp(
	path?: string,
	origin = "http://127.0.0.1:5173"
) {
	return <App initial={path ? [path, origin] : undefined} />;
}
