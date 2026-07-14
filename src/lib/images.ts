const LOCAL_JPEG_PATH = /^\/[^?#]*\.jpe?g(?:[?#]|$)/i;
const JPEG_EXTENSION = /\.jpe?g(?=[?#]|$)/i;
const JPEG_EXTENSION_IN_SRCSET = /\.jpe?g(?=[\s,?#]|$)/gi;

export function getWebpPath(path: string | undefined) {
	return path && LOCAL_JPEG_PATH.test(path)
		? path.replace(JPEG_EXTENSION, ".webp")
		: undefined;
}

export function getWebpSrcset(srcset: string) {
	return srcset.replace(JPEG_EXTENSION_IN_SRCSET, ".webp");
}
