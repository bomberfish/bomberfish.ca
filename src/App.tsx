// @ts-nocheck ts pmo
import { FC } from "dreamland/core";
import { Route, Router } from "dreamland/router";

import Layout from "./Layout";
import Homepage from "./pages/Homepage";
import { projects } from "./Projects";
import ProjectView from "./pages/ProjectView";
import ProjectList from "./pages/ProjectList";
import { AboutView } from "./pages/AboutView";
import NotFoundView from "./pages/NotFoundView";
import BlogList from "./pages/BlogList";
import BlogPost from "./pages/BlogPost";
import PhotoSphereTool from "./pages/PhotoSphereTool";
import MiniBlogLayout from "./pages/MiniBlogLayout";
import MiniBlogList from "./pages/MiniBlogList";
import MiniBlogPost from "./pages/MiniBlogPost";
import {
	miniblogMonths,
	miniblogPosts,
	miniblogYearMonthDays,
	miniblogYearMonths,
	miniblogYears,
} from "./miniblogPosts";
import Oneko from "./components/Oneko";

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

	const miniYears = Array.isArray(miniblogYears) ? miniblogYears : [];
	const miniYearMonths = Array.isArray(miniblogYearMonths)
		? miniblogYearMonths
		: [];
	const miniYearMonthDays = Array.isArray(miniblogYearMonthDays)
		? miniblogYearMonthDays
		: [];
	const miniMonths = Array.isArray(miniblogMonths) ? miniblogMonths : [];
	const miniPosts = Array.isArray(miniblogPosts) ? miniblogPosts : [];

	return (
		<app id="app">
			<Router
				initial={this.initial}
				>
					<Route
						path="mini"
						layout={MiniBlogLayout}
						children={[
							<Route show={() => <MiniBlogList />} />,
							...miniYears.map((year) => (
								<Route path={year} show={() => <MiniBlogList year={year} />} />
							)),
							...miniYearMonths.map(({ year, month }) => (
								<Route
									path={`${year}/${month}`}
									show={() => <MiniBlogList year={year} month={month} />}
								/>
							)),
							...miniYearMonthDays.map(({ year, month, day }) => (
								<Route
									path={`${year}/${month}/${day}`}
									show={() => <MiniBlogList year={year} month={month} day={day} />}
								/>
							)),
							...miniMonths.map((month) => (
								<Route
									path={`:wildcardYear/${month}`}
									show={() => <MiniBlogList year="*" month={month} />}
								/>
							)),
							...miniPosts.map((post) => (
								<Route
									path={`${post.year}/${post.month}/${post.day}/${post.number}`}
									show={() => (
										<MiniBlogPost
											year={post.year}
											month={post.month}
											day={post.day}
											number={post.number}
										/>
									)}
								/>
							)),
						]}
					/>
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
									path={`blog/${post.slug}`}
									show={() => <BlogPost slug={post.slug} />} />
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
