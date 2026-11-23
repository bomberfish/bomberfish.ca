import { FC } from "dreamland/core";
import { Link, Page, PageHeader } from "../metro-dreamland";
import ContactLinks from "../components/ContactLinks";
import SiteNav, { Pivot } from "../components/SiteNav";
import Footer from "../components/Footer";
import { blogPosts, coverStyle, postDateParts } from "../lib/blog";

// The posts as a phone list: grouped by year (the squares are the jump
// list's), each row a date tile, on the post's cover if it has one, and
// the title, big and light, with its description and tags.
// Styles: "Blog" in src/style.css.
function BlogList(this: FC) {
	let lastYear = "";
	return (
		<Page kind="pivot">
			<title>blog – bomberfish.ca</title>
			<div class="layout-container">
				<SiteNav active="blog" />
				<div class="main-content">
					<PageHeader>
						<Pivot active="blog" />
						<p data-m-content data-m-feather>
							various assorted thoughts and ramblings. very infrequently updated
						</p>
					</PageHeader>
					<div data-m-content>
						<div class="blog-notes" data-m-feather>
							<subt>
								** obligatory disclaimer: all opinions are my own and do not
								reflect those of any employer, past, present, or future.
							</subt>
							<subt class="feeds">
								<span class="material-symbols">rss_feed</span> Subscribe:{" "}
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
							</subt>
						</div>
						<div class="blog-list">
							{blogPosts.map((post) => {
								const date = postDateParts(post.date);
								const newYear = date.year !== lastYear;
								lastYear = date.year;
								return (
									<>
										{newYear ? (
											<h2 class="blog-year" data-m-feather>
												{date.year}
											</h2>
										) : (
											false
										)}
										<div
											class={`blog-item ${post.image ? "has-cover" : ""}`}
											style={coverStyle(post.image)}
											data-m-feather
										>
											<Link
												href={`/blog/${post.slug}`}
												class="blog-link"
												data-m-nav="continuum"
												data-m-tilt
											>
												<time class="blog-date" datetime={post.date}>
													<b>{date.day}</b>
													<span>{date.month}</span>
												</time>
												<span class="blog-text">
													<h3 data-m-keep={`post:${post.slug}`}>
														{post.title}
													</h3>
													{post.description ? (
														<p class="post-desc">{post.description}</p>
													) : (
														false
													)}
													{post.tags ? (
														<span class="post-tags">
															<span class="material-symbols">
																label_important
															</span>
															{post.tags.map((t) => (
																<span class="tag">{t}</span>
															))}
														</span>
													) : (
														false
													)}
												</span>
											</Link>
										</div>
									</>
								);
							})}
						</div>
						<div class="post-end" data-m-feather>
							<span>
								<span class="material-symbols">email</span> get in touch:
								<ContactLinks />
							</span>
						</div>
					</div>
				</div>
				<div data-m-content>
					<Footer />
				</div>
			</div>
		</Page>
	);
}

export default BlogList;
