import { Page, PageHeader } from "../metro-dreamland";
import { FC } from "dreamland/core";
import ContactLinks from "../components/ContactLinks";
import SiteNav from "../components/SiteNav";
import Footer from "../components/Footer";
import Pic from "../components/Pic";
import {
	formatPostDate,
	type BlogModule,
	type BlogPostMetadata,
} from "../lib/blog";

// MDX component overrides — `img` is intercepted so every markdown
// `![alt](path)` and JSX `<img>` inside a blog post is rendered as a
// `<picture>` with a WebP `<source>` and a JPEG fallback.
const mdxComponents = { img: Pic };

interface BlogPostProps {
	module: BlogModule;
	metadata: BlogPostMetadata;
}

// Styles: "Blog" in src/style.css.
function BlogPost(this: FC<BlogPostProps>) {
	const BlogContent = this.module.default;
	const { title, tags, description, date, slug } = this.metadata;
	return (
		<Page kind="page">
			<title>{title} – bomberfish.ca</title>
			<div class="layout-container">
				<SiteNav active="blog" inside />
				<div class="main-content">
					{/* A post: when and what about over its title, the one-line
					    of it under; then the post in a column the width a line
					    reads well at, and beside it (under it, on anything
					    narrow) what there is to do next, which stays in view as
					    the post scrolls. */}
					<article class="blog-content">
						<PageHeader class="post-header">
							<p class="post-kicker" data-m-feather>
								<time datetime={date}>{formatPostDate(date)}</time>
								{tags?.map((t) => (
									<span class="tag">{t}</span>
								))}
							</p>
							{/* (the same title as in the list it was tapped in: it stays
							    on screen and travels here. data-m-keep, continuum) */}
							<h1
								class="post-title"
								data-m-feather
								data-m-keep={`post:${slug}`}
							>
								{title}
							</h1>
							{description ? (
								<p class="post-desc" data-m-feather>
									{description}
								</p>
							) : (
								false
							)}
						</PageHeader>
						<div class="post-columns">
							<div class="post-body background-container" data-m-feather>
								<BlogContent components={mdxComponents} />
							</div>
							<aside class="post-aside" data-m-feather>
								<div class="post-end">
									<span>
										<span class="material-symbols">rss_feed</span> Liked this
										post? Subscribe to my blog:
										<ul class="compact">
											<li>
												<a href="/feed.xml" target="_blank">
													RSS
												</a>
											</li>
											<li>
												<a href="/atom.xml" target="_blank">
													Atom
												</a>
											</li>
											<li>
												<a href="/feed.json" target="_blank">
													JSON Feed
												</a>
											</li>
										</ul>
									</span>
									<span>
										<span class="material-symbols">email</span> Or, get in
										touch:
										<ContactLinks />
									</span>
								</div>
							</aside>
						</div>
					</article>
				</div>
				<Footer />
			</div>
		</Page>
	);
}

export default BlogPost;
