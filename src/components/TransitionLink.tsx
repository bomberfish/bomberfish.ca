import { ComponentChild, FC } from "dreamland/core";
import { router } from "dreamland/router";

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

const getDocumentWithViewTransitions =
	(): DocumentWithViewTransition | null => {
		if (typeof document === "undefined") {
			return null;
		}
		const doc = document as DocumentWithViewTransition;
		return typeof doc.startViewTransition === "function" ? doc : null;
	};

// navigate() below marks the history entries it creates, in history.state so
// it survives reloads. An entry with the mark came from a page of this site,
// so going back stays on the site; this class on <html> shows SiteNav's back
// button only then (a page opened from elsewhere has nothing to go back to).
const syncCanGoBack = () =>
	document.documentElement.classList.toggle(
		"can-go-back",
		history.state?.inSite === true
	);

if (!import.meta.env.SSR) {
	addEventListener("popstate", syncCanGoBack);
	syncCanGoBack();
}

export function goBack() {
	const doc = getDocumentWithViewTransitions();
	if (!doc) {
		history.back();
		return;
	}
	doc.startViewTransition?.(
		() =>
			new Promise<void>((resolve) => {
				// the router's own popstate listener swaps the page; the
				// timeout lets it finish before the new state's captured
				addEventListener("popstate", () => setTimeout(resolve), { once: true });
				history.back();
			})
	);
}

const buildClassName = (componentInstance: Record<string, unknown>) => {
	const classes: string[] = [];
	if (
		typeof componentInstance.class === "string" &&
		componentInstance.class.trim().length > 0
	) {
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

type TransitionLinkProps = {
	href: string;
	class?: string;
	rel?: string;
	target?: string;
	children?: ComponentChild;
	"on:click"?: (event: MouseEvent) => void;
	[key: `class:${string}`]: unknown;
} & Record<string, unknown>;

export function TransitionLink(this: FC<TransitionLinkProps>) {
	const className = buildClassName(this as Record<string, unknown>);
	const href = this.href as string;
	const rel = this.rel as string | undefined;
	const userClick = this["on:click"] as
		| ((event: MouseEvent) => void)
		| undefined;
	const passthrough: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(this)) {
		if (
			key === "cx" ||
			key === "root" ||
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

	const navigate = async () => {
		if (await router?.navigate(href)) {
			history.replaceState({ inSite: true }, "");
			syncCanGoBack();
		}
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
		if (typeof window !== "undefined") {
			try {
				const destination = new URL(href, window.location.origin);
				sameDestination =
					destination.pathname === window.location.pathname &&
					destination.search === window.location.search &&
					destination.hash === window.location.hash;
			} catch {
				sameDestination = false;
			}
		}

		// (navigating would only add a history entry back to the same page)
		if (sameDestination) return;

		const doc = getDocumentWithViewTransitions();
		if (doc) {
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
			{this.children}
		</a>
	);
}

export default TransitionLink;
