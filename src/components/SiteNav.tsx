import { FC } from "dreamland/core";
import { Link, Pivot as MetroPivot, RingButton } from "../metro-dreamland";

export type Section = "projects" | "blog" | "about";

export const SECTIONS: Record<Section, { href: string; label: string }> = {
	projects: { href: "/projects", label: "projects" },
	blog: { href: "/blog", label: "blog" },
	about: { href: "/siteinfo", label: "site info" },
};

// The strip above the title on every page but the home page: the back
// button, then the site's name in small caps (the "application title" every
// phone page had) and the section you're in. `inside` is for a page within
// the section (a project, a post); `here` names a page that's in none of
// them (the weather).
//
// Back goes back to where you came from: open a project from the start
// screen and it returns you there, open it from the list of projects and
// it's the list. If you didn't come from anywhere on the site (you landed
// on this page from outside), it goes up a level instead: from a post to
// the blog, from the blog to the home page, which is what `up` is here.
// Either way it's the same move as the browser's own back button wherever
// that's possible, so the two agree (see data-m-back in metro-dreamland, which
// also points the link's href at wherever it's going to go). The breadcrumbs
// beside it are the way up by name.
export default function SiteNav(
	this: FC<{ active?: Section; inside?: boolean; here?: string }>
) {
	const section = this.active ? SECTIONS[this.active] : null;
	const up = this.inside && section ? { href: section.href } : { href: "/" };

	return (
		<header class="site-nav" data-m-feather>
			<RingButton
				to={up.href}
				arrow
				class="site-nav-back"
				title="back"
				aria-label="back"
				data-m-back={up.href}
			>
				{/* Windows 8's back button: one glyph of Segoe UI Symbol, ring
				    and all (.m-ring-arrow in style.css) */}
				<span class="material-symbols" aria-hidden="true">
					{"\uE071"}
				</span>
			</RingButton>
			<nav class="site-nav-crumbs" aria-label="you are here">
				<Link href="/" data-m-up>
					bomberfish.ca
				</Link>
				{section || this.here ? <span class="sep">/</span> : false}
				{!section && this.here ? <span class="here">{this.here}</span> : false}
				{section ? (
					this.inside ? (
						<Link href={section.href} data-m-up>
							{section.label}
						</Link>
					) : (
						<span class="here">{section.label}</span>
					)
				) : (
					false
				)}
			</nav>
		</header>
	);
}

// The pivot: a top-level page's title, followed on the same line by the
// other sections, dimmed and running off the edge of the screen. Picking
// one slides it to the front (metro-dreamland's <Pivot>, which this hands
// the site's sections to).
// Goes inside .page-header, whose big fading title style it takes over.
export function Pivot(this: FC<{ active: Section }>) {
	return (
		<MetroPivot
			items={Object.values(SECTIONS)}
			active={SECTIONS[this.active].href}
		/>
	);
}
