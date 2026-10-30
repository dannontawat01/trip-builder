import { clampInt, safeParseJson } from './safeJson.js';

export const MAX_TRIP_DAYS = 15;
export const MAX_NOTE_LENGTH = 1000;
export const MAX_SHARE_LENGTH = 8000;
export const EMPTY_BOOKINGS = { flights: [], hotels: [] };
const PUBLIC_STOP_FIELDS = ['id', 'itinId', 'name', 'names', 'cat', 'dur', 'icon', 'city_id', 'lat', 'lng', 'addr', 'desc', 'descriptions', 'fee', 'transport', 'cover_image', 'photos', 'photoUrl', 'note', 'rating', 'gmaps_url', 'google_place_id', 'travelTime', 'travelMode', 'travelDistKm'];
const BOOKING_LIMIT = 100;
const TEXT_LIMIT = 200;
const PRIVATE_ROOM_BOOKINGS_KEY = 'tb_private_room_bookings_v1';

export function restorePersonalUser(storage, useCloud) {
  const stored = safeParseJson(storage.getItem(useCloud ? 'tb_sheet_user' : 'tb_mock_user'), null);
  return stored && typeof stored.email === 'string' && stored.email.trim() ? stored : null;
}

export function createPrivateRoomBookingStore(storage) {
  const keyFor = (code, identity) => JSON.stringify([PRIVATE_ROOM_BOOKINGS_KEY, code, identity]);
  return {
    read(code, identity) { return normalizeBookings(safeParseJson(storage.getItem(keyFor(code, identity)), EMPTY_BOOKINGS)); },
    write(code, identity, bookings) {
      const normalized = normalizeBookings(bookings);
      const key = keyFor(code, identity);
      if (!normalized.flights.length && !normalized.hotels.length) storage.removeItem(key);
      else storage.setItem(key, JSON.stringify(normalized));
    }
  };
}

export function roomPlanPayload(plan, sharedBookings = EMPTY_BOOKINGS, includePrivateBookings = false) {
  const shared = normalizeBookings(sharedBookings);
  const privateBookings = normalizeBookings(plan.bookings);
  const bookings = includePrivateBookings ? Object.fromEntries(Object.keys(EMPTY_BOOKINGS).map(kind => [kind,
    [...new Map([...shared[kind], ...privateBookings[kind]].map(booking => [booking.id, booking])).values()]
  ])) : shared;
  return normalizePlan({ ...plan, bookings });
}

export function stablePlanJson(value) {
  return JSON.stringify(value, (_key, entry) => entry && typeof entry === 'object' && !Array.isArray(entry)
    ? Object.fromEntries(Object.keys(entry).sort().map(key => [key, entry[key]])) : entry);
}

function validCalendarValue(value, kind) {
  const parsed = new Date(`${value}${kind === 'flights' ? ':00Z' : 'T00:00:00Z'}`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, kind === 'flights' ? 16 : 10) === value;
}

export function validateStopDetails(note = '', photoUrl = '') {
  if (typeof note !== 'string' || note.length > MAX_NOTE_LENGTH) throw new Error('NOTE_TOO_LONG');
  if (typeof photoUrl !== 'string') throw new Error('PHOTO_HTTPS');
  if (photoUrl) {
    let parsed;
    try { parsed = new URL(photoUrl); } catch { throw new Error('PHOTO_HTTPS'); }
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || photoUrl.length > 2048) throw new Error('PHOTO_HTTPS');
  }
  return { note, photoUrl };
}

export function normalizeBookings(value) {
  const parsed = typeof value === 'string' ? safeParseJson(value, EMPTY_BOOKINGS) : value;
  return Object.fromEntries(Object.keys(EMPTY_BOOKINGS).map(kind => [kind,
    (Array.isArray(parsed?.[kind]) ? parsed[kind] : []).slice(0, BOOKING_LIMIT).flatMap(booking => {
      try { return [validateBooking(kind, booking)]; } catch { return []; }
    })
  ]));
}

