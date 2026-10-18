import { NextResponse } from 'next/server';
import sharp from 'sharp';

// Private IP checks to prevent SSRF
function isPrivateUrl(urlStr) {
  try {
    const parsed = new URL(urlStr);
    const host = parsed.hostname.toLowerCase();
    
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return true;
    if (host === 'metadata.google.internal') return true;
    if (host.startsWith('10.') || host.startsWith('192.168.') || host.startsWith('169.254.')) return true;
    if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)) return true;
    if (!['http:', 'https:'].includes(parsed.protocol)) return true;
    
    return false;
  } catch {
    return true;
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const targetUrl = searchParams.get('url');
    
    if (!targetUrl) {
      return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    if (isPrivateUrl(targetUrl)) {
      return NextResponse.json({ error: 'Invalid or restricted URL' }, { status: 403 });
    }

    // Parse options
    const widthParam = parseInt(searchParams.get('w') || '400', 10);
    const width = Math.min(Math.max(widthParam || 400, 50), 1200);
    const qualityParam = parseInt(searchParams.get('q') || '75', 10);
    const quality = Math.min(Math.max(qualityParam || 75, 30), 95);

    // Fast redirect for Known Edge CDNs that already support on-the-fly resizing
    const parsed = new URL(targetUrl);
    if (parsed.hostname.includes('googleusercontent.com')) {
      const baseUrl = targetUrl.replace(/=[ws]\d+.*$/, '');
      const cdnUrl = `${baseUrl}=w${width}-c`;
      return NextResponse.redirect(cdnUrl, 307);
    }

    if (parsed.hostname.includes('images.unsplash.com')) {
      parsed.searchParams.set('auto', 'format');
      parsed.searchParams.set('fit', 'crop');
      parsed.searchParams.set('w', String(width));
      parsed.searchParams.set('q', String(quality));
      return NextResponse.redirect(parsed.toString(), 307);
    }

    // Fetch remote image
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const remoteRes = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
      }
    });
    clearTimeout(timeout);

    if (!remoteRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch source image' }, { status: remoteRes.status });
    }

    const contentType = remoteRes.headers.get('content-type') || '';
    const arrayBuffer = await remoteRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // If SVG or very small image, stream as-is with cache
    if (contentType.includes('svg') || buffer.length < 1024) {
      return new Response(buffer, {
        headers: {
          'Content-Type': contentType || 'image/svg+xml',
          'Cache-Control': 'public, max-age=604800, s-maxage=2592000, stale-while-revalidate=86400'
        }
      });
    }

    // Process & compress with sharp
    try {
      const optimizedBuffer = await sharp(buffer)
        .rotate() // Auto-orient by EXIF
        .resize({ width, withoutEnlargement: true })
        .webp({ quality })
        .toBuffer();

      return new Response(optimizedBuffer, {
        headers: {
          'Content-Type': 'image/webp',
          'Cache-Control': 'public, max-age=604800, s-maxage=2592000, stale-while-revalidate=86400',
          'Vary': 'Accept'
        }
      });
    } catch (sharpError) {
      console.warn('[ImageProxy] Sharp processing failed, returning original:', sharpError.message);
      // Fallback: return original buffer with caching
      return new Response(buffer, {
        headers: {
          'Content-Type': contentType || 'image/jpeg',
          'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400'
        }
      });
    }

  } catch (err) {
    console.error('[ImageProxy] Error handling image:', err.message);
    return NextResponse.json({ error: 'Image proxy error' }, { status: 500 });
  }
}
