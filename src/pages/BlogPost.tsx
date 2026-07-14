import { FC, css } from "dreamland/core";
import ContactLinks from "../components/ContactLinks";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Pic from "../components/Pic";
import type { BlogModule, BlogPostMetadata } from "../lib/blog";

// MDX component overrides — `img` is intercepted so every markdown
// `![alt](path)` and JSX `<img>` inside a blog post is rendered as a
// `<picture>` with a WebP `<source>` and a JPEG fallback.
const mdxComponents = { img: Pic };

interface BlogPostProps {
	module: BlogModule;
	metadata: BlogPostMetadata;
}

function BlogPost(this: FC<BlogPostProps>) {
	const BlogContent = this.module.default;
	const { title, tags, description } = this.metadata;
	return (
		<main>
			<title>{title} – bomberfish.ca</title>
			<div class="layout-container">
				<Navbar active="blog" />
				<div class="main-content">
					<article class="blog-content">
						<div class="page-header">
							<h1 class="post-title">{title}</h1>
							{description ? <p class="post-desc">{description}</p> : false}
							{tags ? (
								<div class="post-tags">
									<span class="material-symbols">label_important</span>
									{tags.map((t) => (
										<span class="tag">{t}</span>
									))}
								</div>
							) : (
								false
							)}
						</div>
						<div class="post-body background-container">
							<BlogContent components={mdxComponents} />
						</div>
						<p class="background-container" style="margin-bottom: 0!important;">
							<subt class="bottom">
								<span class="material-symbols">rss_feed</span> Liked this post?
								Subscribe to my blog:{" "}
								<ul
									class="compact"
									style="display: inline; margin-left: 0.25rem;"
								>
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
							<subt class="bottom ">
								<span class="material-symbols">email</span> Or, get in touch:
								{"    "}
								<ContactLinks />
							</subt>
						</p>
					</article>
				</div>
				<Footer />
			</div>
		</main>
	);
}

BlogPost.style = css`
	subt.bottom {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-block: 0.75rem;
	}
`;

export default BlogPost;
