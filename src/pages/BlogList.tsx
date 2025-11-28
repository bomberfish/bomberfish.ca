import { Component, css } from "dreamland/core";
import Header from "../components/Header";
import TransitionLink from "../components/TransitionLink";

interface BlogPost {
    slug: string;
    title: string;
    date: string; // YYYY-MM-DD
    href?: string; // Optional direct URL (e.g., to static HTML)
    description?: string;
    tags?: string[];
    image?: string;
}

// Get all MDX-based blog posts (read metadata from module exports when available)
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
    // Exclude posts we want to handle manually as static pages
    .filter((post) => post.slug !== "whitehouse");

// Manually-added entries (non-MDX), e.g., prerendered static posts
const manualPosts: BlogPost[] = [
    {
        slug: "whitehouse",
        title: "Improving the White House Shutdown Clock",
        date: "2025-10-02",
        href: "/blog/whitehouse.html",
    },
];

const blogPosts: BlogPost[] = [...mdxPosts, ...manualPosts].sort((a, b) => b.date.localeCompare(a.date));

const BlogList: Component<{}, {}> = function () {
    return (
        <main>
            <title>blog – bomberfish.ca</title>
            <Header />
            <article>
                <h1>blog</h1>
                <p>articles about various projects and topics i'm working on.</p>
                <p>
                    <subt style="display: flex; align-items: center; gap: 0.5rem; margin-block: 0.75rem;">
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
                                    <h2>{post.title}</h2>
                                    <time>{post.date}</time>
                                    {post.description ? <p class="post-desc">{post.description}</p> : null}
                                    {post.tags ? (
                                        <div class="post-tags">{post.tags.map((t) => <span class="tag">{t}</span>)}</div>
                                    ) : null}
                                    </a>
                                ) : (
                                    <TransitionLink href={`/blog/${post.slug}`} class="blog-link">
                                    <h2>{post.title}</h2>
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
            </article>
        </main>
    );
};

BlogList.style = css`
article {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem 1rem;
}
`;

export default BlogList;
