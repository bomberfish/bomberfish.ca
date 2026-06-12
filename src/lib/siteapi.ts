// client for siteapi (https://github.com/.../siteapi)
// proxies last.fm + mastodon. CORS is wildcard so calling from the browser is fine.

export const SITE_API_BASE = "https://siteapi.bomberfish-industries.workers.dev";

export interface LastfmProfile {
	totalScrobbles: number | null;
	registeredAt: string | null; // ISO 8601
}

export interface LastfmTrack {
	nowPlaying: boolean;
	name: string;
	artist: string;
	artistUrl: string | null;
	album: string;
	albumUrl: string | null;
	url: string;
	image: string | null;
	playedAt: string | null; // ISO 8601; null when nowPlaying
	loved: boolean;
	duration: number | null; // milliseconds; null when unknown
	userPlayCount: number | null;
	globalPlayCount: number | null;
	listeners: number | null;
	tags: string[]; // up to 5 top-tag names
}

export interface LastfmResponse {
	user: string;
	profile: LastfmProfile | null;
	track: LastfmTrack | null;
}

export interface MastodonAttachment {
	type: string;
	url: string;
	previewUrl: string | null;
	description: string | null;
	blurhash: string | null;
	width: number | null;
	height: number | null;
}

export interface MastodonStatus {
	id: string;
	url: string | null;
	createdAt: string;
	editedAt: string | null;
	visibility: string;
	sensitive: boolean;
	spoilerText: string;
	language: string | null;
	content: string; // raw HTML
	counts: { replies: number; reblogs: number; favourites: number };
	account: {
		displayName: string;
		acct: string;
		url: string;
		avatar: string;
		avatarDescription: string | null;
		header: string;
		headerDescription: string | null;
		followersCount: number | null;
	};
	attachments: MastodonAttachment[];
}

export interface MastodonResponse {
	status: MastodonStatus | null;
}

export type SiteApiError =
	| { error: "method_not_allowed" }
	| { error: "missing_api_key" }
	| { error: "upstream_unreachable"; detail: string }
	| { error: "upstream_error"; status: number }
	| { error: "upstream_invalid_json"; detail: string }
	| { error: "lastfm_error"; code: number; message?: string }
	| { error: "upstream_unexpected_shape" }
	| { error: string; [k: string]: unknown };

async function fetchJson<T>(
	path: string,
	signal?: AbortSignal,
	cacheBust?: boolean,
): Promise<T> {
	// when the user explicitly hits refresh, tack on a unique query param so any
	// intermediate caches (browser, CDN, the worker itself) are bypassed.
	const url = cacheBust
		? SITE_API_BASE + path + (path.includes("?") ? "&" : "?") + "_=" + Date.now()
		: SITE_API_BASE + path;
	const init: RequestInit = { signal };
	if (cacheBust) init.cache = "no-store";
	const res = await fetch(url, init);
	const body = await res.json().catch(() => null) as T | SiteApiError | null;
	if (!res.ok || body === null) {
		const code = body && typeof body === "object" && "error" in body ? body.error : `http_${res.status}`;
		throw new Error(String(code));
	}
	return body as T;
}

export const getLastfm = (signal?: AbortSignal, cacheBust?: boolean) =>
	fetchJson<LastfmResponse>("/v1/lastfm", signal, cacheBust);

export const getMastodon = (signal?: AbortSignal, cacheBust?: boolean) =>
	fetchJson<MastodonResponse>("/v1/mastodon", signal, cacheBust);
