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
					Blog <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="var(--text)"><path d="M216-144q-29.7 0-50.85-21.15Q144-186.3 144-216v-528q0-29.7 21.15-50.85Q186.3-816 216-816h228q15.3 0 25.65 10.29Q480-795.42 480-780.21t-10.35 25.71Q459.3-744 444-744H216v528h528v-228q0-15.3 10.29-25.65Q764.58-480 779.79-480t25.71 10.35Q816-459.3 816-444v228q0 29.7-21.15 50.85Q773.7-144 744-144H216Zm528-549L412-361q-11 11-25 10.5T362-362q-11-11-11-25.5t11-25.5l331-331h-81q-15.3 0-25.65-10.29Q576-764.58 576-779.79t10.35-25.71Q596.7-816 612-816h168q15.3 0 25.65 10.35Q816-795.3 816-780v168q0 15.3-10.29 25.65Q795.42-576 780.21-576t-25.71-10.35Q744-596.7 744-612v-81Z"/></svg>
				</a>
			</nav>
		</header>
	);
};

Header.style = css`
	:scope {
		top: 1rem;
		z-index: 4;
	}

	nav {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
		user-select: none;
		-webkit-user-select: none;
	}

	h1 {
		margin-block: 0.1em !important;
		font-size: 28px !important;
		font-size: clamp(1.6rem, 2vw + 1rem, 2.25rem)!important;
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
