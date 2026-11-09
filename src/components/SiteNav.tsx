import { FC } from "dreamland/core";
import TransitionLink, { backInSite } from "./TransitionLink";

// The top bar on every page but the home page. `parent` is where back goes
// when there's no page of this site to go back to (arrived from elsewhere).
export default function SiteNav(
	this: FC<{ active?: "projects" | "blog"; parent?: string }>
) {
	const active = this.active;
	const link = (href: string, name: string, icon: string) => (
		<TransitionLink
			href={href}
			class={`nav-link background-container ${active === name ? "active" : ""}`}
			aria-label={name}
		>
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
				<path d={icon} />
			</svg>
			<span class="nav-label">{name}</span>
		</TransitionLink>
	);

	return (
		<header class="site-nav">
			<TransitionLink
				href={this.parent ?? "/"}
				class="nav-link background-container"
				on:click={backInSite}
			>
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
					<path d="M313-440l224 224-57 56-320-320 320-320 57 56-224 224h487v80H313Z" />
				</svg>
				back
			</TransitionLink>
			<nav class="site-nav-links">
				{link(
					"/",
					"home",
					"M240-200h120v-240h240v240h120v-360L480-740 240-560v360Zm-80 80v-480l320-240 320 240v480H520v-240h-80v240H160Zm320-350Z"
				)}
				{link(
					"/projects",
					"projects",
					"M400-120q-17 0-28.5-11.5T360-160v-480H160q0-83 58.5-141.5T360-840h240v120l120-120h80v320h-80L600-640v480q0 17-11.5 28.5T560-120H400Zm40-80h80v-240h-80v240Zm0-320h80v-240H360q-26 0-49 10.5T271-720h169v200Zm40 40Z"
				)}
				{link(
					"/blog",
					"blog",
					"M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h440l200 200v440q0 33-23.5 56.5T760-120H200Zm0-80h560v-400H600v-160H200v560Zm80-80h400v-80H280v80Zm0-320h200v-80H280v80Zm0 160h400v-80H280v80Zm-80-320v160-160 560-560Z"
				)}
			</nav>
		</header>
	);
}
