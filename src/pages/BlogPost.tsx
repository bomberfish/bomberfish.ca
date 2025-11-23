import { Component, css } from "dreamland/core";
import Header from "../components/Header";

interface BlogPostProps {
slug: string;
}

const BlogPost: Component<BlogPostProps, {}> = function () {
	const slug = this.slug;
	const blogModules = import.meta.glob("../blog/*.mdx", { eager: true }) as Record<string, any>;

	if (slug === "whitehouse") {
		return (
			<main>
				<Header />
				<article>
					<h1>Blog Post Not Found</h1>
					<p>
						This post is available as a static page. Open it directly: <a href="/blog/whitehouse.html">/blog/whitehouse.html</a>
					</p>
				</article>
			</main>
		);
	}

	const matchingPath = Object.keys(blogModules).find((path) => path.includes(`-${slug}.mdx`));

	if (!matchingPath) {
		return (
			<main>
				<Header />
				<article>
					<h1>Blog Post Not Found</h1>
					<p>The blog post you're looking for doesn't exist.</p>
				</article>
			</main>
		);
	}


	const BlogContent = (blogModules[matchingPath] as any).default;

	const meta = (blogModules[matchingPath] as any) || {};
	const postTitle: string =
		meta.title ||
		slug
			.split("-")
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(" ");
	const postTags: string[] | undefined = meta.tags;
	const postDescription: string | undefined = meta.description;
	return (
		<main>
			<Header />
			<article class="blog-content">
				<h1 class="post-title">{postTitle}</h1>
				{postDescription ? <p class="post-desc">{postDescription}</p> : null}
				{postTags ? (
					<div class="post-tags">{postTags.map((t) => <span class="tag">{t}</span>)}</div>
				) : null}
				<div class="post-body">
					<BlogContent />
				</div>
			</article>
		</main>
	);
};

BlogPost.style = css`
article.blog-content {
	max-width: 800px;
	margin: 0 auto;
	padding: 2rem 1rem;
	line-height: 1.6;
}

article.blog-content .post-title {
	margin-top: 0;
	margin-bottom: 0.75rem;
}

article.blog-content h1 {
	margin-top: 0;
}

article.blog-content .post-body {
	margin-top: 1.5rem;
}

article.blog-content .post-body h1:first-of-type {
	display: none;
}

article.blog-content h2 {
	margin-top: 2rem;
}

article.blog-content img {
max-width: 100%;
height: auto;
}

article.blog-content blockquote {
	border-left: 4px solid var(--border);
	padding-left: 1rem;
	margin-left: 0;
	font-style: italic;
}

.post-desc {
	color: var(--subtext1);
	margin-top: 0.5rem;
}

.post-tags {
	display: flex;
	gap: 0.5rem;
	margin-bottom: 0.5rem;
}

.post-tags .tag {
	background: var(--tag-bg);
	color: var(--supertext);
	padding: 0.15rem 0.5rem;
	border-radius: 999px;
	font-size: 0.85rem;
}
`;

export default BlogPost;
