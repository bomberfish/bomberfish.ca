import { FC } from "dreamland/core";
import { Route, Router } from "dreamland/router";

import Layout from "./Layout";
import { projects } from "./Projects";
import Homepage from "./pages/Homepage";
import ProjectView from "./pages/ProjectView";
import ProjectList from "./pages/ProjectList";
import { AboutView } from "./pages/AboutView";
import NotFoundView from "./pages/NotFoundView";
import BlogList from "./pages/BlogList";
import BlogPost from "./pages/BlogPost";
import PhotoSphereTool from "./pages/PhotoSphereTool";
import { getBlogMetadata, type BlogModule } from "./lib/blog";

type AppProps = {
	initial?: [path: string, origin: string];
};

function App(this: FC<AppProps>) {
	const blogModules = import.meta.glob<BlogModule>(
		["./blog/*.mdx", "!./blog/draft-*.mdx"],
		{ eager: true }
	);
	const blogPosts = Object.entries(blogModules)
		.map(([path, module]) => {
			const metadata = getBlogMetadata(path, module);
			return metadata ? { metadata, module } : null;
		})
		.filter((post): post is NonNullable<typeof post> => post !== null);

	return (
		<app id="app">
			<Router initial={this.initial}>
				<Route path="tools/photosphere" show={() => <PhotoSphereTool />} />
				<Route
					layout={Layout}
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
								path={`blog/${post.metadata.slug}`}
								show={() => (
									<BlogPost module={post.module} metadata={post.metadata} />
								)}
							/>
						)),
						<Route path="siteinfo" show={() => <AboutView />} />,
						<Route path="*" show={() => <NotFoundView />} />,
					]}
				/>
			</Router>
		</app>
	);
}

export default function renderApp(
	path?: string,
	origin = "http://127.0.0.1:5173"
) {
	return <App initial={path ? [path, origin] : undefined} />;
}
