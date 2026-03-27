import { Viewer, ViewerConfig } from "@photo-sphere-viewer/core";
import {
	AutorotatePlugin,
	AutorotatePluginConfig,
} from "@photo-sphere-viewer/autorotate-plugin";
import "@photo-sphere-viewer/core/index.css";
import { Component, css } from "dreamland/core";

interface PhotoSphereProps {
	src: string;
	fallback?: string;
	viewerConfig?: Partial<
		Omit<ViewerConfig, "container" | "panorama" | "plugins">
	>;
	autorotateConfig?: Partial<AutorotatePluginConfig>;
}

export const PhotoSphere: Component<PhotoSphereProps, {}> = function (cx) {
	let viewer: Viewer | null = null;

	cx.mount = () => {
		const container = cx.root.querySelector(
			".photo-sphere-viewer"
		) as HTMLElement;
		const fallbackEl = cx.root.querySelector(
			".photo-sphere-fallback"
		) as HTMLElement;
		const hintEl = cx.root.querySelector(".photo-sphere-hint") as HTMLElement;

		if (container) {
			viewer = new Viewer({
				navbar: false,
				mousewheel: false,
				...this.viewerConfig,
				container,
				panorama: this.src,
				plugins: [
					[
						AutorotatePlugin,
						{
							autorotateSpeed: "0.5rpm",
							autostartDelay: 1000,
							autostartOnIdle: true,
							...this.autorotateConfig,
						},
					],
				],
			});

			viewer.addEventListener("ready", () => {
				if (fallbackEl) {
					fallbackEl.style.display = "none";
				}
				container.style.opacity = "1";

				if (hintEl) {
					hintEl.classList.add("visible");
					setTimeout(() => {
						hintEl.classList.remove("visible");
					}, 2000);
				}
			});
		}
	};

	const isMobile =
		typeof navigator !== "undefined" &&
		/iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
	const hintText = isMobile
		? "Drag to look around"
		: "Click and drag to look around";

	return (
		<div class="photo-sphere">
			<img
				class="photo-sphere-fallback"
				src={this.fallback ?? this.src}
				alt="360° panorama"
			/>
			<div class="photo-sphere-viewer"></div>
			<div class="photo-sphere-hint">
				<span class="material-symbols">panorama_photosphere</span>
				<span>{hintText}</span>
			</div>
		</div>
	);
};

PhotoSphere.style = css`
	:scope {
		position: relative;
		width: 100%;
		height: 400px;
		overflow: hidden;
	}

	.photo-sphere-fallback {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.photo-sphere-viewer {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		overflow: hidden;
		opacity: 0;
	}

	.photo-sphere-hint {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		background: rgba(0, 0, 0, 0.7);
		color: white;
		border-radius: 0.5rem;
		font-size: 0.875rem;
		pointer-events: none;
		opacity: 0;
		transition: opacity 0.3s ease;
		z-index: 10;
	}

	.photo-sphere-hint.visible {
		opacity: 1;
	}

	.photo-sphere-hint .material-symbols {
		font-size: 1.25rem;
	}
`;

export default PhotoSphere;
