import { CITY_COORDINATES } from '@/app/constants/translations';

/**
 * Calculate distance between two coordinates in kilometers using Haversine formula
 */
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return Infinity;
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Detect the closest supported city from coordinates.
 * Returns cityId (e.g. 'tky', 'osk', 'kyo', 'bkk') if within maxDistanceKm (default 70km),
 * otherwise returns 'other'.
 */
export function detectCityFromCoords(lat, lng, maxDistanceKm = 70) {
  if (lat == null || lng == null) return 'other';

  let closestCity = 'other';
  let minDistance = Infinity;

  Object.entries(CITY_COORDINATES).forEach(([cityId, coords]) => {
    const dist = calculateDistanceKm(lat, lng, coords.lat, coords.lng);
    if (dist < minDistance) {
      minDistance = dist;
      closestCity = cityId;
    }
  });

  if (minDistance <= maxDistanceKm) {
    return closestCity;
  }

  return 'other';
}

/**
 * Normalize place name for lenient duplicate comparison (case-insensitive, remove spaces/punctuation)
 */
export function normalizePlaceName(name) {
  if (!name || typeof name !== 'string') return '';
  return name
    .toLowerCase()
    .replace(/[\s\-_.,()'"/\\+]/g, '')
    .trim();
}

/**
 * Check if a place is duplicate against a collection of existing places
 * Criteria:
 * 1. GPS distance <= 40 meters (0.04 km)
 * OR
 * 2. Normalized name match (and not empty)
 */
export function checkIsDuplicate(place, existingPlaces = []) {
  if (!place || !Array.isArray(existingPlaces) || existingPlaces.length === 0) {
    return { isDuplicate: false, matchedPlace: null };
  }

  const normTarget = normalizePlaceName(place.name);

  for (const existing of existingPlaces) {
    if (!existing) continue;

    // Check 1: GPS coordinate proximity (<= 40 meters)
    if (place.lat && place.lng && existing.lat && existing.lng) {
      const distKm = calculateDistanceKm(place.lat, place.lng, existing.lat, existing.lng);
      if (distKm <= 0.04) { // 40 meters
        return { isDuplicate: true, matchedPlace: existing, matchReason: 'gps' };
      }
    }

    // Check 2: Normalized name exact match
    if (normTarget.length >= 2) {
      const normExisting = normalizePlaceName(existing.name);
      if (normExisting.length >= 2 && normTarget === normExisting) {
        return { isDuplicate: true, matchedPlace: existing, matchReason: 'name' };
      }
    }
  }

  return { isDuplicate: false, matchedPlace: null };
}
