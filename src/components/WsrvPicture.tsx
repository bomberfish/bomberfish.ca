// Images siteapi proxies through wsrv.nl. They're requested without an output
// format (format=none, see src/lib/siteapi.ts), so each format is picked
// here: a <picture> offering JPEG XL, then WebP, with a JPEG <img> for
// everything else. Anything that isn't a wsrv URL (img=original, an older
// API deploy) is a plain <img>.
//
// The <picture> is display: contents (style.css), so the <img> lays out and
// gets styled as if it were where the <picture> is. Selectors with `>` need
// to allow for it, though.

const WSRV = "https://wsrv.nl/";

const isWsrv = (src: string) => src.startsWith(WSRV);

// `src` in one output format (jxl, webp, jpg...); non-wsrv URLs as they are
export function wsrvFormat(src: string, output: string) {
	if (!isWsrv(src)) return src;
	const u = new URL(src);
	u.searchParams.set("output", output);
	return u.href;
}

// `img` is the <img>'s attributes (class, alt, loading...)
export function wsrvPicture(src: string, img: Record<string, unknown> = {}) {
	const el = <img {...img} src={wsrvFormat(src, "jpg")} />;
	if (!isWsrv(src)) return el;
	return (
		<picture class="wsrv-picture">
			<source type="image/jxl" srcset={wsrvFormat(src, "jxl")} />
			<source type="image/webp" srcset={wsrvFormat(src, "webp")} />
			{el}
		</picture>
	);
}
