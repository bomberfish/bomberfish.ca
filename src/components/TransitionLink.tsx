import { Component } from "dreamland/core";
import { router } from "../main-server";

type ViewTransitionCallback = () => void | Promise<void>;
type DocumentWithViewTransition = Document & {
	startViewTransition?: (callback: ViewTransitionCallback) => unknown;
};

const isModifiedEvent = (event: MouseEvent) =>
	event.button !== 0 ||
	event.metaKey ||
	event.ctrlKey ||
	event.shiftKey ||
	event.altKey;

const getDocumentWithViewTransitions = (): DocumentWithViewTransition | null => {
	if (typeof document === "undefined") {
		return null;
	}
	const doc = document as DocumentWithViewTransition;
	return typeof doc.startViewTransition === "function" ? doc : null;
};

const buildClassName = (componentInstance: Record<string, unknown>) => {
	const classes: string[] = [];
	if (typeof componentInstance.class === "string" && componentInstance.class.trim().length > 0) {
		classes.push(componentInstance.class);
	}
	for (const [key, value] of Object.entries(componentInstance)) {
		if (!key.startsWith("class:")) continue;
		if (value) {
			classes.push(key.slice(6));
		}
	}
	return classes.join(" ").trim() || undefined;
};

const normalizePath = (path: string) => {
	let normalized = path.replace(/\/+$/, "");
	normalized = normalized.replace(/\/index\.html?$/i, "");
	return normalized.length === 0 ? "/" : normalized;
};

const NAV_PATHS = ["/", "/projects", "/blog", "/siteinfo"];

const getNavigationOrder = (path: string): number | undefined => {
	const normalized = normalizePath(path);
	for (const [index, navPath] of NAV_PATHS.entries()) {
		if (navPath === "/") {
			if (normalized === "/") {
				return index;
			}
			continue;
		}
		if (normalized === navPath || normalized.startsWith(`${navPath}/`)) {
			return index;
		}
	}
	return undefined;
	};

	const getPathDepth = (path: string) => {
		const normalized = normalizePath(path);
		if (normalized === "/") return 0;
		return normalized.split("/").length - 1;
	};

export type TransitionLinkProps = {
	href: string;
	class?: string;
	rel?: string;
	target?: string;
	"on:click"?: (event: MouseEvent) => void;
	[key: `class:${string}`]: unknown;
} & Record<string, unknown>;

export const TransitionLink: Component<TransitionLinkProps, {}> = function (cx) {
	const className = buildClassName(this as Record<string, unknown>);
	const href = this.href as string;
	const rel = this.rel as string | undefined;
	const userClick = this["on:click"] as ((event: MouseEvent) => void) | undefined;
	const passthrough: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(this)) {
		if (
			key === "href" ||
			key === "class" ||
			key === "target" ||
			key === "rel" ||
			key === "on:click" ||
			key === "children" ||
			key.startsWith("class:")
		) {
			continue;
		}
		passthrough[key] = value;
	}

	const navigate = () => {
		if (!router) return;
		router.navigate(href);
	};

	const handleClick = (event: MouseEvent) => {
		userClick?.(event);

		if (
			event.defaultPrevented ||
			isModifiedEvent(event) ||
			(this.target && this.target !== "_self") ||
			rel?.includes("external")
		) {
			return;
		}

		event.preventDefault();

		let sameDestination = false;
		let slideDirection = 1;
		if (typeof window !== "undefined") {
			const currentPath = window.location.pathname;
			const normalizedCurrentPath = normalizePath(currentPath);
			const currentOrder = getNavigationOrder(currentPath);
			const currentDepth = getPathDepth(currentPath);
			try {
				const destination = new URL(href, window.location.origin);
				const normalizedDestination = normalizePath(destination.pathname);
				const destinationOrder = getNavigationOrder(destination.pathname);
				const destinationDepth = getPathDepth(destination.pathname);
				sameDestination =
					normalizedDestination === normalizedCurrentPath &&
					destination.search === window.location.search &&
					destination.hash === window.location.hash;

				if (currentDepth >= 2 && destinationDepth <= 1) {
					slideDirection = -1;
				} else if (
					typeof currentOrder === "number" &&
					typeof destinationOrder === "number" &&
					currentOrder !== destinationOrder
				) {
					slideDirection = destinationOrder > currentOrder ? 1 : -1;
				}
			} catch {
				sameDestination = false;
			}
		}

		if (sameDestination) {
			navigate();
			return;
		}

		const doc = getDocumentWithViewTransitions();
		if (doc) {
			if (typeof document !== "undefined") {
				document.documentElement?.style.setProperty("--vt-direction", slideDirection.toString());
			}
			doc.startViewTransition?.(() => navigate());
		} else {
			navigate();
		}
	};

	return (
		<a
			href={href}
			class={className}
			target={this.target || "_self"}
			rel={rel}
			on:click={handleClick}
			{...passthrough}
		>
			{cx.children}
		</a>
	);
};

export default TransitionLink;