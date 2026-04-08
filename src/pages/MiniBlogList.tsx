import { FC } from "dreamland/core";
import {
	getMiniblogPosts,
	miniblogMonths,
	miniblogYears,
} from "../miniblogPosts";

interface MiniBlogListProps {
	year?: string;
	month?: string;
    day?: string;
}

function MiniBlogList(this: FC<MiniBlogListProps>) {
    const posts = getMiniblogPosts(this.year, this.month, this.day);
    const days = Array.from(new Set(posts.map((post) => post.day))).sort((a, b) =>
        b.localeCompare(a)
    );
    const monthPath = this.month
        ? this.year && this.year !== "*"
            ? `/mini/${this.year}/${this.month}`
            : `/mini/*/${this.month}`
        : "";
	const suffix =
        this.year && this.month && this.day
            ? `/${this.year}/${this.month}/${this.day}`
            : this.year && this.month
                ? `/${this.year}/${this.month}`
			: this.year
				? `/${this.year}`
				: this.month
					? `/*/${this.month}`
					: "";

    const hasYear = Boolean(this.year);
    const hasMonth = Boolean(this.month);
    const hasDay = Boolean(this.day);

    const showYearFilters = !hasYear && !hasMonth && !hasDay;
    const showMonthFilters = hasYear && !hasMonth && !hasDay;
    const showDayFilters = hasYear && hasMonth && this.year !== "*" && !hasDay;

    type PathCell = {
        kind: "sep" | "part";
        content: any;
        star?: boolean;
    };

    const pathCells: PathCell[] = [
        { kind: "sep", content: "/" },
        { kind: "part", content: <a target="_self" href="/mini">mini</a> },
    ];

    const pushSep = () => pathCells.push({ kind: "sep", content: "/" });
    const pushPart = (content: any, star = false) =>
        pathCells.push({ kind: "part", content, star });

    if (!hasYear) {
        pushSep();
        pushPart("*", true);
    } else {
        pushSep();
        if (this.year === "*") {
            pushPart("*", true);
        } else if (!hasMonth) {
            pushPart(<span>{this.year}</span>);
        } else {
            pushPart(<a target="_self" href={`/mini/${this.year}`}>{this.year}</a>);
        }

        if (!hasMonth) {
            pushSep();
            pushPart("*", true);
        } else {
            pushSep();
            if (!hasDay) {
                pushPart(<span>{this.month}</span>);
            } else {
                pushPart(<a target="_self" href={monthPath}>{this.month}</a>);
            }

            if (!hasDay) {
                pushSep();
                pushPart("*", true);
            } else {
                pushSep();
                pushPart(<span>{this.day}</span>);
            }
        }
    }

    let starCellIndex = -1;
    for (let i = 0; i < pathCells.length; i++) {
        if (pathCells[i].star) starCellIndex = i;
    }

    const renderAlignedFilters = (children: any) => {
        if (starCellIndex < 0) return false;

        return (
            <tr class="mini-filter-row">
                {pathCells.slice(0, starCellIndex).map((cell) => (
                    <td
                        class={`${cell.kind === "sep" ? "mini-path-sep" : "mini-path-part"} mini-path-ghost`}
                    >
						
                    </td>
                ))}
                <td class="mini-filter-cell" colSpan={pathCells.length - starCellIndex}>
                    {children}
                </td>
            </tr>
        );
    };

	return (
		<article>
			<title>{`mini${suffix} – bomberfish.ca`}</title>

            <table class="mini-nav-table">
                <tbody>
                    <tr class="mini-path-row">
                        {pathCells.map((cell) => (
                            <td class={cell.kind === "sep" ? "mini-path-sep" : "mini-path-part"}>
                                {cell.content}
                            </td>
                        ))}
                    </tr>

                    {showYearFilters ? (
                        renderAlignedFilters(
                                <ul class="mini-filter-list">
                                    {miniblogYears.map((year) => (
                                        <li>
                                            <a target="_self" href={`/mini/${year}`}>{year}</a>
                                        </li>
                                    ))}
                                </ul>
                            )
                    ) : false}

                    {showMonthFilters ? (
                        renderAlignedFilters(
                                <ul class="mini-filter-list">
                                    {miniblogMonths.map((month) => (
                                        <li>
                                            <a target="_self" href={`/mini/${this.year}/${month}`}>
                                                {month}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            )
                    ) : false}

                    {showDayFilters ? (
                        renderAlignedFilters(
                                <ul class="mini-filter-list">
                                    {days.map((day) => (
                                        <li>
                                            <a target="_self" href={`/mini/${this.year}/${this.month}/${day}`}>
                                                {day}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            )
                    ) : false}
                </tbody>
            </table>

            <p class="mini-note">
                you are here for a reason. no further clarification is required
            </p>
            <p class="mini-meta">
                *** collections posted in bulk. last site build {__BUILD_DATE__}
            </p>

			<ol reversed>
				{posts.map((post) => (
					<li>
						<a target="_self" href={post.path}>{post.preview}</a>
					</li>
				))}
			</ol>
		</article>
	);
}

export default MiniBlogList;
