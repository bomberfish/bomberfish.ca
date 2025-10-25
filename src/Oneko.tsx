import { Component, css } from "dreamland/core";
import isMobile from "./IsMobile";

const NEKO_REM = 2.75;

const SPRITE_SETS = {
	idle: [[-3, -3]] as const,
	alert: [[-7, -3]] as const,
	scratchSelf: [
		[-5, 0],
		[-6, 0],
		[-7, 0],
	] as const,
	scratchWallN: [
		[0, 0],
		[0, -1],
	] as const,
	scratchWallS: [
		[-7, -1],
		[-6, -2],
	] as const,
	scratchWallE: [
		[-2, -2],
		[-2, -3],
	] as const,
	scratchWallW: [
		[-4, 0],
		[-4, -1],
	] as const,
	tired: [[-3, -2]] as const,
	sleeping: [
		[-2, 0],
		[-2, -1],
	] as const,
	N: [
		[-1, -2],
		[-1, -3],
	] as const,
	NE: [
		[0, -2],
		[0, -3],
	] as const,
	E: [
		[-3, 0],
		[-3, -1],
	] as const,
	SE: [
		[-5, -1],
		[-5, -2],
	] as const,
	S: [
		[-6, -3],
		[-7, -2],
	] as const,
	SW: [
		[-5, -3],
		[-6, -1],
	] as const,
	W: [
		[-4, -2],
		[-4, -3],
	] as const,
	NW: [
		[-1, 0],
		[-1, -1],
	] as const,
} as const;

type SpriteName = keyof typeof SPRITE_SETS;
type DirectionName = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";
type IdleAnimationName = Exclude<SpriteName, DirectionName>;

type OnekoState = {
	mouseX: number;
	mouseY: number;
	posX: number;
	posY: number;
	frameCount: number;
	idleTime: number;
	idleAnimation: IdleAnimationName | undefined;
	idleAnimationFrame: number;
	lastFrameTimestamp: number | undefined;
	animationFrameId: number | undefined;
	cleanedUp: boolean;
	mutationObserver: MutationObserver | undefined;
	nekoSpeed: number;
	reduceMotionQuery: MediaQueryList | undefined;
	spriteName: SpriteName;
	spriteFrame: number;
	opacity: number;
	enabled: boolean;
};

declare global {
	interface Window {
		__onekoCleanup?: () => void;
	}
}

