import { clampInt, limitString } from './safeJson.js';
import { readBodyWithLimit } from './safeFetch.js';

const MAX_REQUEST_BYTES = 32 * 1024;
const MAX_AI_OUTPUT_BYTES = 256 * 1024;
const REQUEST_TIMEOUT_MS = 8000;

export async function readJsonRequest(request, maxBytes = MAX_REQUEST_BYTES) {
  const buffer = await readBodyWithLimit(request, maxBytes, AbortSignal.timeout(REQUEST_TIMEOUT_MS));
  const payload = JSON.parse(buffer.toString('utf8'));
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Invalid request');
  return payload;
}

export function validateAiInput(payload) {
  const limits = { query: 200, hotel: 200, city_id: 80, country_id: 80, start_date: 32 };
  for (const [field, maximum] of Object.entries(limits)) {
    if (payload[field] !== undefined && (typeof payload[field] !== 'string' || payload[field].length > maximum)) throw new Error('Invalid request');
  }
  if (payload.num_days !== undefined && (typeof payload.num_days !== 'number' || !Number.isSafeInteger(payload.num_days))) throw new Error('Invalid days');
  if (payload.interests !== undefined && (!Array.isArray(payload.interests) || payload.interests.length > MAX_INTERESTS || payload.interests.some((interest) => typeof interest !== 'string' || interest.length > MAX_INTEREST_LENGTH))) throw new Error('Invalid interests');
  return { ...payload, num_days: Math.max(1, Math.min(MAX_TRIP_DAYS, payload.num_days ?? 3)), interests: sanitizeInterests(payload.interests) };
}

export function parseAiOutput(text, kind, numDays) {
  if (typeof text !== 'string' || Buffer.byteLength(text) > MAX_AI_OUTPUT_BYTES) throw new Error('Invalid AI response');
  const parsed = JSON.parse(text.trim().replace(/^```(?:json)?\s*/, '').replace(/```$/, '').trim());
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid AI response');
  if (kind === 'plan') {
    if (!parsed.itin || typeof parsed.itin !== 'object' || Array.isArray(parsed.itin)) throw new Error('Invalid AI plan');
    return sanitizeAiPlan(parsed, numDays);
  }
  if (!Array.isArray(parsed.places)) throw new Error('Invalid AI suggestions');
  return sanitizeAiSuggestions(parsed);
}

export const MAX_TRIP_DAYS = 15;
export const MAX_AI_QUERY_LENGTH = 200;
export const MAX_INTERESTS = 10;
const MAX_INTEREST_LENGTH = 50;
const MAX_PLACES_PER_DAY = 8;
const MAX_SUGGESTED_PLACES = 8;
const MAX_TEXT_LENGTH = 500;
const MAX_SHORT_TEXT_LENGTH = 120;
const MIN_DURATION_MINUTES = 15;
const MAX_DURATION_MINUTES = 720;
const DEFAULT_DURATION_MINUTES = 90;

function toCoordinate(value, limit) {
  const numeric = typeof value === 'number' ? value : NaN;
  return Number.isFinite(numeric) && Math.abs(numeric) <= limit ? numeric : null;
}

export function sanitizeInterests(interests) {
  if (!Array.isArray(interests)) return [];
  return interests
    .filter((interest) => typeof interest === 'string')
    .slice(0, MAX_INTERESTS)
    .map((interest) => limitString(interest, MAX_INTEREST_LENGTH));
}

export function sanitizeAiPlace(place) {
  if (!place || typeof place !== 'object') return null;
  const name = limitString(place.name, MAX_SHORT_TEXT_LENGTH).trim();
  if (!name) return null;
  return {
    ...(Number.isFinite(Number(place.id)) ? { id: Number(place.id) } : {}),
    name,
    cat: limitString(place.cat, MAX_SHORT_TEXT_LENGTH) || 'อื่นๆ',
    dur: clampInt(place.dur, MIN_DURATION_MINUTES, MAX_DURATION_MINUTES, DEFAULT_DURATION_MINUTES),
    icon: limitString(place.icon, 8) || '📍',
    desc: limitString(place.desc, MAX_TEXT_LENGTH),
    addr: limitString(place.addr, MAX_TEXT_LENGTH),
    lat: toCoordinate(place.lat, 90),
    lng: toCoordinate(place.lng, 180),
    fee: limitString(place.fee, MAX_SHORT_TEXT_LENGTH),
    transport: limitString(place.transport, MAX_TEXT_LENGTH)
  };
}

export function sanitizeAiPlan(data, numDays) {
  const sourceItin = data && typeof data === 'object' && data.itin && typeof data.itin === 'object' ? data.itin : {};
  const itin = {};
  for (let day = 1; day <= clampInt(numDays, 1, MAX_TRIP_DAYS, 3); day++) {
    const dayPlaces = Array.isArray(sourceItin[day]) ? sourceItin[day] : [];
    itin[day] = dayPlaces.slice(0, MAX_PLACES_PER_DAY).map(sanitizeAiPlace).filter(Boolean);
  }
  return { itin };
}

export function sanitizeAiSuggestions(data) {
  const places = data && Array.isArray(data.places) ? data.places : [];
  return { places: places.slice(0, MAX_SUGGESTED_PLACES).map(sanitizeAiPlace).filter(Boolean) };
}
