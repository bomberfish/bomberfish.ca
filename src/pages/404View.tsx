import { Component, css } from "dreamland/core";
import { TransitionLink } from "../components/TransitionLink";
import Sidebar from "../components/Sidebar";

const NotFoundView: Component = function () {
	return (
		<main>
			<title>404 – bomberfish.ca</title>
			<div class="layout-container">
				<Sidebar />
				<div class="main-content">
					<h1 class="error-code">404</h1>
					<p>The page you are looking for does not exist.</p>
					<TransitionLink href="/">← Go home</TransitionLink>
				</div>
			</div>
		</main>
	);
};

NotFoundView.style = css`
	.main-content {
		justify-content: center;
	}

	.error-code {
		font-size: 6rem;
		margin: 0;
		line-height: 1;
	}

	@media (orientation: portrait) {
		.error-code {
			font-size: 4rem;
		}
	}
`;

export default NotFoundView;
