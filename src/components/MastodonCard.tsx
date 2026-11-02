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
} from "./SocialPost";
import { wsrvPicture } from "./WsrvPicture";

const REFRESH_MS = 5 * 60_000;

function MastodonCard(this: FC) {
	const { state, onRefresh } = liveFeed<MastodonStatus>(
		this,
		async (signal, cacheBust) => (await getMastodon(signal, cacheBust)).status,
		REFRESH_MS
	);

	return (
		<div class="livecard social-card mastodon-card background-container">
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
				const att = s.attachments[0];
				const attachments =
					s.attachments.length +
					(s.attachments.length === 1 ? " attachment" : " attachments");
				// twitter-style: short posts get the big-font display treatment,
				// regardless of whether they have an attachment. (with a bleed bg,
				// the chunky text reads as a poster overlay.) strip tags to get a
				// rough plain-length (mastodon content is just <p>/<a>/<br>, so a
				// regex is fine here)
				const size = displaySize(
					visibleLength(s.content.replace(/<[^>]+>/g, ""))
				);
				// The content is the upstream status HTML. Trusted: it comes from
				// the user's own mastodon instance, proxied through their own
				// worker.
				const content = postContent(size);
				content.innerHTML = s.content;
				return (
					<>
						{att ? (
							<div
								class={"social-post-bleed social-post-bleed-" + att.type}
								aria-hidden="true"
							>
								{(function () {
									switch (att.type) {
										case "image":
											return wsrvPicture(att.url, {
												alt: att.description || "",
												loading: "lazy",
											});
										// videos render muted/looped as a moving bg; the
										// user opens the post URL to view with audio
										case "video":
										case "gifv":
											return (
												<video src={att.url} autoplay loop muted playsinline />
											);
										case "audio":
											return <audio src={att.url} controls />;
										default:
											return (
												<span class="social-post-bleed-fallback">
													<span class="material-symbols">attachment</span>
													{attachments}
												</span>
											);
									}
								})()}
							</div>
						) : null}
						<div class="post social-post">
							{postAuthor({
								url: s.account.url,
								avatar: s.account.avatar,
								avatarAlt: s.account.avatarDescription || "",
								name: s.account.displayName,
								handle: `@${s.account.acct}@wetdry.world`,
							})}
							<div class="social-post-body">
								{s.spoilerText ? (
									<p class="social-post-spoiler">{s.spoilerText}</p>
								) : null}
								{content}
							</div>
							{postCounts(s.createdAt, [
								postCount("replies", "reply", s.counts.replies),
								postCount("boosts", "repeat", s.counts.reblogs),
								postCount("favourites", "star", s.counts.favourites),
								s.attachments.length ? (
									<span>
										<span class="material-symbols">attachment</span>
										{attachments}
									</span>
								) : null,
							])}
						</div>
					</>
				);
			})}
		</div>
	);
}

// Styles: .livecard-* and the shared post styles (.social-*) are in
// src/style.css.

export default MastodonCard;
