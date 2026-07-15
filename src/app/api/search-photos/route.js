import { NextResponse } from 'next/server';

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

async function fetchPhotos(query) {
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
    const photos = await fetchPhotos(query);
    return NextResponse.json({ photos });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
