// client for siteapi (https://github.com/.../siteapi)
// proxies last.fm + mastodon. CORS is wildcard so calling from the browser is fine.

export const SITE_API_BASE =
	"https://siteapi.bomberfish-industries.workers.dev";

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
	appleMusic?: AppleMusicMatch | null; // absent/null when no match was found
}

export interface AppleMusicMatch {
	id: string;
	url: string;
	previewUrl: string | null; // ~30s AAC (.m4a), CORS-enabled
	artwork: string | null;
	isrc: string | null;
}

export interface LastfmResponse {
	user: string;
	profile: LastfmProfile | null;
	track: LastfmTrack | null;
	// cursor for the scrobbles older than `track` (pass as `before` to
	// getLastfmRecent); null when there's nothing to anchor on, absent from
	// older API deploys
	historyBefore?: number | null;
}

export interface LastfmHistoryTrack {
	name: string;
	artist: string;
	artistUrl: string | null;
	album: string;
	url: string;
	image: string | null;
	playedAt: string; // ISO 8601
	loved: boolean;
	appleMusic: AppleMusicMatch | null;
}

// the extras /v1/lastfm puts on its track, for any track (a history entry
// shown in the card)
export interface LastfmTrackInfo {
	albumUrl: string | null;
	loved: boolean;
	duration: number | null; // milliseconds; null when unknown
	userPlayCount: number | null;
	globalPlayCount: number | null;
	listeners: number | null;
	tags: string[];
}

export interface LastfmTrackInfoResponse {
	user: string;
	info: LastfmTrackInfo | null; // null when Last.fm doesn't know the track
}

export interface LastfmRecentResponse {
	user: string;
	tracks: LastfmHistoryTrack[]; // newest first, never the now-playing track
	next: number | null; // cursor for the page after this one
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

export interface TweetAttachment {
	type: "image" | "video" | "gifv";
	url: string;
	previewUrl: string | null;
	description: string | null;
	width: number | null;
	height: number | null;
}

export interface TweetCard {
	url: string;
	title: string;
	description: string | null;
	domain: string | null;
	image: string | null;
	imageWidth: number | null;
	imageHeight: number | null;
}

export interface Tweet {
	id: string;
	url: string;
	createdAt: string;
	sensitive: boolean;
	language: string | null;
	text: string; // plain text, t.co links already expanded
	inReplyToId: string | null;
	counts: {
		replies: number;
		retweets: number;
		likes: number;
		quotes: number;
		views: number | null;
	};
	account: {
		displayName: string;
		screenName: string;
		url: string;
		avatar: string | null;
		followersCount: number | null;
	};
	attachments: TweetAttachment[];
	links: { url: string; displayUrl: string }[];
	card: TweetCard | null;
	quote: Tweet | null;
}

export interface TwitterResponse {
	tweet: Tweet | null;
}

export interface GithubRepo {
	name: string;
	owner: string;
	url: string;
	description: string | null;
	stars: number;
	language: { name: string; color: string | null } | null;
}

export interface GithubResponse {
	profile: {
		login: string;
		name: string | null;
		bio: string | null;
		pronouns: string | null;
		avatar: string;
		url: string;
		company: string | null;
		location: string | null;
		blog: string | null;
		status: {
			emoji: string | null;
			emojiHtml: string | null;
			message: string | null;
		} | null;
		followers: number;
		following: number;
		publicRepos: number;
	};
	pinned: GithubRepo[];
	contributions: {
		total: number;
		// weeks run Sunday → Saturday; level is 0–4
		weeks: { date: string; count: number; level: number }[][];
	};
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
	cacheBust?: boolean
): Promise<T> {
	// when the user explicitly hits refresh, tack on a unique query param so any
	// intermediate caches (browser, CDN, the worker itself) are bypassed.
	const url = cacheBust
		? SITE_API_BASE +
			path +
			(path.includes("?") ? "&" : "?") +
			"_=" +
			Date.now()
		: SITE_API_BASE + path;
	const init: RequestInit = { signal };
	if (cacheBust) init.cache = "no-store";
	const res = await fetch(url, init);
	const body = (await res.json().catch(() => null)) as T | SiteApiError | null;
	if (!res.ok || body === null) {
		const code =
			body && typeof body === "object" && "error" in body
				? body.error
				: `http_${res.status}`;
		throw new Error(String(code));
	}
	return body as T;
}

// How siteapi should proxy each endpoint's images through wsrv: no output
// format (WsrvPicture picks one per browser), and a quality (1-100). Album
// art and post images are what the cards are about, avatars are small, and
// the social ones are tiny (40px).
const IMAGE_OPTIONS = {
	lastfm: { format: "none", quality: "90" },
	github: { format: "none", quality: "70" },
	social: { format: "none", quality: "80", avatarQuality: "67" },
};

const withImageOptions = (path: string, options: Record<string, string>) =>
	path + "?" + new URLSearchParams(options).toString();

export const getLastfm = (signal?: AbortSignal, cacheBust?: boolean) =>
	fetchJson<LastfmResponse>(
		withImageOptions("/v1/lastfm", IMAGE_OPTIONS.lastfm),
		signal,
		cacheBust
	);

// pages fetched with a cursor are cached for a long time (the cursor moves
// on when a new scrobble lands, so they don't go stale); without one it's
// the live head
export const getLastfmRecent = (
	{ before, limit }: { before?: number | null; limit?: number },
	signal?: AbortSignal
) => {
	const params = new URLSearchParams(IMAGE_OPTIONS.lastfm);
	if (limit != null) params.set("limit", String(limit));
	if (before != null) params.set("before", String(before));
	return fetchJson<LastfmRecentResponse>(
		"/v1/lastfm/recent?" + params.toString(),
		signal
	);
};

// cached for an hour by the worker and the browser
export const getLastfmTrackInfo = (
	artist: string,
	track: string,
	signal?: AbortSignal
) =>
	fetchJson<LastfmTrackInfoResponse>(
		"/v1/lastfm/track?" + new URLSearchParams({ artist, track }).toString(),
		signal
	);

export const getMastodon = (signal?: AbortSignal, cacheBust?: boolean) =>
	fetchJson<MastodonResponse>(
		withImageOptions("/v1/mastodon", IMAGE_OPTIONS.social),
		signal,
		cacheBust
	);

export const getTwitter = (signal?: AbortSignal, cacheBust?: boolean) =>
	fetchJson<TwitterResponse>(
		withImageOptions("/v1/twitter", IMAGE_OPTIONS.social),
		signal,
		cacheBust
	);

export const getGithub = (signal?: AbortSignal, cacheBust?: boolean) =>
	fetchJson<GithubResponse>(
		withImageOptions("/v1/github", IMAGE_OPTIONS.github),
		signal,
		cacheBust
	);
