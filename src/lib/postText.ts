// Display sizing shared by the X and fediverse cards. Instead of a hard
// "short = big, otherwise small" cutoff, the font scales smoothly with the
// post's visible length so a 100-char and a 101-char post look alike.

const FULL_SIZE_UNTIL = 30; // chars at or below this get the biggest size
const DISPLAY_UNTIL = 180; // chars above this fall back to normal body text
const MAX_REM = 1.9;
const MIN_REM = 1.0;

// A URL reads as a short link no matter how long its text is.
const URL_RE = /https?:\/\/\S+/g;

export function visibleLength(text: string): number {
	return text.replace(URL_RE, "x".repeat(18)).trim().length;
}

/** `null` means "use normal body text"; otherwise a rem size for display text. */
export function displaySize(length: number): number | null {
	if (length <= 0 || length > DISPLAY_UNTIL) return null;
	const t = Math.min(
		1,
		Math.max(0, (length - FULL_SIZE_UNTIL) / (DISPLAY_UNTIL - FULL_SIZE_UNTIL)),
	);
	return +(MAX_REM - (MAX_REM - MIN_REM) * t).toFixed(3);
}
