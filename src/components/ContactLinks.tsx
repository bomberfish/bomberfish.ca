import { FC, css } from "dreamland/core";

export default function ContactLinks(this: FC) {
	return (
		<span class="contact-links">
			<span class="tooltip-wrapper">
				<a href="mailto:me@bomberfish.ca" class="contact-item">
					email
				</a>
				<span class="tooltip">me@bomberfish.ca</span>
			</span>
			<span class="sep">/</span>
			<span class="tooltip-wrapper">
				<a
					href="https://wetdry.world/@fish"
					target="_blank"
					rel="me"
					referrer-policy="unsafe-url"
					class="contact-item"
				>
					fediverse
				</a>
				<span class="tooltip">@fish@wetdry.world</span>
			</span>
			<span class="sep">/</span>
			<span class="tooltip-wrapper">
				<a
					href="https://x.com/bomberfish77"
					target="_blank"
					rel="me"
					referrer-policy="unsafe-url"
					class="contact-item"
				>
					X
				</a>
				<span class="tooltip">@bomberfish77</span>
			</span>
			<span class="sep">/</span>
			<span class="tooltip-wrapper">
				<a
					href="https://bsky.app/profile/bomberfish.ca"
					target="_blank"
					rel="me"
					referrer-policy="unsafe-url"
					class="contact-item"
				>
					bluesky
				</a>
				<span class="tooltip">@bomberfish.ca</span>
			</span>
		</span>
	);
}

ContactLinks.style = css`
	:scope {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.25rem;
	}

	.contact-item {
		text-decoration: underline !important;
	}

	.contact-item::after {
		display: none !important;
	}

	.sep {
		color: var(--subtext2);
		margin: 0 0.25rem;
	}
`;
