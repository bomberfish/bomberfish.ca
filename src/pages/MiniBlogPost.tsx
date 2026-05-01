import { FC } from "dreamland/core";
import { getMiniblogPost } from "../miniblogPosts";

interface MiniBlogPostProps {
	year: string;
	month: string;
	day: string;
	number: string;
}

function MiniBlogPost(this: FC<MiniBlogPostProps>) {
	const post = getMiniblogPost(this.year, this.month, this.day, this.number);
	if (!post) {
		return (
			<article>
				<title>not found</title>
				<p>post not found.</p>
				<p>
					<a href="/mini">back to /mini</a>
				</p>
			</article>
		);
	}

	const PostContent = post.Content;
	const postPath = `/mini/${post.year}/${post.month}/${post.day}/${post.number}`;

	return (
		<article>
			<title>{`${postPath} – bomberfish.ca`}</title>
			<p>
                {"/ "}
				<a href="/mini">mini</a>
				{" / "}
				<a href={`/mini/${post.year}`}>{post.year}</a>
				{" / "}
				<a href={`/mini/${post.month}`}>{post.month}</a>
			</p>
			<PostContent />
		</article>
	);
}

export default MiniBlogPost;
