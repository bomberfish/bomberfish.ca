import { FC, createState, Stateful } from "dreamland/core";
import { ViewerConfig } from "@photo-sphere-viewer/core";
import { AutorotatePluginConfig } from "@photo-sphere-viewer/autorotate-plugin";
import Sidebar from "../components/Sidebar";
import PhotoSphere from "../components/PhotoSphere";

interface PhotoSphereToolState {
	imageSrc: string | null;
	viewerConfig: Partial<ViewerConfig>;
	autorotateConfig: Partial<AutorotatePluginConfig>;
}

let state: Stateful<PhotoSphereToolState> = createState({
	imageSrc: null,
	viewerConfig: {
		defaultPitch: 0,
		defaultYaw: 0,
	},
	autorotateConfig: {
		autorotateSpeed: "0.5rpm",
		autostartDelay: 1000,
	},
});

export function PhotoSphereTool(this: FC) {
	const handleFileChange = (e: Event) => {
		const input = e.target as HTMLInputElement;
		if (input.files && input.files[0]) {
			const file = input.files[0];
			const url = URL.createObjectURL(file);
			state.imageSrc = url;
		}
	};

	return (
		<main>
			<link rel="stylesheet" href="/legacy.css" />
			<title>photosphere viewer – bomberfish.ca</title>
					<h2>photosphere viewer</h2>

					<div>
						<label>
							image
							<input
								type="file"
								accept="image/*"
								on:change={handleFileChange}
							/>
						</label>
					</div>

					<div>
						<label>
							autorotate speed
							<input
								type="text"
								value={use(state.autorotateConfig.autorotateSpeed)}
								on:input={(e: Event) => {
									state.autorotateConfig = {
										...state.autorotateConfig,
										autorotateSpeed: (e.target as HTMLInputElement).value,
									};
								}}
							/>
						</label>
					</div>

					<div>
						<label>
							autostart delay (ms)
							<input
								type="number"
								value={use(state.autorotateConfig.autostartDelay)}
								on:input={(e: Event) => {
									state.autorotateConfig = {
										...state.autorotateConfig,
										autostartDelay:
											parseInt((e.target as HTMLInputElement).value) || 0,
									};
								}}
							/>
						</label>
					</div>

					<div>
						<label>
							default pitch
							<input
								type="number"
								step="0.1"
								value={use(state.viewerConfig.defaultPitch)}
								on:input={(e: Event) => {
									state.viewerConfig = {
										...state.viewerConfig,
										defaultPitch:
											parseFloat((e.target as HTMLInputElement).value) || 0,
									};
								}}
							/>
						</label>
					</div>

					<div>
						<label>
							default yaw
							<input
								type="number"
								step="0.1"
								value={use(state.viewerConfig.defaultYaw)}
								on:input={(e: Event) => {
									state.viewerConfig = {
										...state.viewerConfig,
										defaultYaw:
											parseFloat((e.target as HTMLInputElement).value) || 0,
									};
								}}
							/>
						</label>
					</div>

					{use(state.imageSrc).map((src) =>
						src ? (
							<PhotoSphere
								src={src}
								viewerConfig={state.viewerConfig}
								autorotateConfig={state.autorotateConfig}
							/>
						) : (
							<span>upload an image to view</span>
						)
					)}
		</main>
	);
}

export default PhotoSphereTool;
