/**
 * Returns an optimized image URL by either rewriting directly to edge CDNs (Google/Unsplash)
 * or routing through the server-side WebP image proxy.
 *
 * @param {string} src - Original image URL
 * @param {number} width - Target width in pixels (default: 400)
 * @returns {string} - Optimized URL ready for browser consumption
 */
export function getOptimizedImageUrl(src, width = 400) {
  if (!src || typeof src !== 'string') return '';
  if (src.startsWith('data:') || src.startsWith('blob:')) return src;

  // Local static files
  if (src.startsWith('/') && !src.startsWith('//')) return src;

  try {
    const url = new URL(src);

    // Google usercontent (Google Maps place photos) -> Direct CDN rewrite (0ms server latency)
    if (url.hostname.includes('googleusercontent.com')) {
      const height = Math.round(width * 0.625);
      const cleanUrl = src.replace(/=[ws]\d+.*$/, '');
      return `${cleanUrl}=w${width}-h${height}-c`;
    }

    // Unsplash -> Direct CDN rewrite (0ms server latency)
    if (url.hostname.includes('images.unsplash.com')) {
      url.searchParams.set('auto', 'format');
      url.searchParams.set('fit', 'crop');
      url.searchParams.set('w', String(width));
      url.searchParams.set('q', '75');
      return url.toString();
    }

    // Other external URLs (Wikimedia, DuckDuckGo, custom links) -> Route to WebP Image Proxy
    return `/api/image-proxy?url=${encodeURIComponent(src)}&w=${width}&q=75`;
  } catch {
    return src;
  }
}
