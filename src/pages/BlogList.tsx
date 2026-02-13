import { Component, css } from "dreamland/core";
import TransitionLink from "../components/TransitionLink";
import { ContactLinks } from "./Homepage";
import Sidebar from "../components/Sidebar";

interface BlogPost {
    slug: string;
    title: string;
    date: string;
    href?: string;
    description?: string;
    tags?: string[];
    image?: string;
}

const blogModules = import.meta.glob("../blog/*.mdx", { eager: true }) as Record<string, any>;

const mdxPosts = Object.entries(blogModules)
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
    // .filter((post) => post.slug !== "whitehouse");

// const manualPosts: BlogPost[] = [
//     {
//         slug: "whitehouse",
//         title: "Improving the White House Shutdown Clock",
//         description: "Redesigning and enhancing the White House’s official government shutdown clock.",
//         tags: ["Design", "Politics" , "Webdev"],
//         date: "2025-10-02",
//         href: "/blog/whitehouse.html",
//     },
// ];

const blogPosts: BlogPost[] = mdxPosts.sort((a, b) => b.date.localeCompare(a.date));

const BlogList: Component<{}, {}> = function () {
    return (
        <main>
            <title>blog – bomberfish.ca</title>
            <div class="layout-container">
                <Sidebar active="blog" />
                <div class="main-content">
                    <h1>blog</h1>
                    <p style="font-size: 1.05em;">rants about whatever's on my mind* and writeups on whatever i've been up to.</p>
                    <subt style="font-size: 0.95rem; color: var(--text1)">*obligatory disclaimer: all opinions are my own, and do not reflect those of my employer.</subt>
                    <p style="margin-bottom: 0; margin-top: 0.5rem;">
                        <subt style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.75rem; margin-bottom: 0;">
                        <span class="material-symbols">rss_feed</span>{" "}
                        Subscribe:{" "}
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
                        </subt>
                    </p>
                    <div class="blog-list">
                        {blogPosts.map((post) => (
                            <div class="blog-item">
                                {post.href ? (
                                    <a href={post.href} class="blog-link">
                                        <h3>{post.title}</h3>
                                        <time>{post.date}</time>
                                        {post.description ? <p class="post-desc">{post.description}</p> : null}
                                        {post.tags ? (
                                            <div class="post-tags">{post.tags.map((t) => <span class="tag">{t}</span>)}</div>
                                        ) : null}
                                        </a>
                                    ) : (
                                        <TransitionLink href={`/blog/${post.slug}`} class="blog-link">
                                        <h3>{post.title}</h3>
                                        <time>{post.date}</time>
                                        {post.description ? <p class="post-desc">{post.description}</p> : null}
                                        {post.tags ? (
                                            <div class="post-tags">
                                                <span class="material-symbols">label_important</span>
                                                {post.tags.map((t) => <span class="tag">{t}</span>)}
                                            </div>
                                        ) : null}
                                        </TransitionLink>
                                )}
                            </div>
                        ))}
                    </div>
                    <br/>
                    <span style="font-size: 0.9rem; color: var(--subtext1);"><span class="material-symbols">email</span>{" "}get in touch:{"    "}<ContactLinks /></span>
                </div>
            </div>
        </main>
    );
};

BlogList.style = css`
    p {
        margin: 0;
        margin-bottom: 0.5rem;
    }

    .main-content {
        width: 884px;
        width: clamp(584px, 40vw - 1rem, 884px);
		max-height: min(80vh, 70rem);
	}
`;

export default BlogList;
