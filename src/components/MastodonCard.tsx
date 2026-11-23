import { Tile } from "../metro-dreamland";
import { FC } from "dreamland/core";
import { getMastodon, MastodonStatus } from "../lib/siteapi";
import { displaySize, visibleLength } from "../lib/postText";
import { MastodonIcon } from "./SocialIcons";
import {
	feedHeader,
	feedStatus,
	liveFeed,
	postAuthor,
	postContent,
	postCount,
	postCounts,
	postMedia,
	PostShot,
	shotsOf,
} from "./SocialPost";

const REFRESH_MS = 5 * 60_000;

function MastodonCard(this: FC) {
	const { state, onRefresh } = liveFeed<MastodonStatus>(
		this,
		async (signal, cacheBust) => (await getMastodon(signal, cacheBust)).status,
		REFRESH_MS
	);

	return (
		<Tile color="indigo" class="livecard feed-card mastodon-card">
			{feedHeader({
				icon: <MastodonIcon />,
				platform: "fediverse",
				state,
				onRefresh,
				followers: (s) => s.account.followersCount,
				url: (s) => s.url,
				fallbackUrl: "https://wetdry.world/@fish",
			})}

			{use(state.view).map((v) => {
				if (v.kind !== "loaded") return feedStatus(v);

				const s = v.item;
				const shots = shotsOf(s.attachments).map(
					(a): PostShot => ({
						kind: a.type as PostShot["kind"],
						src: a.url,
						poster: a.previewUrl,
						alt: a.description,
						width: a.width,
						height: a.height,
					})
				);
				const media = postMedia(shots, {
					href: s.url,
					sensitive: s.sensitive,
				});
				const audio = s.attachments.filter((a) => a.type === "audio");
				// what came with the post that isn't on the tile: said, in the
				// counts, as how many there are
				const unseen = s.attachments.length - shots.length - audio.length;
				// twitter-style: short posts get the big-font display treatment,
				// regardless of whether they have an attachment. strip tags to
				// get a rough plain-length (mastodon content is just <p>/<a>/<br>,
				// so a regex is fine here)
				const plain = s.content.replace(/<[^>]+>/g, "").trim();
				const size = displaySize(visibleLength(plain));
				// The content is the upstream status HTML. Trusted: it comes from
				// the user's own mastodon instance, proxied through their own
				// worker.
				const content = postContent(size);
				content.innerHTML = s.content;
				return (
					<>
						{media}
						<div class={"post feed-post" + (media ? " is-caption" : "")}>
							{postAuthor({
								url: s.account.url,
								avatar: s.account.avatar,
								avatarAlt: s.account.avatarDescription || "",
								name: s.account.displayName,
								handle: `@${s.account.acct}@wetdry.world`,
							})}
							<div class="feed-post-body">
								{s.spoilerText ? (
									<p class="feed-post-spoiler">{s.spoilerText}</p>
								) : null}
								{plain ? content : null}
								{audio.map((a) => (
									<audio class="feed-post-audio" src={a.url} controls />
								))}
							</div>
							{postCounts(s.createdAt, [
								postCount("replies", "reply", s.counts.replies),
								postCount("boosts", "repeat", s.counts.reblogs),
								postCount("favourites", "star", s.counts.favourites),
								unseen > 0
									? postCount(
											"attachments",
											"attachment",
											unseen < s.attachments.length ? `+${unseen}` : unseen
										)
									: null,
							])}
						</div>
					</>
				);
			})}
		</Tile>
	);
}

// Styles: .livecard-* and the shared post styles (.feed-*) are in
// src/style.css.

export default MastodonCard;