const Oneko: Component<{}, OnekoState> = function (cx) {
	this.posX = 0;
	this.posY = 0;
	this.mouseX = 0;
	this.mouseY = 0;
	this.frameCount = 0;
	this.idleTime = 0;
	this.idleAnimation = undefined;
	this.idleAnimationFrame = 0;
	this.lastFrameTimestamp = undefined;
	this.animationFrameId = undefined;
	this.cleanedUp = false;
	this.mutationObserver = undefined;
	this.nekoSpeed = 0;
	this.reduceMotionQuery = undefined;
	this.spriteName = "idle";
	this.spriteFrame = 0;
	this.opacity = 0;
	this.enabled = true;

	const convertRemToPixels = (rem: number) =>
		rem * parseFloat(getComputedStyle(document.documentElement).fontSize);

	const resetIdleAnimation = () => {
		this.idleAnimation = undefined;
		this.idleAnimationFrame = 0;
	};

	const setSprite = (name: SpriteName, frame: number) => {
		const spriteSet = SPRITE_SETS[name];
		const sprite = spriteSet[frame % spriteSet.length];
		if (!sprite) {
			return;
		}
		this.spriteName = name;
		this.spriteFrame = frame;
	};

	const handleWake = () => {
		if (this.idleAnimation === "sleeping") {
			resetIdleAnimation();
			this.idleTime = 0;
		}
	};

	const idle = () => {
		this.idleTime += 1;

		if (
			this.idleTime > 6 &&
			Math.floor(Math.random() * 200) === 0 &&
			this.idleAnimation == null
		) {
			const availableAnimations: IdleAnimationName[] = [
				"sleeping",
				"scratchSelf",
			];
			if (this.posX < 16 * NEKO_REM - 20) {
				availableAnimations.push("scratchWallW");
			}
			if (this.posY < 16 * NEKO_REM - 20) {
				availableAnimations.push("scratchWallN");
			}
			if (this.posX > window.innerWidth - (16 * NEKO_REM - 20)) {
				availableAnimations.push("scratchWallE");
			}
			if (this.posY > window.innerHeight - (16 * NEKO_REM - 20)) {
				availableAnimations.push("scratchWallS");
			}

			this.idleAnimation =
				availableAnimations[
					Math.floor(Math.random() * availableAnimations.length)
				];
			this.idleAnimationFrame = 0;
		}

		switch (this.idleAnimation) {
			case "sleeping":
				if (this.idleAnimationFrame < 8) {
					setSprite("tired", 0);
					break;
				}
				setSprite("sleeping", Math.floor(this.idleAnimationFrame / 4));
				if (this.idleAnimationFrame > 192) {
					resetIdleAnimation();
				}
				break;
			case "scratchWallN":
			case "scratchWallS":
			case "scratchWallE":
			case "scratchWallW":
			case "scratchSelf":
				setSprite(this.idleAnimation!, this.idleAnimationFrame);
				if (this.idleAnimationFrame > 9) {
					resetIdleAnimation();
				}
				break;
			default:
				setSprite("idle", 0);
				return;
		}

		this.idleAnimationFrame += 1;
	};

	const getDirection = (
		diffX: number,
		diffY: number,
		distance: number
	): DirectionName => {
		let direction = "";
		if (diffY / distance > 0.5) direction += "N";
		if (diffY / distance < -0.5) direction += "S";
		if (diffX / distance > 0.5) direction += "W";
		if (diffX / distance < -0.5) direction += "E";
		return direction as DirectionName;
	};

	const frame = () => {
		this.frameCount += 1;
		const diffX = this.posX - this.mouseX;
		const diffY = this.posY - this.mouseY;
		const distance = Math.hypot(diffX, diffY);

		if (distance < this.nekoSpeed || distance < 48) {
			idle();
			return;
		}

		resetIdleAnimation();

		if (this.idleTime > 1) {
			setSprite("alert", 0);
			this.idleTime = Math.min(this.idleTime, 3.5);
			this.idleTime -= 1;
			return;
		}

		const direction = getDirection(diffX, diffY, distance);
		setSprite(direction, this.frameCount);

		this.posX -= (diffX / distance) * this.nekoSpeed;
		this.posY -= (diffY / distance) * this.nekoSpeed;

		this.posX = Math.min(Math.max(16, this.posX), window.innerWidth - 16);
		this.posY = Math.min(Math.max(16, this.posY), window.innerHeight - 16);
	};

	const handleMouseMove = (event: MouseEvent) => {
		this.mouseX = event.clientX;
		this.mouseY = event.clientY;
	};

	const cleanup = () => {
		if (this.cleanedUp) {
			return;
		}
		this.cleanedUp = true;
		this.enabled = false;
		this.opacity = 0;
		resetIdleAnimation();

		if (this.animationFrameId != null) {
			window.cancelAnimationFrame(this.animationFrameId);
			this.animationFrameId = undefined;
		}

		document.removeEventListener("mousemove", handleMouseMove);
		if (this.reduceMotionQuery && (this.reduceMotionQuery as any).removeEventListener) {
			(this.reduceMotionQuery as any).removeEventListener(
				"change",
				handleMotionPreferenceChange
			);
		} else if (
			this.reduceMotionQuery &&
			(this.reduceMotionQuery as any).removeListener
		) {
			(this.reduceMotionQuery as any).removeListener(handleMotionPreferenceChange);
		}

		this.mutationObserver?.disconnect();
		this.mutationObserver = undefined;
		this.lastFrameTimestamp = undefined;

		if (window.__onekoCleanup === cleanup) {
			window.__onekoCleanup = undefined;
		}
		this.reduceMotionQuery = undefined;
	};

	const handleMotionPreferenceChange = (event: MediaQueryListEvent) => {
		if (event.matches) {
			cleanup();
		}
	};

	const onAnimationFrame = (timestamp: number) => {
		if (this.cleanedUp) {
			return;
		}

		if (!cx.root.isConnected) {
			cleanup();
			return;
		}

		if (this.lastFrameTimestamp === undefined) {
			this.lastFrameTimestamp = timestamp;
		} else if (timestamp - this.lastFrameTimestamp > 100) {
			this.lastFrameTimestamp = timestamp;
			frame();
		}

		if (!this.cleanedUp) {
			this.animationFrameId = window.requestAnimationFrame(onAnimationFrame);
		}
	};

	cx.mount = () => {
		if (typeof window === "undefined") {
			return;
		}

		const startX = convertRemToPixels(3.5) + convertRemToPixels(2);
		const startY = convertRemToPixels(3.5) + 32;

		this.posX = startX;
		this.posY = startY;
		this.mouseX = startX;
		this.mouseY = startY;
		this.nekoSpeed = convertRemToPixels(NEKO_REM) / 3;
		this.frameCount = 0;
		this.idleTime = 0;
		this.idleAnimationFrame = 0;
		this.lastFrameTimestamp = undefined;
		this.cleanedUp = false;

		const disable = () => {
			this.enabled = false;
			this.opacity = 0;
		};

		if (isMobile({ tablet: true })) {
			disable();
			return;
		}

		this.reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
		if (this.reduceMotionQuery && this.reduceMotionQuery.matches) {
			disable();
			return;
		}

		window.__onekoCleanup?.();

		this.enabled = true;
		setSprite("idle", 0);
		this.opacity = 0;

		this.mutationObserver = new MutationObserver(() => {
			if (!cx.root.isConnected) {
				cleanup();
			}
		});
		this.mutationObserver.observe(document.body, {
			childList: true,
			subtree: true,
		});

		document.addEventListener("mousemove", handleMouseMove, { passive: true });
		if (this.reduceMotionQuery && (this.reduceMotionQuery as any).addEventListener) {
			(this.reduceMotionQuery as any).addEventListener(
				"change",
				handleMotionPreferenceChange
			);
		} else if (
			this.reduceMotionQuery &&
			(this.reduceMotionQuery as any).addListener
		) {
			(this.reduceMotionQuery as any).addListener(handleMotionPreferenceChange);
		}

		this.animationFrameId = window.requestAnimationFrame(onAnimationFrame);
		window.__onekoCleanup = cleanup;

		requestAnimationFrame(() => {
			if (!this.cleanedUp && this.enabled) {
				this.opacity = 1;
			}
		});
	};

	const styleBinding = use(
		this.posX,
		this.posY,
		this.opacity,
		this.spriteName,
		this.spriteFrame,
		this.enabled
	).map(([posX, posY, opacity, spriteName, spriteFrame, enabled]) => {
		if (!enabled) {
			return [
				"display: none",
				"opacity: 0",
				"transform: translate3d(-16px, -16px, 0)",
			].join("; ");
		}

		const spriteSet = SPRITE_SETS[spriteName];
		const sprite = spriteSet[spriteFrame % spriteSet.length];
		const [spriteX, spriteY] = sprite;

        return [
            `transform: translate3d(${posX - 16}px, ${posY - 16}px, 0)`,
            `opacity: ${opacity}`,
            `background-position: ${spriteX * NEKO_REM}rem ${spriteY * NEKO_REM}rem`
        ].join("; ");
	});

	return (
		<div
			id="oneko"
			data-oneko
			aria-hidden="true"
			style={styleBinding}
			on:click={handleWake}
		/>
	);
};

Oneko.style = css`
    :scope {
        position: fixed;
        left: 0;
        top: 0;
        width: ${NEKO_REM.toString()}rem;
        height: ${NEKO_REM.toString()}rem;
        pointer-events: none;
        background-image: url(/oneko.gif);
        background-repeat: no-repeat;
        background-size: ${(NEKO_REM * 8).toString()}rem ${(NEKO_REM * 4).toString()}rem;
        image-rendering: pixelated;
        transition: opacity 0.5s;
        z-index: 2147483647;
        display: block;
        transform: translate3d(-16px, -16px, 0);
        opacity: 0;
        will-change: transform, opacity;
    }
`;

export default Oneko;
