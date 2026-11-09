/**
 * Resolve the preferred image URL for catalog rendering.
 * Bundled illustrative product assets always have a WebP counterpart. Older
 * database rows may still point at the historical JPEG URL, so upgrade those
 * paths at render time. Merchant uploads under /media keep their original URL
 * unless the upload record explicitly supplies webp_url.
 */
export function getPreferredProductImageUrl(image?: {
  url?: string | null;
  webp_url?: string | null;
} | null): string | undefined {
  if (!image) return undefined;
  if (image.webp_url) return image.webp_url;
  const url = image.url?.trim();
  if (!url) return undefined;
  if (url.startsWith('/images/products/') && /\.jpe?g$/i.test(url)) {
    return url.replace(/\.jpe?g$/i, '.webp');
  }
  return url;
}
