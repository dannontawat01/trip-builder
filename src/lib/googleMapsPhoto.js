// Scrapes the real cover photos of a place from Google Maps (no API key).
// Fragile by nature: every step returns null/[] on failure so callers can fall back.

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const REQUEST_TIMEOUT_MS = 8000;
const SEARCH_RADIUS_METERS = 600;
const MAX_PHOTOS = 6;
const CACHE_LIMIT = 500;
const PHOTO_SIZE_SUFFIX = '=w800-h500-k-no';
// [6][51] starts with the primary image shown on the Google Maps place page;
// [6][37] contains additional gallery photos.
const PHOTO_GROUP_INDEXES = [51, 37];
const PLACE_ID_PATTERN = /placeid(?:=|\\u003d)(ChIJ[\w-]{20,})/;
const PREVIEW_LINK_PATTERN = /href="(\/maps\/preview\/place\?[^"]+)"/;
const GOOGLE_PHOTO_PATTERN = /^https:\/\/lh[0-9]\.googleusercontent\.com\/(?!a-?\/)/;

const photoCache = new Map();

function googleFetch(url) {
  return fetch(url, {
    headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'en-US,en;q=0.9' },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });
}

function normalizePhotoUrl(rawUrl) {
  return `${rawUrl.replace(/=[^=/]*$/, '')}${PHOTO_SIZE_SUFFIX}`;
}

async function findPlaceId(name, lat, lng) {
  const viewport = `!4m12!1m3!1d${SEARCH_RADIUS_METERS}!2d${lng}!3d${lat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!7i5!10b1!12m4!2m3!5m1!6e2!20e3!19u1`;
  const url = `https://www.google.com/search?tbm=map&authuser=0&hl=en&gl=us&pb=${viewport}&q=${encodeURIComponent(name)}`;
  const response = await googleFetch(url);
  if (!response.ok) return null;
  const match = (await response.text()).match(PLACE_ID_PATTERN);
  return match ? match[1] : null;
}

async function fetchPreviewPayload(placeId) {
  const pageResponse = await googleFetch(`https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(placeId)}&hl=en`);
  if (!pageResponse.ok) return null;
  const link = (await pageResponse.text()).match(PREVIEW_LINK_PATTERN);
  if (!link) return null;

  const previewResponse = await googleFetch(`https://www.google.com${link[1].replace(/&amp;/g, '&')}`);
  if (!previewResponse.ok) return null;
  const body = (await previewResponse.text()).replace(/^\uFEFF/, '').replace(/^\)\]\}'\s*/, '');
  return JSON.parse(body);
}

function extractPhotos(payload) {
  const placeData = payload?.[6];
  if (!Array.isArray(placeData)) return [];
  const photos = [];
  for (const groupIndex of PHOTO_GROUP_INDEXES) {
    const group = placeData[groupIndex]?.[0];
    if (!Array.isArray(group)) continue;
    for (const entry of group) {
      const candidate = entry?.[6]?.[0];
      if (typeof candidate === 'string' && GOOGLE_PHOTO_PATTERN.test(candidate)) {
        photos.push(normalizePhotoUrl(candidate));
      }
    }
  }
  return Array.from(new Set(photos)).slice(0, MAX_PHOTOS);
}

/**
 * Returns up to 6 real Google Maps photos for the place, or [] when unavailable.
 */
export async function fetchGoogleMapsPhotos(name, lat, lng) {
  if (!name || lat == null || lng == null || lat === '' || lng === '') return [];
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return [];

  const cacheKey = `${name}|${latitude.toFixed(4)}|${longitude.toFixed(4)}`.toLowerCase();
  if (photoCache.has(cacheKey)) return photoCache.get(cacheKey);

  let photos = [];
  try {
    const placeId = await findPlaceId(name, latitude, longitude);
    if (placeId) photos = extractPhotos(await fetchPreviewPayload(placeId));
  } catch (error) {
    console.warn('Google Maps photo lookup failed:', error.message);
    return [];
  }

  if (photoCache.size >= CACHE_LIMIT) photoCache.delete(photoCache.keys().next().value);
  photoCache.set(cacheKey, photos);
  return photos;
}

export { extractPhotos, normalizePhotoUrl };
