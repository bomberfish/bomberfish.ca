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
					<a target="_self" href="/mini">back to /mini</a>
				</p>
			</article>
		);
	}

	const PostContent = post.Content;
	const postPath = `/mini/${post.year}/${post.month}/${post.day}/${post.number}`;

	return (
		<article>
			<title>{`${postPath} – bomberfish.ca`}</title>
			<table class="mini-nav-table">
				<tbody>
					<tr class="mini-path-row">
						<td class="mini-path-sep">/</td>
						<td class="mini-path-part">
							<a target="_self" href="/mini">mini</a>
						</td>
						<td class="mini-path-sep">/</td>
						<td class="mini-path-part">
							<a target="_self" href={`/mini/${post.year}`}>{post.year}</a>
						</td>
						<td class="mini-path-sep">/</td>
						<td class="mini-path-part">
							<a target="_self" href={`/mini/${post.year}/${post.month}`}>
								{post.month}
							</a>
						</td>
						<td class="mini-path-sep">/</td>
						<td class="mini-path-part">
							<a target="_self" href={`/mini/${post.year}/${post.month}/${post.day}`}>
								{post.day}
							</a>
						</td>
						<td class="mini-path-sep">/</td>
						<td class="mini-path-part">
							<span>{post.number}</span>
						</td>
					</tr>
				</tbody>
			</table>
			<PostContent />
		</article>
	);
}

export default MiniBlogPost;
