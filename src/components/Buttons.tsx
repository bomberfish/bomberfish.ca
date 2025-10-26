import { Component, css } from "dreamland/core";

export const WebButton: Component<
	{
		src: string;
		href?: string;
		alt?: string;
		title?: string;
		"on:click"?: (e: MouseEvent) => void;
	},
	{}
> = function () {
	this.href = this.href

	if (this.title) {
		this.alt = this.alt || "A web button with the description: " + this.title;
	}

	return (
		<a
			href={this.href || "#"}
			target={this.href ? "_blank" : "_self"}
			on:click={(e: MouseEvent) => {
				this["on:click"]!(e);
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
				src="/buttons/dreamland-new.gif"
				title="Made with dreamland.js"
				href="https://dreamland.js.org/?uwu"
			/>
			<WebButton
				src="/buttons/simpleanalytics.svg"
				title="If you don't like analytics, respectfully fuck off."
				href="https://dashboard.simpleanalytics.com/bomberfish.ca"
			/>
			<WebButton
				src="/buttons/any-browser.gif"
				title="View this site on *any* web browser! No, seriously!"
				href="https://anybrowser.org/campaign/index.html"
			/>
			<WebButton
				src="/buttons/invalidator.gif"
				title="HTML parser devs hate this one easy trick!"
				href="https://validator.w3.org/nu/?doc=http%3A%2F%2Fbomberfish.ca%2F"
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
				src="/buttons/aol-sucks.gif"
				title="Good riddance."
				href="https://help.aol.com/articles/dial-up-internet-to-be-discontinued"
			/>
			<WebButton
				src="/buttons/affection.gif"
				title="<3"
			/>
			<WebButton
				src="/buttons/cssdif.gif"
				title="CSS overflow is my mortal enemy."
			/>
			<WebButton
				src="/buttons/macmade-wht.gif"
				title="I <3 Macintosh"
			/>
			<WebButton
				src="/buttons/paws.gif"
				title=":3"
			/>
			<WebButton
				src="/buttons/besteyes2.gif"
				title="How else?"
			/>
			<WebButton
				src="/buttons/cdaweb.gif"
				title="It's more likely than you think."
				href="https://cira.ca"
			/>
			<WebButton
				src="/buttons/iamv2.gif"
				title="I am Canadian!"
			/>
			<WebButton
				src="/buttons/can.gif"
				title="I am Canadian!"
			/>
			<WebButton
				src="/buttons/bestcanada.gif"
				title="Canada is the GOAT"
			/>
			<WebButton
				src="/buttons/canadab.gif"
				title="Proud to be a Canadian!"
			/>
			<WebButton
				src="/buttons/cananow.gif"
				title="The Canadian Century starts NOW."
			/>
			<WebButton
				src="/buttons/imac.gif"
				title="iMacs are dope!"
			/>
			<WebButton
				src="/buttons/sun.gif"
				title="Godspeed, Sun."
			/>
			{/* TODO: update this to mozilla's latest shenanigans */}
			<WebButton
				src="/buttons/firefox.gif"
				title="Firefox is EVIL!"
				href="https://lunduke.locals.com/post/5871895/mozilla-firefox-goes-anti-privacy-pro-advertising"
			/>
			<WebButton
				src="/buttons/ieborg.gif"
				title="Resistance is futile."
			/>
			<WebButton
				src="/buttons/iecrash.gif"
				title="Possibly more unstable than Xcode."
			/>
			<WebButton
				src="/buttons/ieduh.gif"
				title="Are YOU retarded?"
			/>
			<WebButton
				src="/buttons/ieexplode.gif"
				title="Kaboom!"
			/>
			<WebButton
				src="/buttons/iexploiter.gif"
				title="Bill Gates has a Micro Soft."
			/>
			<WebButton
				src="/buttons/nodrugs.gif"
				title="The Windows Mind Virus!"
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
				src="/buttons/beos_now_anim.gif"
				title="Download Haiku!"
				href="https://haiku-os.org"
			/>
			<WebButton
				src="/buttons/mariokart.gif"
				title="Play some Mario Kart!"
				href="https://bomberfish.ca/N64Wasm"
			/>
			<WebButton
				src="/buttons/vocaloid.gif"
				title="Vocaloid NOW!!"
			/>
			<WebButton
				src="/buttons/iframsuc.gif"
				title="Iframes SUCK!"
			/>
			<WebButton
				src="/buttons/necoarc-88x31.gif"
				title="the profaned one"
				href="https://necoarc.dev"
			/>
			<WebButton
				src="/buttons/xkcd.gif"
				title="XKCD"
				href="https://xkcd.com"
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
			<WebButton
				src="/buttons/talker.gif"
				title="This website really does talk!"
				on:click={()=>{
					if ('speechSynthesis' in window) {
						window.speechSynthesis.cancel();
						const text = prompt("Enter text to speak:");
						if (text) {
							const utterance = new SpeechSynthesisUtterance(text);
							window.speechSynthesis.speak(utterance);
						}
					} else {
						alert("your browser sucks!")
					}
				}}
			/>
			<WebButton
				src="/buttons/newgrounds.gif"
				href="https://newgrounds.com"
				title="Newgrounds!"
			/>
			<WebButton
				src="/buttons/modarchive.gif"
				href="https://modarchive.org"
				title="The Mod Archive"
			/>
			<WebButton
				src="/buttons/github.gif"
				href="https://github.com"
				title="Social Coding!"
			/>
			<WebButton
				src="/buttons/stop.gif"
				title="STOP"
			/>
			<WebButton
				src="/buttons/javanow.gif"
				title="Java is underrated"
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
			fadein 0.35s,
			fadeout 0.35s 1.75s;
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
