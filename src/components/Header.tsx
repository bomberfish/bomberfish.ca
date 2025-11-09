import { Component, css } from "dreamland/core";
import { Link } from "dreamland/router";

const Header: Component<{}, {}> = function () {
	return (
		<header class="generic-header">
			<a href="/" target="_self" rel="noopener noreferrer">
				<h1>bomberfish.ca</h1>
			</a>
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
				<Link href="/" class="router-link">
					Home&nbsp;
				</Link>
				<Link href="/projects" class="router-link">
					Projects&nbsp;
				</Link>
				{/* <Link href="/blog" class="router-link">
					Blog&nbsp;
				</Link> */}
				<a href="https://blog.bomberfish.ca" target="_blank">
					Blog
				</a>
		</nav>
	)
}

TopNav.style = css`
	:scope {
		display: flex;
		align-items: center;
		gap: 0.5rem;
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
