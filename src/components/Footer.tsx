import { FC, css } from "dreamland/core";
import humanizeDuration from "humanize-duration";
import { Link, swapText } from "metro-dreamland";
import { onekoOn, toggleOneko } from "./Oneko";

const messages: string[] = [
	"[Praying to RNGesus...]",
	"Nine parts perspiration.",
	"Take care of yourself.",
	"It's over 9000!",
	"Something wonderful has happened",
	"Hack the Planet!",
	"Copy that floppy!",
	"And the universe said I love you, because you are love.",
	"Always try to be nice, but never fail to be kind.",
];

type FooterState = {
	elapsed: string;
	message: string;
};

function Footer(this: FC<{}, FooterState>) {
	this.elapsed = `built on ${new Date(__BUILD_DATE__).toLocaleDateString()}`;
	this.message = "<insert funny message here>";

	const pickNewSplashMessage = () => {
		const old = this.message;
		let message = old;
		while (message === old) {
			message = messages[Math.floor(Math.random() * messages.length)];
		}
		this.message = message;
	};

	// the old line swivels away and the new one in (metro-dreamland)
	const shuffleSplash = (e: MouseEvent) => {
		void swapText(e.currentTarget as HTMLElement, pickNewSplashMessage);
	};
	const buildDate = new Date(__BUILD_DATE__);
	const updateElapsed = () => {
		const diff = Date.now() - buildDate.getTime();
		this.elapsed = "built " + humanizeDuration(diff, { round: true }) + " ago";
	};

	this.cx.mount = () => {
		if (import.meta.env.SSR) {
			return;
		}

		this.message = messages[Math.floor(Math.random() * messages.length)];
		updateElapsed();
		this.root
			?.querySelector(".neko-toggle")
			?.setAttribute("aria-pressed", String(onekoOn()));
	};

	// the cat at the end lets the cat out (Oneko.tsx), from where it sits
	const toggleCat = (e: MouseEvent) => {
		const on = toggleOneko({ x: e.pageX, y: e.pageY });
		(e.currentTarget as HTMLElement).setAttribute("aria-pressed", String(on));
	};

	return (
		<footer data-m-feather>
			<subt>
				<span class="tooltip-wrapper" on:pointerenter={updateElapsed}>
					<Link href="/siteinfo.html" class="router-link">
						{"bomberfish.ca v" + __APP_VERSION__ + " (" + __COMMIT_HASH__ + ")"}
					</Link>
					<span class="tooltip top">{use(this.elapsed)}</span>
				</span>
				<span class="splash-line">
					<span on:click={shuffleSplash} class="splash">
						{use(this.message)}
						<noscript> Enable JavaScript, you damn luddite!</noscript>
					</span>
					<button
						type="button"
						class="neko-toggle"
						aria-pressed="false"
						aria-label="a cat to chase the pointer"
						title="neko"
						on:click={toggleCat}
					>
						🐱
					</button>
				</span>
			</subt>
		</footer>
	);
}

Footer.style = css`
	:scope {
		margin-top: auto;
		padding-top: 1rem;
		padding-bottom: 1rem;
		font-size: 0.75rem;
		user-select: none;
	}

	subt {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.25rem;
	}

	/* for a finger: type big enough to read on a phone, and a line tall
	   enough to hit */
	@media (pointer: coarse) {
		:scope {
			font-size: 0.875rem;
		}

		subt {
			font-size: inherit;
			gap: 0;
		}

		a,
		.splash {
			padding: 0.4rem 0;
		}
	}

	.splash-line {
		display: flex;
		align-items: center;
		/* (as wide as the footer's left over, so the cat can sit at its end) */
		flex: 1 1 auto;
		align-self: stretch;
		min-width: 0;
		gap: 0.5rem;
	}

	/* the cat that lets the cat out: faint until it's out */
	.neko-toggle {
		flex: none;
		margin-left: auto;
		padding: 0;
		border: 0;
		background: none;
		font: inherit;
		font-family: var(--font-emoji);
		line-height: 1;
		cursor: pointer;
		opacity: 0.55;
		filter: grayscale(1);
		transition:
			opacity 0.15s,
			filter 0.15s;
	}

	.neko-toggle:hover,
	.neko-toggle[aria-pressed="true"] {
		opacity: 1;
		filter: none;
	}

	/* (the cat follows a mouse, and doesn't run where motion's unwanted) */
	@media not (pointer: fine) {
		.neko-toggle {
			display: none;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.neko-toggle {
			display: none;
		}
	}

	.splash {
		min-width: 0;
		display: inline-block;
		color: var(--subtext2);
		cursor: pointer;
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
	}
`;

export default Footer;
