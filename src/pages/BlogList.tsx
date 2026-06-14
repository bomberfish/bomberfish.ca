import { FC, css } from "dreamland/core";
import TransitionLink from "../components/TransitionLink";
import { ContactLinks } from "./Homepage";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

interface BlogPost {
	slug: string;
	title: string;
	date: string;
	description?: string;
	tags?: string[];
	image?: string;
}

const blogModules = import.meta.glob("../blog/*.mdx", {
	eager: true,
}) as Record<string, any>;

const blogPosts = Object.entries(blogModules)
	.map(([path, mod]): BlogPost | null => {
		const match = path.match(/\/(\d{4}-\d{2}-\d{2})-(.+)\.mdx$/);
		if (!match) return null;

		const [, date, slug] = match;
		const computedTitle = slug
			.split("-")
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(" ");

		const title = (mod && (mod.title as string)) || computedTitle;
		const description = (mod && mod.description) || undefined;
		const tags = (mod && mod.tags) || undefined;
		const image = (mod && mod.image) || undefined;

		return { slug, title, date, description, tags, image };
	})
	.filter((post): post is BlogPost => post !== null)
	.sort((a, b) => b.date.localeCompare(a.date));

function BlogList(this: FC) {
	return (
		<main>
			<title>blog – bomberfish.ca</title>
			<div class="layout-container">
				<Navbar active="blog" />
				<div class="main-content">
					<div class="page-header">
						<h1>blog</h1>
						<p>
							various assorted thoughts and ramblings.
						</p>
					</div>
					<div class="background-container" style="margin-top: 0.5rem;">
						<subt style="font-size: 0.95rem; color: var(--text1)">
							** obligatory disclaimer: all opinions are my own and do not reflect
							those of any employer, past, present, or future.
						</subt>
						<span style="margin-bottom: 0; margin-top: 0.5rem;">
							<subt style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.25rem; margin-bottom: 0;">
								<span class="material-symbols">rss_feed</span> Subscribe:{" "}
								<ul
									class="compact"
									style="display: inline; margin-left: 0.25rem; transform: translateY(-2px);"
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
							</subt>
						</span>
					</div>
					<div class="blog-list">
						{blogPosts.map((post) => {
							// Build inline CSS vars for the cover background. Pseudo-
							// elements can't be styled inline, so the actual rule lives
							// in style.css and reads these vars. We always set
							// `--cover-image` as a plain url() (the JPEG fallback) and,
							// when the cover is a JPEG, also set `--cover-image-set` to
							// an image-set() that prefers the WebP sibling. The CSS
							// uses the latter behind @supports so browsers without
							// image-set() type-hint support quietly stick to the JPEG.
							const coverStyle = (() => {
								if (!post.image) return undefined;
								const style: Record<string, string> = {
									"--cover-image": `url("${post.image}")`,
								};
								const jpegMatch = post.image.match(/\.jpe?g(?:[?#]|$)/i);
								if (jpegMatch) {
									const webp = post.image.replace(
										/\.jpe?g(?=[?#]|$)/i,
										".webp"
									);
									style["--cover-image-set"] =
										`image-set(url("${webp}") type("image/webp"), url("${post.image}") type("image/jpeg"))`;
								}
								return style;
							})();
							return (
								<div
									class={`blog-item ${post.image ? "has-cover" : ""}`}
									style={coverStyle}
								>
									<TransitionLink href={`/blog/${post.slug}`} class="blog-link">
										<h3>{post.title}</h3>
										{post.description ? (
											<p class="post-desc">{post.description}</p>
										) : (
											false
										)}
										<div class="post-footer">
											{post.tags ? (
												<div class="post-tags">
													<span class="material-symbols">label_important</span>
													{post.tags.map((t) => (
														<span class="tag">{t}</span>
													))}
												</div>
											) : (
												<div />
											)}
											<time>{post.date}</time>
										</div>
									</TransitionLink>
								</div>
							);
						})}
					</div>
					<br />
					<span style="font-size: 0.9rem; color: var(--subtext1);">
						<span class="material-symbols">email</span> get in touch:{"    "}
						<ContactLinks />
					</span>
				</div>
				<Footer />
			</div>
		</main>
	);
}

BlogList.style = css`
	p {
		margin: 0;
		margin-bottom: 0.5rem;
	}

	a.to-mini {
		text-decoration: none;
		font-size: 0.9em;
	}

	.post-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: auto;
	}
`;

export default BlogList;
