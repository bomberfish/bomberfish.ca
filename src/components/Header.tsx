import { Component, css } from "dreamland/core";
import { Link } from "dreamland/router";

const Header: Component<{}, {}> = function () {
	return (
		<header>
			<a href="/" target="_self" rel="noopener noreferrer">
				<h1>bomberfish.ca</h1>
			</a>
			<nav>
				<Link href="/" class="router-link">
					Home&nbsp;
				</Link>
				<Link href="/projects" class="router-link">
					Projects&nbsp;
				</Link>
				<a href="https://blog.bomberfish.ca" target="_blank">
					Blog <span class="material-symbols">open_in_new</span>
				</a>
			</nav>
		</header>
	);
};

Header.style = css`
	:scope {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		top: 1rem;
		z-index: 4;
	}

	nav {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
		user-select: none;
		-webkit-user-select: none;
	}

	h1 {
		margin-block: 0.1em !important;
		font-size: 2.25rem;
	}

	a,
	a:visited {
		text-decoration: none;
		color: var(--text) !important;
	}

	nav a:hover {
		text-decoration: underline;
		user-select: none;
		-webkit-user-select: none;
	}

	@media (max-width: 520px) {
		:scope {
			gap: 0.5rem;
		}
		nav a {
			padding: 0.1rem 0.2rem;
		}
	}
`;

export default Header;
