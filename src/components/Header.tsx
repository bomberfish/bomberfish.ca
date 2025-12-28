import { Component, css } from "dreamland/core";
import TransitionLink from "./TransitionLink";

const Header: Component<{}, {}> = function () {
	return (
		<header class="generic-header">
			<TransitionLink href="/" class="site-title-link" style="text-decoration: none;">
				<h1>bomberfish.ca</h1>
			</TransitionLink>
			<TopNav />
		</header>
	);
};

Header.style = css`
	:scope {
		top: 1rem;
		z-index: 4;
	}

	h1 {
		margin-block: 0.1em !important;
		font-size: 28px !important;
		font-size: clamp(1.6rem, 2vw + 1rem, 2.25rem)!important;
		view-transition-name: site-title;
	}

	.site-title-link {
		text-decoration: none!important;
		color: inherit;
		display: inline-flex;
		align-items: center;
	}

	h1:hover {
		text-decoration: underline !important;
	text-decoration-color: var(--subtext1) !important;
	}

	@media (max-width: 520px) {
		:scope {
			gap: 0.5rem;
		}
	}
`;

export const TopNav: Component<{}, {}> = function () {
	return (
		<nav>
				<TransitionLink href="/" class="router-link">
					Home
				</TransitionLink>
				<TransitionLink href="/projects/index" class="router-link">
					Projects
				</TransitionLink>
				<TransitionLink href="/blog/index" class="router-link">
					Blog
				</TransitionLink>
				{/* <a href="https://blog.bomberfish.ca" target="_blank">
					Blog
				</a> */}
		</nav>
	)
}

TopNav.style = css`
	:scope {
		view-transition-name: nav-links;
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		user-select: none;
		-webkit-user-select: none;
		justify-content: center;
		height: calc(clamp(1.6rem, 1rem + 2vw, 2.25rem) * 1.1);
	}

	a,
	a:visited {
		text-decoration: none !important;
		color: var(--text) !important;
	}

	a[target="_blank"] {
		display: flex;
		align-items: center;
		gap: 0.1rem;
		padding: 0;
		margin-right: 0.5rem;
	}

	a:hover {
		text-decoration: underline;
		user-select: none;
		-webkit-user-select: none;
	}

	@media (max-width: 520px) {
		a {
			padding: 0.1rem 0.2rem;
		}
	}
`

export default Header;
