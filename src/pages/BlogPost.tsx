import { Component, css } from "dreamland/core";
import Header from "../components/Header";
import { ContactLinks } from "./Homepage";

interface BlogPostProps {
slug: string;
}

const BlogPost: Component<BlogPostProps, {}> = function () {
	const slug = this.slug;
	const blogModules = import.meta.glob("../blog/*.mdx", { eager: true }) as Record<string, any>;

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
			<title>{postTitle} – bomberfish.ca</title>
			<Header />
			<article class="blog-content">
				<h1 class="post-title">{postTitle}</h1>
				{postDescription ? <p class="post-desc">{postDescription}</p> : null}
				{postTags ? (
					<div class="post-tags">
					<span class="material-symbols">label_important</span>
						{postTags.map((t) => <span class="tag">{t}</span>)}
					</div>
				) : null}
				<div class="post-body">
					<BlogContent />
				</div>
				<p>
                    <subt class="bottom">
                    <span class="material-symbols">rss_feed</span>{" "}
                    Liked this post? Subscribe to this blog:{" "}
                    <ul class="compact" style="display: inline; margin-left: 0.25rem;">
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
					<br />
					</subt>
					<subt class="bottom">
					<span class="material-symbols">email</span>{" "}
					Or, get in touch:{"    "}<ContactLinks />
					</subt>
                </p>
			</article>
		</main>
	);
};

BlogPost.style = css`
	subt.bottom {
		display: flex; align-items: center; gap: 0.5rem; margin-block: 0.75rem;
	}
`

export default BlogPost;
