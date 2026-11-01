import { FC } from "dreamland/core";
import TransitionLink from "./TransitionLink";

type PageCategory = "home" | "projects" | "blog";

function Navbar(this: FC<{ active?: PageCategory }>) {
	const active = this.active;

	this.cx.mount = () => {
		if (import.meta.env.SSR) return;

		const el = this.root as HTMLElement | null;
		if (!el) return;

		let rafId: number | null = null;
		const update = () => {
			rafId = null;
			el.classList.toggle("scrolled", window.scrollY > 0);
		};

		const onScroll = () => {
			if (rafId !== null) return;
			rafId = requestAnimationFrame(update);
		};

		update();
		window.addEventListener("scroll", onScroll, { passive: true });

		// Too narrow for the title and all three nav buttons (the title would
		// be cut off, or the nav clip its first button): drop the home button,
		// since the title goes to the same place. Measured with home showing,
		// so it comes back once there's room.
		const title = el.querySelector<HTMLElement>(".site-title span");
		const nav = el.querySelector<HTMLElement>(".sidebar-nav");
		const fit = () => {
			el.classList.remove("compact");
			const cramped =
				(!!title && title.scrollWidth > title.clientWidth + 1) ||
				(!!nav && nav.scrollWidth > nav.clientWidth + 1);
			el.classList.toggle("compact", cramped);
		};
		const sizeObserver = new ResizeObserver(fit);
		sizeObserver.observe(el);
		void document.fonts?.ready.then(fit);

		return () => {
			window.removeEventListener("scroll", onScroll);
			if (rafId !== null) cancelAnimationFrame(rafId);
			sizeObserver.disconnect();
		};
	};

	return (
		<aside class="sidebar">
			<div class="top-blur" aria-hidden="true">
				<div
					class="top-blur-layer"
					style="--blur: 1px; --mid: 0.5; --end: 1;"
				></div>
				<div
					class="top-blur-layer"
					style="--blur: 2px; --mid: 0.4; --end: 0.8;"
				></div>
				<div
					class="top-blur-layer"
					style="--blur: 3px; --mid: 0.3; --end: 0.6;"
				></div>
				<div
					class="top-blur-layer"
					style="--blur: 6px; --mid: 0.2; --end: 0.4;"
				></div>
				<div
					class="top-blur-layer"
					style="--blur: 10px; --mid: 0.1; --end: 0.2;"
				></div>
			</div>
			<TransitionLink href="/" class="site-title-link">
				<h1 class="site-title background-container geist-anim">
					<img
						src="/pfp-anim.gif"
						height="64"
						class="site-title-pfp"
						loading="eager"
						alt="my profile picture"
					/>
					<span>bomberfish.ca</span>
				</h1>
			</TransitionLink>
			<nav class="sidebar-nav">
				<TransitionLink
					href="/"
					class={`nav-link nav-home background-container ${active === "home" ? "active" : ""}`}
				>
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
						<path d="M240-200h120v-240h240v240h120v-360L480-740 240-560v360Zm-80 80v-480l320-240 320 240v480H520v-240h-80v240H160Zm320-350Z" />
					</svg>
					<span class="page-name">home</span>
				</TransitionLink>
				<TransitionLink
					href="/projects"
					class={`nav-link background-container ${active === "projects" ? "active" : ""}`}
				>
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
						<path d="M400-120q-17 0-28.5-11.5T360-160v-480H160q0-83 58.5-141.5T360-840h240v120l120-120h80v320h-80L600-640v480q0 17-11.5 28.5T560-120H400Zm40-80h80v-240h-80v240Zm0-320h80v-240H360q-26 0-49 10.5T271-720h169v200Zm40 40Z" />
					</svg>
					<span class="page-name">projects</span>
				</TransitionLink>
				<TransitionLink
					href="/blog"
					class={`nav-link background-container ${active === "blog" ? "active" : ""}`}
				>
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
						<path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h440l200 200v440q0 33-23.5 56.5T760-120H200Zm0-80h560v-400H600v-160H200v560Zm80-80h400v-80H280v80Zm0-320h200v-80H280v80Zm0 160h400v-80H280v80Zm-80-320v160-160 560-560Z" />
					</svg>
					<span class="page-name">blog</span>
				</TransitionLink>
			</nav>
		</aside>
	);
}

export default Navbar;
