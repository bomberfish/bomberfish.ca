// @ts-nocheck ts pmo

export interface MiniblogPost {
	id: string;
	year: string;
	month: string;
	day: string;
	number: string;
	path: string;
	preview: string;
	Content: any;
	orderKey: string;
}

const miniblogModules = import.meta.glob("./miniblog/*.mdx", {
	eager: true,
}) as Record<string, any>;

const miniblogRawModules = import.meta.glob("./miniblog/*.mdx", {
	eager: true,
	query: "?raw",
	import: "default",
}) as Record<string, string>;

const stagingMiniblogModules = import.meta.env.DEV
	? ((import.meta.glob("./miniblog/staging/*.mdx", {
			eager: true,
	  }) as Record<string, any>) ?? {})
	: {};

const stagingMiniblogRawModules = import.meta.env.DEV
	? ((import.meta.glob("./miniblog/staging/*.mdx", {
			eager: true,
			query: "?raw",
			import: "default",
	  }) as Record<string, string>) ?? {})
	: {};

const allMiniblogModules = {
	...miniblogModules,
	...stagingMiniblogModules,
};

const allMiniblogRawModules = {
	...miniblogRawModules,
	...stagingMiniblogRawModules,
};

const createPreview = (source: string) => {
	const normalized = source
		.replace(/^---[\s\S]*?---\s*/m, "")
		.replace(/^import\s+.+$/gm, "")
		.replace(/^export\s+const\s+\w+\s*=.+$/gm, "")
		.replace(/<[^>]*>/g, " ")
		.replace(/\s+/g, " ")
		.trim();

	return normalized.split(".")[0].slice(0, 80);
};

export const miniblogPosts = Object.entries(allMiniblogModules)
	.map(([path, mod]): MiniblogPost | null => {
		const match = path.match(/\/(\d{4})-(\d{2})-(\d{2})-(\d+)\.mdx$/);
		if (!match) return null;

		const [, year, month, day, number] = match;
		const id = `${year}-${month}-${day}-${number}`;
		const source = allMiniblogRawModules[path] || "";
		const preview = createPreview(source);
		const orderKey = `${year}${month}${day}${number.padStart(4, "0")}`;

		return {
			id,
			year,
			month,
			day,
			number,
			path: `/mini/${year}/${month}/${day}/${number}`,
			preview,
			Content: mod.default,
			orderKey,
		};
	})
	.filter((post): post is MiniblogPost => post !== null)
	.sort((a, b) => b.orderKey.localeCompare(a.orderKey));

export const miniblogYears = Array.from(
	new Set(miniblogPosts.map((post) => post.year))
).sort((a, b) => b.localeCompare(a));

export const miniblogMonths = Array.from(
	new Set(miniblogPosts.map((post) => post.month))
).sort((a, b) => a.localeCompare(b));

export const miniblogYearMonths = Array.from(
	new Set(miniblogPosts.map((post) => `${post.year}-${post.month}`))
)
	.map((value) => {
		const [year, month] = value.split("-");
		return { year, month };
	})
	.sort(
		(a, b) =>
			b.year.localeCompare(a.year) || b.month.localeCompare(a.month)
	);

export const miniblogYearMonthDays = Array.from(
	new Set(miniblogPosts.map((post) => `${post.year}-${post.month}-${post.day}`))
)
	.map((value) => {
		const [year, month, day] = value.split("-");
		return { year, month, day };
	})
	.sort(
		(a, b) =>
			b.year.localeCompare(a.year) ||
			b.month.localeCompare(a.month) ||
			b.day.localeCompare(a.day)
	);

export const miniblogPostsByRouteKey = new Map(
	miniblogPosts.map((post) => [
		`${post.year}/${post.month}/${post.day}/${post.number}`,
		post,
	])
);

export const getMiniblogPost = (
	year: string,
	month: string,
	day: string,
	number: string
) => miniblogPostsByRouteKey.get(`${year}/${month}/${day}/${number}`);

export const getMiniblogPosts = (year?: string, month?: string, day?: string) => {
	const normalizedYear = year === "*" ? undefined : year;
	const normalizedMonth = month === "*" ? undefined : month;

	return miniblogPosts.filter((post) => {
		if (normalizedYear && post.year !== normalizedYear) return false;
		if (normalizedMonth && post.month !== normalizedMonth) return false;
		if (day && post.day !== day) return false;
		return true;
	});
};
