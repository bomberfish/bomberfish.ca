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
	postMedia,
	PostShot,
	shotsOf,
} from "./SocialPost";

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
		<div
			class="livecard feed-card twitter-card tile on-color c-graphite"
			data-m-tilt
			data-m-feather
		>
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
				const shots = shotsOf(s.attachments).map(
					(a): PostShot => ({
						kind: a.type,
						src: a.type === "image" ? a.previewUrl || a.url : a.url,
						poster: a.previewUrl,
						alt: a.description,
						width: a.width,
						height: a.height,
						// (X's video host only answers its own pages, going by the
						// referrer; its pictures come through the image proxy)
						noReferrer: a.type !== "image",
					})
				);
				// a link's own picture has the tile where the post has none (and
				// goes where the link does)
				const linked: PostShot[] =
					!shots.length && s.card?.image
						? [
								{
									kind: "image",
									src: s.card.image,
									width: s.card.imageWidth,
									height: s.card.imageHeight,
								},
							]
						: [];
				const media = linked.length
					? postMedia(linked, { href: s.card!.url })
					: postMedia(shots, { href: s.url, sensitive: s.sensitive });
				// posts with a link card / quote are secondary content, keep text normal
				const size =
					s.card || s.quote ? null : displaySize(visibleLength(s.text));
				return (
					<>
						{media}
						<div class={"post feed-post" + (media ? " is-caption" : "")}>
							{postAuthor({
								url: s.account.url,
								avatar: s.account.avatar,
								avatarAlt: "",
								name: s.account.displayName,
								handle: `@${s.account.screenName}`,
							})}
							<div class="feed-post-body">
								{s.text ? fillText(postContent(size), s.text) : null}
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
									? postCount(
											"views",
											"visibility",
											compactNumber(s.counts.views)
										)
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
	/* A link, or the post this one quotes: a panel of the tile's own ink,
	   thin, with what it is in it. Flat, no rule round it. */
	.tweet-linkcard,
	.tweet-quote {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		padding: 0.5rem 0.65rem 0.55rem;
		background: rgba(var(--ink), 0.1);
		color: inherit;
		text-decoration: none !important;
		font-size: 0.82rem;
		line-height: 1.3;
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
		font-weight: 400;
	}

	.tweet-linkcard-title,
	.tweet-quote-author {
		font-weight: 600;
		color: var(--text);
	}

	.tweet-linkcard-title {
		overflow-wrap: anywhere;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
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

	/* Where the post is a caption over its pictures (every tile but a tall
	   one: "Social post cards" in style.css has the same condition) these
	   keep to a line of it: a link is its title and where it goes, a
	   quoted post who said it and how it starts, side by side. */
	@media (min-width: 60rem), (max-height: 30rem), (min-height: 46rem) {
		.is-caption .tweet-linkcard,
		.is-caption .tweet-quote {
			flex: none;
			flex-direction: row;
			align-items: baseline;
			gap: 0.6rem;
			padding-block: 0.35rem 0.4rem;
		}

		.is-caption .tweet-linkcard-title,
		.is-caption .tweet-quote-text {
			flex: 0 1 auto;
			display: block;
			min-width: 0;
			white-space: nowrap;
			text-overflow: ellipsis;
		}

		.is-caption .tweet-linkcard-domain,
		.is-caption .tweet-quote-author {
			flex: none;
		}

		.is-caption .tweet-linkcard-domain {
			order: 1;
		}

		.is-caption .tweet-linkcard-desc {
			display: none;
		}
	}
`;

export default TwitterCard;
