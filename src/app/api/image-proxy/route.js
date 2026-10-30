import { NextResponse } from 'next/server';
import { safeFetch } from '../../../lib/safeFetch.js';
import { isHttpUrl, isImageCdnHost } from '../../../lib/urlSafety.js';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TIMEOUT_MS = 8000;
const MAX_IMAGE_PIXELS = 40_000_000;
const RASTER_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']);
const RASTER_FORMATS = new Set(['jpeg', 'png', 'webp', 'gif', 'avif', 'heif']);

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const targetUrl = searchParams.get('url');
    
    if (!targetUrl) {
      return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    if (!isHttpUrl(targetUrl)) {
      return NextResponse.json({ error: 'Invalid or restricted URL' }, { status: 403 });
    }

    // Parse options
    const widthParam = parseInt(searchParams.get('w') || '400', 10);
    const width = Math.min(Math.max(widthParam || 400, 50), 1200);
    const qualityParam = parseInt(searchParams.get('q') || '75', 10);
    const quality = Math.min(Math.max(qualityParam || 75, 30), 95);

    // Fast redirect for Known Edge CDNs that already support on-the-fly resizing
    const parsed = new URL(targetUrl);
    let sourceUrl = targetUrl;
    if (isImageCdnHost(parsed.hostname, 'googleusercontent.com')) {
      const baseUrl = targetUrl.replace(/=[ws]\d+.*$/, '');
      sourceUrl = `${baseUrl}=w${width}-c`;
    }

    if (parsed.hostname === 'images.unsplash.com') {
      parsed.searchParams.set('auto', 'format');
      parsed.searchParams.set('fit', 'crop');
      parsed.searchParams.set('w', String(width));
      parsed.searchParams.set('q', String(quality));
      sourceUrl = parsed.toString();
    }

    // Fetch remote image
    const { response: remoteRes } = await safeFetch(sourceUrl, {
      maxBytes: MAX_IMAGE_BYTES,
      timeoutMs: IMAGE_TIMEOUT_MS,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/png,image/jpeg,image/gif'
      }
    });

    if (!remoteRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch source image' }, { status: 502 });
    }

    const contentType = (remoteRes.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (!RASTER_TYPES.has(contentType)) return NextResponse.json({ error: 'Unsupported image type' }, { status: 415 });
    const arrayBuffer = await remoteRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { default: sharpInstance } = await import('sharp');
    const metadata = await sharpInstance(buffer, { limitInputPixels: MAX_IMAGE_PIXELS }).metadata();
    if (!RASTER_FORMATS.has(metadata.format)) return NextResponse.json({ error: 'Unsupported image type' }, { status: 415 });
    const optimizedBuffer = await sharpInstance(buffer, { limitInputPixels: MAX_IMAGE_PIXELS })
          .rotate() // Auto-orient by EXIF
          .resize({ width, withoutEnlargement: true })
          .webp({ quality })
          .toBuffer();

    return new Response(optimizedBuffer, {
          headers: {
            'Content-Type': 'image/webp',
            'X-Content-Type-Options': 'nosniff',
            'Cache-Control': 'public, max-age=604800, s-maxage=2592000, stale-while-revalidate=86400',
            'Vary': 'Accept'
          }
    });

  } catch (err) {
    console.error('[ImageProxy] Request failed:', err.name);
    const status = err.name === 'ResponseTooLargeError' ? 413 : err.name === 'UnsafeUrlError' ? 403 : 502;
    return NextResponse.json({ error: 'Image proxy error' }, { status });
  }
}
