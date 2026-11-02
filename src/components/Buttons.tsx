import { FC, css } from "dreamland/core";

export function WebButton(
	this: FC<
		{
			src: string;
			href?: string;
			alt?: string;
			title?: string;
			"on:click"?: (e: MouseEvent) => void;
		},
		{ image: HTMLImageElement }
	>
) {
	this.cx.mount = () => {
		this.image.addEventListener("error", () => {
			console.error("Oh no :(");
			this.root.style.visibility = "hidden";
			this.root.style.width = "0";
			this.root.style.minWidth = "0";
		});
	};

	if (this.title) {
		this.alt = this.alt || "A web button with the description: " + this.title;
	}

	return (
		<a
			class="web-button"
			href={this.href || ""}
			target={this.href ? "_blank" : "_self"}
			referrer-policy="unsafe-url"
			on:click={(e: MouseEvent) => {
				this["on:click"]?.(e);
			}}
		>
			<img
				loading="lazy"
				src={this.src}
				alt={this.alt || this.href}
				title={this.title || this.alt || ""}
				this={use(this.image)}
			/>
		</a>
	);
}

WebButton.style = css`
	:scope {
		min-width: max(88px, calc(6.5rem));
		height: max(31px, 2.3rem);
		border: none !important;
		display: inline-block;
		font-size: 0;
	}
	img {
		image-rendering: pixelated;
		image-rendering: crisp-edges;
		width: auto;
		height: 100%;
	}
	:scope:after {
		display: none;
	}
`;

function PeopleButtons(this: FC) {
	return (
		<>
			<WebButton
				src="https://mercurywork.shop/button.gif"
				title="Mercury Workshop"
				href="https://mercurywork.shop"
			/>
			<WebButton src="https://velzie.rip/88x31.png" href="https://velzie.rip" />
			<WebButton src="https://percs.dev/button.gif" href="https://percs.dev" />
			<WebButton
				src="https://foxmoss.com/foxmossbutton.png"
				href="https://foxmoss.com"
			/>
			<WebButton src="https://wearr.dev/88x31.gif" href="https://wearr.dev" />
			<WebButton
				src="https://errorcodezero.dev/button.gif"
				href="https://www.errorcodezero.dev/"
			/>
			<WebButton
				src="https://qwq.sh/88x31/hazelcaffe.png"
				href="https://qwq.sh"
			/>
			<WebButton
				src="https://madz.mov/assets/images/buttons/friends/madzbutton.gif"
				href="https://madz.mov"
			/>
			<WebButton
				src="https://doskel.net/buttons/doskel.gif"
				href="https://doskel.net/"
			/>
			<WebButton
				src="https://thememesniper.dev/images/88x31.png"
				href="https://thememesniper.dev"
			/>
			<WebButton
				src="https://www.hrtowii.dev/88x31-madoka.png"
				href="https://www.hrtowii.dev/"
			/>
			<WebButton
				src="/buttons/jack.cab.gif"
				href="https://jack.cab/?utm_content=jack-button"
			/>
			<WebButton src="https://3kh0.net/button.png" href="https://3kh0.net" />
			<WebButton
				src="https://circulars.dev/circular-88x31.gif"
				href="https://circulars.dev"
			/>
			<WebButton src="https://gideon.sh/88x31.gif" href="https://gideon.sh" />
			<WebButton
				src="https://cdn.dispherical.com/88x31.png"
				href="https://dispherical.com"
			/>
			<WebButton
				src="https://w.on-t.work/assets/88x31.png"
				href="https://w.on-t.work"
			/>
			<WebButton
				src="https://notfire.cc/design/images/buttons/notfire-cc-88x31-af.gif"
				href="https://notfire.cc"
			/>
			<WebButton
				src="https://zenfyr.dev/88_31/88_31.webp"
				href="https://zenfyr.dev"
			/>
			<WebButton src="/buttons/ipg.gif" href="https://invoxiplaygames.uk" />
			<WebButton
				src="https://melankorin.net/assets/img/buttons/button-1.gif"
				href="https://melankorin.net"
			/>
		</>
	);
}

