// @ts-nocheck
import isMobile from "./IsMobile";

var _eventHandlers = {}; // somewhere global

const addListener = (node, event, handler, capture = false) => {
	if (!(event in _eventHandlers)) {
		_eventHandlers[event] = [];
	}
	// here we track the events and their nodes (note that we cannot
	// use node as Object keys, as they'd get coerced into a string
	_eventHandlers[event].push({
		node: node,
		handler: handler,
		capture: capture,
	});
	node.addEventListener(event, handler, capture);
};

const removeAllListeners = (targetNode, event) => {
	// check if _eventHandlers[event] is defined
	if (_eventHandlers[event]) {
		// remove listeners from the matching nodes
		_eventHandlers[event]
			.filter(({ node }) => node === targetNode)
			.forEach(({ node, handler, capture }) =>
				node.removeEventListener(event, handler, capture)
			);

		// update _eventHandlers global
		_eventHandlers[event] = _eventHandlers[event].filter(
			({ node }) => node !== targetNode
		);
	}
};

export function oneko() {
	if (isMobile({ tablet: true })) {
		return;
	}
	console.log("ONEKO INIT");
	const nekoRem = 2.75;
	const isReducedMotion =
		window.matchMedia(`(prefers-reduced-motion: reduce)`) === true ||
		window.matchMedia(`(prefers-reduced-motion: reduce)`).matches === true;

	if (isReducedMotion) return;

	const nekoEl = document.createElement("div");

	function convertRemToPixels(rem) {
		return (
			rem * parseFloat(getComputedStyle(document.documentElement).fontSize)
		);
	}

	let i = convertRemToPixels(3.5);
	let j = convertRemToPixels(2);

	let nekoPosX = i + j;
	let nekoPosY = i + 32;

	let mousePosX = i + j;
	let mousePosY = i + 32;

	let frameCount = 0;
	let idleTime = 0;
	let idleAnimation = null;
	let idleAnimationFrame = 0;

	const nekoSpeed = (16 * nekoRem) / 3;
	const spriteSets = {
		idle: [[-3, -3]],
		alert: [[-7, -3]],
		scratchSelf: [
			[-5, 0],
			[-6, 0],
			[-7, 0],
		],
		scratchWallN: [
			[0, 0],
			[0, -1],
		],
		scratchWallS: [
			[-7, -1],
			[-6, -2],
		],
		scratchWallE: [
			[-2, -2],
			[-2, -3],
		],
		scratchWallW: [
			[-4, 0],
			[-4, -1],
		],
		tired: [[-3, -2]],
		sleeping: [
			[-2, 0],
			[-2, -1],
		],
		N: [
			[-1, -2],
			[-1, -3],
		],
		NE: [
			[0, -2],
			[0, -3],
		],
		E: [
			[-3, 0],
			[-3, -1],
		],
		SE: [
			[-5, -1],
			[-5, -2],
		],
		S: [
			[-6, -3],
			[-7, -2],
		],
		SW: [
			[-5, -3],
			[-6, -1],
		],
		W: [
			[-4, -2],
			[-4, -3],
		],
		NW: [
			[-1, 0],
			[-1, -1],
		],
	};

	function init() {
		nekoEl.style.transition = "0.5s opacity";
		nekoEl.id = "oneko";
		nekoEl.ariaHidden = true;
		nekoEl.style.width = `${nekoRem}rem`;
		nekoEl.style.height = `${nekoRem}rem`;
		nekoEl.style.backgroundSize = `${convertRemToPixels(nekoRem) * 8}px ${
			convertRemToPixels(nekoRem) * 4
		}px`;
		nekoEl.style.position = "fixed";
		nekoEl.style.pointerEvents = "none";
		nekoEl.style.imageRendering = "pixelated";
		nekoEl.style.left = `${nekoPosX - 16}px`;
		nekoEl.style.top = `${nekoPosY - 16}px`;
		nekoEl.style.zIndex = Number.MAX_VALUE;
		setTimeout(() => {
			nekoEl.style.opacity = 1;
		}, 2);

		let nekoFile = "/oneko.gif";
		nekoEl.style.backgroundImage = `url(${nekoFile})`;

		document.body.appendChild(nekoEl);

		document.addEventListener("mousemove", function (event) {
			if (!document.getElementById("oneko")) {
				init();
			}
			mousePosX = event.clientX;
			mousePosY = event.clientY;
		});

		window.requestAnimationFrame(onAnimationFrame);
	}

	let lastFrameTimestamp;

	function onAnimationFrame(timestamp) {
		// Stops execution if the neko element is removed from DOM
		if (!nekoEl.isConnected) {
			return;
		}
		if (!lastFrameTimestamp) {
			lastFrameTimestamp = timestamp;
		}
		if (timestamp - lastFrameTimestamp > 100) {
			lastFrameTimestamp = timestamp;
			frame();
		}
		window.requestAnimationFrame(onAnimationFrame);
	}

	function setSprite(name, frame) {
		const sprite = spriteSets[name][frame % spriteSets[name].length];
		nekoEl.style.backgroundPosition = `${
			sprite[0] * convertRemToPixels(nekoRem)
		}px ${sprite[1] * convertRemToPixels(nekoRem)}px`;
	}

	function resetIdleAnimation() {
		idleAnimation = null;
		idleAnimationFrame = 0;
	}

	function idle() {
		idleTime += 1;

		// every ~ 12 seconds
		if (
			idleTime > 6 &&
			Math.floor(Math.random() * 200) == 0 &&
			idleAnimation == null
		) {
			let avalibleIdleAnimations = ["sleeping", "scratchSelf"];
			if (nekoPosX < 16 * nekoRem - 20) {
				avalibleIdleAnimations.push("scratchWallW");
			}
			if (nekoPosY < 16 * nekoRem - 20) {
				avalibleIdleAnimations.push("scratchWallN");
			}
			if (nekoPosX > window.innerWidth - (16 * nekoRem - 20)) {
				avalibleIdleAnimations.push("scratchWallE");
			}
			if (nekoPosY > window.innerHeight - (16 * nekoRem - 20)) {
				avalibleIdleAnimations.push("scratchWallS");
			}
			console.log(avalibleIdleAnimations);
			idleAnimation =
				avalibleIdleAnimations[
					Math.floor(Math.random() * avalibleIdleAnimations.length)
				];
		}

		switch (idleAnimation) {
			case "sleeping":
				if (idleAnimationFrame < 8) {
					setSprite("tired", 0);
					break;
				}
				setSprite("sleeping", Math.floor(idleAnimationFrame / 4));
				removeAllListeners(nekoEl, "click");
				addListener(nekoEl, "click", () => {
					resetIdleAnimation();
				});
				if (idleAnimationFrame > 192) {
					resetIdleAnimation();
				}
				break;
			case "scratchWallN":
			case "scratchWallS":
			case "scratchWallE":
			case "scratchWallW":
			case "scratchSelf":
				setSprite(idleAnimation, idleAnimationFrame);
				if (idleAnimationFrame > 9) {
					resetIdleAnimation();
				}
				break;
			default:
				setSprite("idle", 0);
				return;
		}
		idleAnimationFrame += 1;
	}

	function frame() {
		frameCount += 1;
		const diffX = nekoPosX - mousePosX;
		const diffY = nekoPosY - mousePosY;
		const distance = Math.sqrt(diffX ** 2 + diffY ** 2);

		if (distance < nekoSpeed || distance < 48) {
			idle();
			return;
		}

		idleAnimation = null;
		idleAnimationFrame = 0;

		if (idleTime > 1) {
			setSprite("alert", 0);
			// count down after being alerted before moving
			idleTime = Math.min(idleTime, 3.5);
			idleTime -= 1;
			return;
		}

		let direction;
		direction = diffY / distance > 0.5 ? "N" : "";
		direction += diffY / distance < -0.5 ? "S" : "";
		direction += diffX / distance > 0.5 ? "W" : "";
		direction += diffX / distance < -0.5 ? "E" : "";
		setSprite(direction, frameCount);

		nekoPosX -= (diffX / distance) * nekoSpeed;
		nekoPosY -= (diffY / distance) * nekoSpeed;

		nekoPosX = Math.min(Math.max(16, nekoPosX), window.innerWidth - 16);
		nekoPosY = Math.min(Math.max(16, nekoPosY), window.innerHeight - 16);

		nekoEl.style.left = `${nekoPosX - 16}px`;
		nekoEl.style.top = `${nekoPosY - 16}px`;
	}

	init();
}
