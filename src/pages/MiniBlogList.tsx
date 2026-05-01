import { FC } from "dreamland/core";
import {
	getMiniblogPosts,
	miniblogMonths,
	miniblogYearMonths,
	miniblogYears,
} from "../miniblogPosts";

interface MiniBlogListProps {
	year?: string;
	month?: string;
}

function MiniBlogList(this: FC<MiniBlogListProps>) {
	const posts = getMiniblogPosts(this.year, this.month);
	const suffix =
		this.year && this.month
			? `/${this.year}/${this.month}`
			: this.year
				? `/${this.year}`
				: this.month
					? `/*/${this.month}`
					: "";

	return (
		<article>
			<title>{`mini${suffix} – bomberfish.ca`}</title>
            <p style="margin-bottom: 0;">
                {"/ "}
				<a href="/mini">mini</a>
                {this.year ? (
                        <span>
                            {" / "}
                            <a href={`/mini/${this.year}`}>{this.year}</a>

{this.month ? (
    <span>
    {" / "}
    <a href={`/mini/${this.month}`}>{this.month}</a>
    </span>
) : (
    <span> / *</span>
)}
                        </span>
                    ) : (
                        <span> / *</span>
                    )}
			</p>

            <p style="margin-top: 0;">
                {this.year && !this.month && (
                    <ul style="list-style: none; margin-top: 0; padding-left: 0; margin-left: 7.05rem;">
                        {miniblogMonths.map((month) => (
                            <li>
                                <a href={`/mini/${this.year}/${month}`}>{month}</a>
                            </li>
                        ))}
                    </ul>
                )}

                {!this.year && !this.month && (
                    <ul style="list-style: none; margin-top: 0; padding-left: 0; margin-left: 4.05rem;">
                        {miniblogYears.map((year) => (
                            <li>
                                <a href={`/mini/${year}`}>{year}</a>
                            </li>
                        ))}
                    </ul>
                )}
            </p>
            <p style="margin-bottom: 0;">you are here for a reason. no further clarification is required</p>
            <p style="font-size: 0.67em; margin-top: 0;">*** collections posted in bulk. last site build {__BUILD_DATE__}</p>

			<ol>
				{posts.map((post) => (
					<li>
						<a href={post.path}>{post.preview}</a>
					</li>
				))}
			</ol>
		</article>
	);
}

export default MiniBlogList;
