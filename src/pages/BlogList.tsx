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
            <Header />
            <article>
                <h1>blog</h1>
                <p>articles about various projects and topics i'm working on.</p>
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
                                        <div class="post-tags">{post.tags.map((t) => <span class="tag">{t}</span>)}</div>
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

.blog-list {
margin-top: 2rem;
display: flex;
flex-direction: column;
gap: 1.5rem;
}

.blog-item {
border-bottom: 1px solid var(--border, #ccc);
padding-bottom: 1rem;
}

.blog-link {
text-decoration: none;
color: inherit;
display: block;
}

.blog-link:hover h2 {
    text-decoration: underline;
	text-decoration-color: var(--subtext1) !important;
}

.blog-item h2 {
margin: 0 0 0.5rem 0;
font-size: 1.5rem;
}

.blog-item time {
color: var(--text-secondary, #666);
font-size: 0.9rem;
}

.post-desc {
    margin: 0.5rem 0 0 0;
    color: var(--text-secondary, #444);
}

.post-tags {
    margin-top: 0.5rem;
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
}

.post-tags .tag {
    background: var(--tag-bg, #eee);
    color: var(--tag-color, #333);
    padding: 0.15rem 0.5rem;
    border-radius: 999px;
    font-size: 0.8rem;
}
`;

export default BlogList;
