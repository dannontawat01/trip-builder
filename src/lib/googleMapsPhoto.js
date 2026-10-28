// Scrapes the real cover photos of a place from Google Maps (no API key).
// Fragile by nature: every step returns null/[] on failure so callers can fall back.

import { isGooglePlaceId } from './googleMapsIdentity.js';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const REQUEST_TIMEOUT_MS = 8000;
const SEARCH_RADIUS_METERS = 600;
const MAX_PHOTOS = 6;
const MAX_SEARCH_DISTANCE_METERS = 50;
const EARTH_RADIUS_METERS = 6371000;
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
export async function fetchGoogleMapsPhotos(name, lat, lng, googlePlaceId = null) {
  if (!name || lat == null || lng == null || lat === '' || lng === '') return [];
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) ||
      Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return [];
  if (googlePlaceId && !isGooglePlaceId(googlePlaceId)) return [];

  const cacheKey = `${googlePlaceId || name}|${latitude}|${longitude}`.toLowerCase();
  if (photoCache.has(cacheKey)) return photoCache.get(cacheKey);

  let photos = [];
  try {
    const placeId = googlePlaceId || await findPlaceId(name, latitude, longitude);
    if (placeId) {
      const payload = await fetchPreviewPayload(placeId);
      if (googlePlaceId || isNearbyPlace(payload, latitude, longitude)) {
        photos = extractPhotos(payload);
      } else {
        console.warn('Google Maps photo lookup: search result did not match coordinates');
      }
    }
  } catch (error) {
    console.warn('Google Maps photo lookup failed:', error.message);
    return [];
  }

  if (photos.length) {
    if (photoCache.size >= CACHE_LIMIT) photoCache.delete(photoCache.keys().next().value);
    photoCache.set(cacheKey, photos);
  }
  return photos;
}

function isNearbyPlace(payload, latitude, longitude) {
  const coordinates = payload?.[6]?.[9];
  const targetLat = coordinates?.[2];
  const targetLng = coordinates?.[3];
  if (!Number.isFinite(targetLat) || !Number.isFinite(targetLng)) return false;
  const radians = Math.PI / 180;
  const latDelta = (targetLat - latitude) * radians;
  const lngDelta = (targetLng - longitude) * radians;
  const haversine = Math.sin(latDelta / 2) ** 2 +
    Math.cos(latitude * radians) * Math.cos(targetLat * radians) * Math.sin(lngDelta / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(haversine))) <= MAX_SEARCH_DISTANCE_METERS;
}

export { extractPhotos, normalizePhotoUrl, isNearbyPlace };
