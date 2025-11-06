// Get all blog posts
const blogModules = import.meta.glob("./blog/*.mdx", { eager: true });

export const blogSlugs = Object.keys(blogModules)
.map((path) => {
const match = path.match(/\/(\d{4}-\d{2}-\d{2})-(.+)\.mdx$/);
if (!match) return null;
return match[2]; // Return the slug
})
.filter((slug): slug is string => slug !== null);
