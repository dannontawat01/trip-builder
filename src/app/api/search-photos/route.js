import { NextResponse } from 'next/server';

function extractEnglishQuery(query) {
  // Extract text inside parentheses if it contains English characters
  const match = query.match(/\(([^)]+)\)/);
  if (match && match[1]) {
    const candidate = match[1].trim();
    if (/[a-zA-Z]/.test(candidate)) {
      return candidate;
    }
  }
  
  // Or, extract English words from the query if any
  const englishWords = query.match(/[a-zA-Z0-9\s]{3,}/g);
  if (englishWords) {
    const cleaned = englishWords.join(' ').trim();
    if (cleaned.length > 2) return cleaned;
  }
  
  return null;
}

async function searchWikimedia(query) {
  const attempts = [query];
  
  const engQuery = extractEnglishQuery(query);
  if (engQuery && engQuery !== query) {
    attempts.push(engQuery);
  }
  
  const parts = query.split(/\s+/);
  if (parts.length > 1) {
    attempts.push(parts[0]);
  }

  for (const q of attempts) {
    if (!q) continue;
    const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(q)}&gsrlimit=12&prop=imageinfo&iiprop=url|size&iiurlwidth=400&format=json&origin=*`;
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'TripBuilder/1.0 (contact@tripbuilder-app.com)'
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
          if (photos.length > 0) {
            return photos;
          }
        }
      }
    } catch (e) {
      console.warn(`Wikimedia search failed for query "${q}":`, e.message);
    }
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
    const match = html.match(/vqd=([^&'"]+)/);
    if (match) return match[1];
    const match2 = html.match(/vqd\s*:\s*["']([^"']+)["']/);
    if (match2) return match2[1];
    const match3 = html.match(/vqd\s*=\s*["']([^"']+)["']/);
    if (match3) return match3[1];
  } catch (e) {
    console.warn('Error fetching vqd from DDG:', e.message);
  }
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
        return data.results.slice(0, 12).map(r => r.image).filter(img => typeof img === 'string' && img.startsWith('http'));
      }
    }
  } catch (e) {
    console.warn('Error fetching photos from DDG:', e.message);
  }
  return [];
}

export async function POST(req) {
  try {
    const { query } = await req.json();
    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }
    
    // Try Wikimedia Commons first
    let photos = await searchWikimedia(query);
    
    // Fallback to DuckDuckGo if no images found
    if (!photos || photos.length === 0) {
      photos = await fetchPhotosDDG(query);
    }
    
    return NextResponse.json({ photos });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

