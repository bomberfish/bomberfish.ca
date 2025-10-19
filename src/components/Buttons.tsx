import { Component, css } from "dreamland/core";

export const WebButton: Component<
	{
		src: string;
		href?: string;
		alt?: string;
		title?: string;
		action?: (e: MouseEvent) => void;
	},
	{}
> = function () {
	this.href = this.href || "#";

	if (this.title) {
		this.alt = this.alt || "A web button with the description: " + this.title;
	}

	return (
		<a
			href={this.href}
			target="_blank"
			on:click={(e: MouseEvent) => {
				this.action!(e);
			}}
		>
			<img
				loading="lazy"
				src={this.src}
				alt={this.alt || "A web button."}
				title={this.title || this.alt || ""}
				referrerpolicy="no-referrer"
				crossorigin="anonymous"
			/>
		</a>
	);
};

WebButton.style = css`
	:scope {
		width: max-content;
		height: max(31px, 2.3rem);
		border: none !important;
		display: inline-block;
	}
	img {
		image-rendering: pixelated;
		-webkit-image-rendering: pixelated;
		width: auto;
		height: 100%;
	}
`;

export const ButtonList: Component<{}, {}> = function () {
	return (
		<span class="webbtns">
			<WebButton
				src="/buttons/simpleanalytics.svg"
				title="Privacy-respecting analytics, because I kinda want to see if anyone is actually viewing my site."
				href="https://dashboard.simpleanalytics.com/bomberfish.ca"
			/>
			<WebButton
				src="/buttons/dreamland-new.gif"
				title="Made with dreamland.js"
				href="https://dreamland.js.org/?uwu"
			/>
			<WebButton
				src="/buttons/any-browser.gif"
				title="View this site on any (modern) web browser!"
				href="https://anybrowser.org/campaign/index.html"
			/>
			<WebButton
				src="/buttons/oxo.gif"
				title="Radiohead"
				href="https://radiohead.com"
			/>
			<WebButton
				src="/buttons/hg88x31.gif"
				title="Mercury Workshop"
				href="https://mercurywork.shop"
			/>
			<WebButton
				src="/buttons/hackclub.gif"
				title="Hack Club"
				href="https://hack.club"
			/>
			<WebButton
				src="/buttons/omada.gif"
				title="omada.cafe, an private and secure alternative provider."
				href="https://omada.cafe"
			/>
			{/* TODO: update this to mozilla's latest shenanigans */}
			<WebButton
				src="/buttons/firefox.gif"
				title="Firefox is EVIL!"
				href="https://lunduke.locals.com/post/5871895/mozilla-firefox-goes-anti-privacy-pro-advertising"
			/>
			<WebButton
				src="/buttons/smoke.gif"
				title="Smokepowered"
				href="https://smokepowered.com"
			/>
			<WebButton
				src="/buttons/blazed.png"
				title="Epic MegaBlazed"
				href="https://epicblazed.com"
			/>
			<WebButton
				src="/buttons/mariokart.gif"
				title="Play some Mario Kart!"
				href="https://bomberfish.ca/N64Wasm"
			/>
			<WebButton
				src="/buttons/ce88x31.gif"
				title="velzie.d"
				href="https://velzie.rip"
			/>
			<WebButton
				src="/buttons/thinlqd.gif"
				title="ThinLiquid"
				href="https://thinliquid.dev"
			/>
			<WebButton
				src="/buttons/foxmossbutton.gif"
				title="FoxMoss"
				href="https://foxmoss.com"
			/>
			<WebButton
				src="/buttons/wearr.gif"
				title="wearr"
				href="https://wearr.dev"
			/>
			<WebButton
				src="/buttons/circular-88x31.gif"
				title="circular"
				href="https://circulars.dev"
			/>
			<WebButton
				src="/buttons/authenyo.gif"
				title="authenyo"
				href="https://authenyo.xyz"
			/>
			<WebButton
				src="/buttons/k8.gif"
				title="thememesniper"
				href="https://thememesniper.dev"
			/>
			<WebButton
				src="/buttons/cvfd.gif"
				title="notfire"
				href="https://notfire.cc"
			/>
			<WebButton
				src="/buttons/dispherical.gif"
				title="dispherical"
				href="https://dispherical.com"
			/>
			<WebButton
				src="/buttons/kopper.png"
				title="kopper"
				href="https://w.on-t.work"
			/>
			<WebButton
				src="/buttons/melon.gif"
				title="melontini"
				href="https://melontini.me"
			/>
			<WebButton
				src="/buttons/ipg.png"
				title="InvoxiPlayGames"
				href="https://invoxiplaygames.uk"
			/>
			<WebButton
				src="/buttons/necoarc-88x31.gif"
				title="the profaned one"
				href="https://necoarc.dev"
			/>
			<WebButton
				src="/buttons/eightyeightthirtyone.gif"
				title="88x31"
				href="https://eightyeightthirty.one"
			/>
			<WebButton
				src="/buttons/melankorin.gif"
				title="melankorin"
				href="https://melankorin.net"
			/>
			<WebButton
				src="/buttons/lucida-2.gif"
				title="Lucida: Free Music. No BS."
				href="https://lucida.to"
			/>
		</span>
	);
};

ButtonList.style = css`
	:scope {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
		row-gap: 0.5rem;
	}
`;

export const CopiedToast: Component<{}, {}> = function (cx) {
	cx.mount = () => {
		setTimeout(() => {
			cx.root.remove();
		}, 2000);
	};

	return (
		<div>
			<span class="material-symbols-rounded">content_copy</span>
			Copied to clipboard!
		</div>
	);
};

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
		border-radius: 0.5rem;
		margin: 1rem;

		animation:
			fadein 0.25s,
			fadeout 0.25s 1.75s;
		animation-timing-function: cubic-bezier(.2,.2,.5,1);

		font-weight: 520;
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