function OtherButtons(this: FC) {
	return (
		<>
			<WebButton
				src="/buttons/dreamland.gif"
				title="Made with dreamland.js, a small, utilitarian web framework"
				href="https://dreamland.js.org/?uwu"
			/>
			<WebButton
				src="https://simpleanalyticsbadges.com/bomberfish.ca?mode=dark&text=f7e9fb&background=221c21&logo=dca6e3"
				title="If you don't like analytics, respectfully fuck off."
				href="https://dashboard.simpleanalytics.com/bomberfish.ca?utm_source=bomberfish.ca&utm_content=badge"
			/>
			<WebButton
				src="/buttons/any-browser.gif"
				title="View this site on *any* web browser! No, seriously!"
				href="https://anybrowser.org/campaign/index.html"
			/>
			{/* TODO: update this to mozilla's latest shenanigans */}
			<WebButton
				src="/buttons/firefox.gif"
				title="Firefox is EVIL!"
				href="https://lunduke.locals.com/post/5871895/mozilla-firefox-goes-anti-privacy-pro-advertising"
			/>
			<WebButton
				src="/buttons/valid-rss-rogers.gif"
				title="View my blog as an RSS feed!"
				href="/feed.xml"
			/>
			<WebButton
				src="/buttons/valid-atom.gif"
				title="View my blog as an Atom feed!"
				href="/atom.xml"
			/>
			<WebButton
				src="/buttons/invalidator.gif"
				title="HTML parser devs hate this one easy trick!"
				href="https://validator.w3.org/nu/?doc=http%3A%2F%2Fbomberfish.ca%2F"
			/>
			<WebButton
				src="/buttons/cssdif.gif"
				title="CSS overflow is my mortal enemy."
			/>
			<WebButton src="/buttons/wdw.gif" href="https://wetdry.world" />
			<WebButton
				src="https://eightyeightthirty.one/88x31.png"
				href="https://eightyeightthirty.one"
			/>
			<WebButton src="/buttons/xkcd.gif" title="XKCD" href="https://xkcd.com" />
			<WebButton
				src="/buttons/balls.gif"
				title="Google Single Sign On"
				href="https://login.corp.google.com"
			/>
			<WebButton src="/buttons/modarchive.gif" href="https://modarchive.org" />
			<WebButton src="/buttons/newgrounds.gif" href="https://newgrounds.com" />
			<WebButton
				src="https://smokepowered.com/smoke.gif"
				href="https://smokepowered.com"
			/>
			<WebButton src="/buttons/blazed.gif" href="https://epicblazed.com" />
			<WebButton
				src="/buttons/github.gif"
				href="https://github.com"
				title="Social Coding!"
			/>
			<WebButton src="/buttons/macmade-wht.gif" title="I <3 Macintosh" />
			<WebButton src="/buttons/stop.gif" title="STOP" />
			<WebButton
				src="/buttons/cdaweb.gif"
				title="It's more likely than you think."
				href="https://cira.ca"
			/>
			<WebButton src="/buttons/ieborg.gif" title="Resistance is futile." />
			<WebButton
				src="/buttons/mariokart.gif"
				title="Play some Mario Kart!"
				href="https://bomberfish.github.io/N64Wasm"
			/>
			<WebButton
				src="/buttons/necoarc-88x31.gif"
				title="the profaned one"
				href="https://necoarc.dev"
			/>
			<WebButton
				src="/buttons/talker.gif"
				title="This website really does talk!"
				on:click={() => {
					if ("speechSynthesis" in window) {
						window.speechSynthesis.cancel();
						const text = prompt("Enter text to speak:");
						if (text) {
							const utterance = new SpeechSynthesisUtterance(text);
							window.speechSynthesis.speak(utterance);
						}
					} else {
						alert("your browser sucks!");
					}
				}}
			/>
		</>
	);
}

export function ButtonList(this: FC) {
	// the marquees (and the buttons' bobbing) hold still until the list
	// first scrolls into view, so they start from the beginning on screen
	this.cx.mount = () => {
		if (!("IntersectionObserver" in window)) {
			this.root.classList.remove("webbtns-wait");
			return;
		}
		const observer = new IntersectionObserver((entries) => {
			if (!entries.some((e) => e.isIntersecting)) return;
			this.root.classList.remove("webbtns-wait");
			observer.disconnect();
		});
		observer.observe(this.root);
		return () => observer.disconnect();
	};

	return (
		<span class="webbtns-wait">
			<span class="webbtns">
				<PeopleButtons />
				<PeopleButtons />
			</span>
			<span class="webbtns fast">
				<OtherButtons />
				<OtherButtons />
			</span>
		</span>
	);
}

ButtonList.style = css`
	.webbtns {
		display: inline-flex;
		flex-direction: row;
		white-space: nowrap;
		gap: 0.75rem;
		padding-right: 0.75rem;
		flex-wrap: nowrap;

		margin-block: 0.5rem;

		animation: move 25s linear infinite;
		animation-fill-mode: both;
	}

	.webbtns.fast {
		animation-duration: 16.5s;
	}

	.webbtns:hover,
	.webbtns:hover > a {
		animation-play-state: paused;
	}

	@keyframes move {
		0% {
			transform: translateX(0%);
		}

		100% {
			transform: translateX(-50%);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.webbtns {
			flex-wrap: wrap;
		}
	}
`;

export function CopiedToast(this: FC) {
	this.cx.mount = () => {
		setTimeout(() => {
			this.root.remove();
		}, 2000);
	};

	return (
		<div>
			<span class="material-symbols-rounded">content_copy</span>
			Copied to clipboard!
		</div>
	);
}

CopiedToast.style = css`
	:scope {
		position: fixed;
		bottom: 0;
		right: 0;
		background-color: var(--surface0);
		border: 0.083rem solid var(--overlay0);
		color: var(--text);
		padding: 0.5rem 1rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		border-radius: 0%;
		margin: 1rem;

		animation:
			fadein 0.35s,
			fadeout 0.35s 1.75s;
		animation-timing-function: cubic-bezier(0.2, 0.2, 0.5, 1);

		box-shadow: 0 2px 8px var(--tooltip-shadow);

		perspective: 1000px;
		transform-origin: bottom center;
	}

	@keyframes fadein {
		from {
			opacity: 0;
			transform: translateY(0) rotate3d(1, 0, 0, 70deg);
		}
		to {
			opacity: 1;
			transform: translateY(0) rotate3d(1, 0, 0, 0deg);
		}
	}

	@keyframes fadeout {
		from {
			opacity: 1;
			transform: translateY(0) rotate3d(1, 0, 0, 0deg);
		}
		to {
			opacity: 0;
			transform: translateY(1rem) rotate3d(1, 0, 0, 70deg);
		}
	}
`;
