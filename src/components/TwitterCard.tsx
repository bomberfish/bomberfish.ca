import { FC, css } from "dreamland/core";
import { getTwitter, Tweet } from "../lib/siteapi";
import { compactNumber } from "../lib/format";
import { displaySize, visibleLength } from "../lib/postText";
import { XIcon } from "./SocialIcons";
import {
	feedHeader,
	feedStatus,
	liveFeed,
	postAuthor,
	postContent,
	postCount,
	postCounts,
} from "./SocialPost";
import { wsrvFormat, wsrvPicture } from "./WsrvPicture";

const REFRESH_MS = 5 * 60_000;

// plain tweet text into paragraphs, with its (already expanded) links
// clickable
function fillText(div: HTMLElement, text: string) {
	const re = /(https?:\/\/[^\s]+)/g;
	for (const p of text.split(/\n{2,}/)) {
		const para = document.createElement("p");
		p.split(re).forEach((part, i) => {
			if (i % 2) {
				const a = document.createElement("a");
				a.href = part;
				a.target = "_blank";
				a.rel = "noopener";
				a.textContent = part.replace(/^https?:\/\/(www\.)?/, "");
				para.append(a);
			} else {
				const lines = part.split("\n");
				lines.forEach((l, j) => {
					if (j) para.append(document.createElement("br"));
					para.append(l);
				});
			}
		});
		div.append(para);
	}
	return div;
}

function TwitterCard(this: FC) {
	const { state, onRefresh } = liveFeed<Tweet>(
		this,
		async (signal, cacheBust) => (await getTwitter(signal, cacheBust)).tweet,
		REFRESH_MS
	);

	return (
		<div class="livecard feed-card twitter-card background-container">
			{feedHeader({
				icon: <XIcon />,
				platform: "X",
				state,
				onRefresh,
				followers: (s) => s.account.followersCount,
				url: (s) => s.url,
				fallbackUrl: "https://x.com/bomberfish77",
			})}

			{use(state.view).map((v) => {
				if (v.kind !== "loaded") return feedStatus(v);

				const s = v.item;
				const att = s.attachments[0];
				// posts with a link card / quote are secondary content, keep text normal
				const size =
					s.card || s.quote ? null : displaySize(visibleLength(s.text));
				const img = att ?? null;
				const bleedSrc = img ? img.previewUrl || img.url : s.card?.image;
				return (
					<>
						{bleedSrc ? (
							<div
								class={
									"feed-post-bleed feed-post-bleed-" + (att?.type ?? "image")
								}
								aria-hidden="true"
							>
								{att && (att.type === "video" || att.type === "gifv") ? (
									<video
										src={att.url}
										poster={
											att.previewUrl ? wsrvFormat(att.previewUrl, "jpg") : undefined
										}
										autoplay
										loop
										muted
										playsinline
									/>
								) : (
									wsrvPicture(bleedSrc, { alt: "", loading: "lazy" })
								)}
							</div>
						) : null}
						<div class="post feed-post">
							{postAuthor({
								url: s.account.url,
								avatar: s.account.avatar,
								avatarAlt: "",
								name: s.account.displayName,
								handle: `@${s.account.screenName}`,
							})}
							<div class="feed-post-body">
								{fillText(postContent(size), s.text)}
								{s.card ? (
									<a
										class="tweet-linkcard"
										href={s.card.url}
										target="_blank"
										rel="noopener"
									>
										<span class="tweet-linkcard-domain">{s.card.domain}</span>
										<span class="tweet-linkcard-title">{s.card.title}</span>
										{s.card.description ? (
											<span class="tweet-linkcard-desc">
												{s.card.description}
											</span>
										) : null}
									</a>
								) : null}
								{s.quote ? (
									<a
										class="tweet-quote"
										href={s.quote.url}
										target="_blank"
										rel="noopener"
									>
										<span class="tweet-quote-author">
											{s.quote.account.displayName}{" "}
											<span class="tweet-quote-handle">
												@{s.quote.account.screenName}
											</span>
										</span>
										<span class="tweet-quote-text">{s.quote.text}</span>
									</a>
								) : null}
							</div>
							{postCounts(s.createdAt, [
								postCount("replies", "reply", s.counts.replies),
								postCount("reposts", "repeat", s.counts.retweets),
								postCount("likes", "favorite", s.counts.likes),
								s.counts.views != null
									? postCount("views", "visibility", compactNumber(s.counts.views))
									: null,
							])}
						</div>
					</>
				);
			})}
		</div>
	);
}

// Styles: .livecard-* and the shared post styles (.feed-*) are in
// src/style.css; only the link card / quote tweet are here.
TwitterCard.style = css`
	.tweet-linkcard,
	.tweet-quote {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		padding: 0.5rem 0.65rem;
		border: 1px solid var(--surface2);
		background: hsla(var(--surface0-hsl), 0.5);
		color: inherit;
		text-decoration: none !important;
		font-size: 0.82rem;
		min-width: 0;
	}

	.tweet-linkcard::after,
	.tweet-quote::after {
		display: none !important;
	}

	.tweet-linkcard-domain,
	.tweet-quote-handle {
		color: var(--subtext1);
		font-size: 0.75rem;
	}

	.tweet-linkcard-title,
	.tweet-quote-author {
		font-weight: 600;
		color: var(--text);
	}

	.tweet-linkcard-desc,
	.tweet-quote-text {
		color: var(--subtext0);
		overflow-wrap: anywhere;
		display: -webkit-box;
		-webkit-line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
`;

export default TwitterCard;