export function validateBooking(kind, booking) {
  if (!booking || !['flights', 'hotels'].includes(kind) || typeof booking.name !== 'string' || !booking.name.trim() || booking.name.length > TEXT_LIMIT) throw new Error('BOOKING_NAME');
  const fields = kind === 'flights' ? ['from', 'to', 'departure', 'arrival'] : ['checkIn', 'checkOut', 'address'];
  const normalized = { id: String(booking.id || globalThis.crypto.randomUUID()), name: booking.name.trim() };
  for (const field of [...fields, 'confirmationCode']) {
    if (booking[field] != null && (typeof booking[field] !== 'string' || booking[field].length > TEXT_LIMIT)) throw new Error('BOOKING_FIELDS');
    normalized[field] = (booking[field] || '').trim();
  }
  const start = kind === 'flights' ? normalized.departure : normalized.checkIn;
  const end = kind === 'flights' ? normalized.arrival : normalized.checkOut;
  const pattern = kind === 'flights' ? /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/ : /^\d{4}-\d{2}-\d{2}$/;
  if (!pattern.test(start) || !pattern.test(end) || !validCalendarValue(start, kind) || !validCalendarValue(end, kind) || end < start || (kind === 'hotels' && end === start)) throw new Error('BOOKING_DATES');
  if (kind === 'flights' && (!normalized.from || !normalized.to)) throw new Error('BOOKING_FIELDS');
  return normalized;
}

export function normalizePlan(value = {}) {
  const plan = value && typeof value === 'object' ? value : {};
  const nDays = clampInt(plan.n_days ?? plan.nDays ?? plan.days, 1, MAX_TRIP_DAYS, 3);
  const source = typeof plan.itin === 'string' ? safeParseJson(plan.itin, {}) : plan.itin;
  const itin = Object.fromEntries(Array.from({ length: nDays }, (_, index) => {
    const day = index + 1;
    return [day, (Array.isArray(source?.[day]) ? source[day] : []).filter(stop => stop && typeof stop === 'object').map(stop => {
      const clean = Object.fromEntries(PUBLIC_STOP_FIELDS.filter(key => Object.hasOwn(stop, key)).map(key => [key, stop[key]]));
      clean.dur = clampInt(clean.dur, 1, 1440, 90);
      clean.name = typeof clean.name === 'string' ? clean.name : '';
      try { Object.assign(clean, validateStopDetails(clean.note || '', clean.photoUrl || '')); }
      catch { clean.note = ''; clean.photoUrl = ''; }
      return clean;
    })];
  }));
  return { ...plan, nDays, itin, bookings: normalizeBookings(plan.bookings) };
}

export function publicPlan(plan, includePrivateBookings = false) {
  const normalized = normalizePlan(plan);
  const shared = { v: 2, days: normalized.nDays, itin: normalized.itin, city_id: plan.city_id, start: plan.start, time: plan.time, hotel: plan.hotel };
  if (includePrivateBookings) shared.bookings = normalized.bookings;
  return shared;
}

export function cloudPlanPayload(plan, countryId) {
  const normalized = normalizePlan(plan);
  return {
    name: normalized.name,
    city_id: normalized.city_id,
    country_id: countryId,
    start_date: normalized.start,
    start_time: normalized.time,
    hotel: normalized.hotel || '',
    n_days: normalized.nDays,
    itin: normalized.itin,
    checklist: Array.isArray(normalized.checklist) ? normalized.checklist : [],
    budget: normalized.budget,
    bookings: normalized.bookings
  };
}

export function shareUrl(base, plan, includePrivateBookings = false) {
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(publicPlan(plan, includePrivateBookings)))));
  const url = `${base.split('?')[0].split('#')[0]}?view=1&trip=${encodeURIComponent(encoded)}`;
  if (url.length > MAX_SHARE_LENGTH) throw new Error('SHARE_TOO_LONG');
  return url;
}

export function daysBetween(start, end, fallback) {
  const difference = Math.round((Date.parse(end) - Date.parse(start)) / 86400000) + 1;
  return Number.isFinite(difference) && difference > 0 ? clampInt(difference, 1, MAX_TRIP_DAYS, fallback) : fallback;
}