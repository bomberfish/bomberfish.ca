import { Component, css } from "dreamland/core";
import Header from "../components/Header";
import TransitionLink from "../components/TransitionLink";
import { ContactLinks } from "./Homepage";

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
    .filter((post) => post.slug !== "whitehouse");

const manualPosts: BlogPost[] = [
    {
        slug: "whitehouse",
        title: "Improving the White House Shutdown Clock",
        description: "Redesigning and enhancing the White House’s official government shutdown clock.",
        tags: ["Design", "Politics" , "Webdev"],
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
                <p style="font-size: 1.05em;">articles about various projects i'm working on, along with an occasional rant or two.</p>
                <subt style="font-size: 0.95rem; color: var(--text1)">(**obligatory disclaimer: all opinions are my own, and do not reflect those of my employer.)</subt>
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
            </article>
        </main>
    );
};

BlogList.style = css`
article {
    max-width: 960px;
    margin: 0 auto;
    padding: 2rem 1rem;
}

p {
    line-height: 1.8;
}
`;

export default BlogList;
