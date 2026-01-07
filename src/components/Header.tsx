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
				<TransitionLink href="/" class="nav-link">
					<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3">
						<path d="M240-200h120v-240h240v240h120v-360L480-740 240-560v360Zm-80 80v-480l320-240 320 240v480H520v-240h-80v240H160Zm320-350Z"/>
					</svg>
					Home
				</TransitionLink>
				<TransitionLink href="/projects" class="nav-link">
				<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3">
					<path d="M400-120q-17 0-28.5-11.5T360-160v-480H160q0-83 58.5-141.5T360-840h240v120l120-120h80v320h-80L600-640v480q0 17-11.5 28.5T560-120H400Zm40-80h80v-240h-80v240Zm0-320h80v-240H360q-26 0-49 10.5T271-720h169v200Zm40 40Z"/>
				</svg>
					Projects
				</TransitionLink>
				<TransitionLink href="/blog" class="nav-link">
					<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3">
						<path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h440l200 200v440q0 33-23.5 56.5T760-120H200Zm0-80h560v-400H600v-160H200v560Zm80-80h400v-80H280v80Zm0-320h200v-80H280v80Zm0 160h400v-80H280v80Zm-80-320v160-160 560-560Z"/>
					</svg>
					Blog
				</TransitionLink>
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
