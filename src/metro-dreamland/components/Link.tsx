import { ComponentChild, FC } from "dreamland/core";
import { navigate } from "../motion/navigation";

const isModifiedEvent = (event: MouseEvent) =>
	event.button !== 0 ||
	event.metaKey ||
	event.ctrlKey ||
	event.shiftKey ||
	event.altKey;

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

type LinkProps = {
	href: string;
	class?: string;
	rel?: string;
	target?: string;
	children?: ComponentChild;
	"on:click"?: (event: MouseEvent) => void;
	[key: `class:${string}`]: unknown;
} & Record<string, unknown>;

// A link to another page of the app. Following it goes through navigate()
// (motion/navigation.ts), which plays this page out and the next one in;
// what was clicked picks the transition (data-m-nav on it, or something
// data-m-keep inside it). Held with a modifier key, or to somewhere else,
// it's a plain link.
export function Link(this: FC<LinkProps>) {
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

		// motion/navigation.ts plays the page out and the next one in; what was
		// clicked picks the transition
		void navigate(href, event.currentTarget as Element | null);
	};

	return (
		<a
			href={href}
			// (dreamland's class handler needs a string, even an empty one)
			class={className ?? ""}
			target={this.target || "_self"}
			rel={rel}
			on:click={handleClick}
			{...passthrough}
		>
			{this.children}
		</a>
	);
}

export default Link;
