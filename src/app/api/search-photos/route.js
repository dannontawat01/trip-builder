import { NextResponse } from 'next/server';
import { getSmartCategoryCover, getBrandPlacePhotos, BRAND_PLACE_IMAGES } from '@/app/constants/translations';

const photoCache = new Map();

function extractEnglishQuery(query) {
  const match = query.match(/\(([^)]+)\)/);
  if (match && match[1]) {
    const candidate = match[1].trim();
    if (/[a-zA-Z]/.test(candidate)) return candidate;
  }
  const englishWords = query.match(/[a-zA-Z0-9\s]{3,}/g);
  if (englishWords) {
    const cleaned = englishWords.join(' ').trim();
    if (cleaned.length > 2) return cleaned;
  }
  return null;
}

async function searchWikipedia(query) {
  const cleanQ = query.replace(/\(.*?\)/g, '').trim();
  const endpoints = [
    `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(cleanQ)}&gsrlimit=4&prop=pageimages&pithumbsize=800&format=json&origin=*`,
    `https://ja.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(cleanQ)}&gsrlimit=4&prop=pageimages&pithumbsize=800&format=json&origin=*`,
    `https://th.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(cleanQ)}&gsrlimit=4&prop=pageimages&pithumbsize=800&format=json&origin=*`
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'TripBuilder/1.0 (https://github.com/dannontawat01/trip-builder; contact@tripbuilder.app)'
        }
      });
      if (res.ok) {
        const data = await res.json();
        const pages = Object.values(data.query?.pages || {});
        const photos = [];
        for (const p of pages) {
          if (p.thumbnail?.source && typeof p.thumbnail.source === 'string') {
            photos.push(p.thumbnail.source);
          }
        }
        if (photos.length > 0) return photos;
      }
    } catch {}
  }
  return [];
}

async function searchWikimedia(query) {
  const attempts = [query];
  const engQuery = extractEnglishQuery(query);
  if (engQuery && engQuery !== query) attempts.push(engQuery);
  const parts = query.split(/\s+/);
  if (parts.length > 1) attempts.push(parts[0]);

  for (const q of attempts) {
    if (!q) continue;
    const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(q)}&gsrlimit=8&prop=imageinfo&iiprop=url|size&iiurlwidth=800&format=json&origin=*`;
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'TripBuilder/1.0 (https://github.com/dannontawat01/trip-builder; contact@tripbuilder.app)'
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.query && data.query.pages) {
          const pages = Object.values(data.query.pages)
            .sort((a, b) => (a.index || 0) - (b.index || 0));
          const photos = [];
          for (const page of pages) {
            if (page.imageinfo && page.imageinfo[0]) {
              const info = page.imageinfo[0];
              const imgUrl = info.thumburl || info.url;
              if (imgUrl && imgUrl.startsWith('http')) {
                photos.push(imgUrl);
              }
            }
          }
          if (photos.length > 0) return photos;
        }
      }
    } catch {}
  }
  return [];
}

async function getVqd(query) {
  const url = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    const html = await res.text();
    const match = html.match(/vqd=["']([^"']+)["']/) || html.match(/vqd=([^&'"\s]+)/);
    if (match) return match[1];
  } catch {}
  return null;
}

async function fetchPhotosDDG(query) {
  if (!query) return [];
  const vqd = await getVqd(query);
  if (!vqd) return [];
  
  const url = `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}&f=,,,`;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://duckduckgo.com/'
      }
    });
    if (res.ok) {
      const data = await res.json();
      if (data.results && Array.isArray(data.results)) {
        return data.results
          .slice(0, 8)
          .map(r => r.image)
          .filter(img => typeof img === 'string' && img.startsWith('http') && !img.includes('data:image'));
      }
    }
  } catch {}
  return [];
}

async function searchYahooJapan(query) {
  if (!query) return [];
  const cleanQ = query.replace(/\(.*?\)/g, '').trim();
  const url = `https://search.yahoo.co.jp/image/search?p=${encodeURIComponent(cleanQ)}`;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8'
      }
    });
    if (res.ok) {
      const html = await res.text();
      const imgUrls = html.match(/https:\/\/msp\.c\.yimg\.jp\/images\/v2\/[^"'\s<>]+\.(?:jpg|jpeg|png|webp)/gi) || [];
      const unique = Array.from(new Set(imgUrls));
      if (unique.length > 0) {
        return unique.slice(0, 6);
      }
    }
  } catch {}
  return [];
}

async function resolvePlacePhotos(query, city = '', cat = '') {
  const cacheKey = `${query}_${city}_${cat}`.toLowerCase().trim();
  if (photoCache.has(cacheKey)) {
    return photoCache.get(cacheKey);
  }

  const photos = [];

  // 1. Check Brand & Specific Landmark Matching
  const placeMock = { name: query, cat: cat || '', city_id: city };
  const brandPhotos = getBrandPlacePhotos(query) || getBrandPlacePhotos(placeMock);
  if (brandPhotos && brandPhotos.length > 0) {
    const result = {
      photos: brandPhotos,
      cover_image: brandPhotos[0]
    };
    photoCache.set(cacheKey, result);
    return result;
  }

  // 2. Search Yahoo Japan Image Search (Authentic Japanese Storefront & Place Visuals)
  const yahooPhotos = await searchYahooJapan(`${query} ${city}`.trim());
  if (yahooPhotos.length > 0) {
    photos.push(...yahooPhotos);
  }

  // 3. Search Wikipedia & Wikimedia Commons
  if (photos.length < 3) {
    const wikiPhotos = await searchWikipedia(query);
    if (wikiPhotos.length > 0) {
      photos.push(...wikiPhotos);
    }

    const commonsPhotos = await searchWikimedia(query);
    if (commonsPhotos.length > 0) {
      photos.push(...commonsPhotos);
    }
  }

  // 4. Fallback to DDG if not enough photos
  if (photos.length < 3) {
    const ddgPhotos = await fetchPhotosDDG(`${query} ${city}`.trim());
    photos.push(...ddgPhotos);
  }

  const brandCover = getSmartCategoryCover(placeMock, city);
  if (photos.length === 0 && brandCover) {
    photos.push(brandCover);
  }

  const uniquePhotos = Array.from(new Set(photos)).slice(0, 8);
  const result = {
    photos: uniquePhotos,
    cover_image: uniquePhotos[0] || brandCover || null
  };

  if (photoCache.size > 500) {
    const firstKey = photoCache.keys().next().value;
    photoCache.delete(firstKey);
  }
  photoCache.set(cacheKey, result);

  return result;
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || '';
    const city = searchParams.get('city') || '';
    const cat = searchParams.get('cat') || '';

    if (!q) {
      return NextResponse.json({ error: 'q is required' }, { status: 400 });
    }

    const data = await resolvePlacePhotos(q, city, cat);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const q = body.query || body.q || '';
    const city = body.city || '';
    const cat = body.cat || '';

    if (!q) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const data = await resolvePlacePhotos(q, city, cat);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
