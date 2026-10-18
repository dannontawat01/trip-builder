/**
 * Helper to build Google Maps walking route URL
 * @param {Array<{ lat: number|string, lng: number|string, name?: string, names?: object }>} items
 * @param {string} [lang='th']
 * @returns {string|null}
 */
export function getGmapsWalkingRouteUrl(items, lang = 'th') {
  if (!Array.isArray(items) || items.length === 0) return null;

  // Filter items with valid numeric coordinates
  const valid = items.filter(item => {
    if (!item) return false;
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lng);
    return !isNaN(lat) && !isNaN(lng);
  });

  if (valid.length === 0) return null;

  if (valid.length === 1) {
    const place = valid[0];
    const placeName = (place.names && place.names[lang]) || place.name || '';
    const query = placeName ? `${placeName} ${place.lat},${place.lng}` : `${place.lat},${place.lng}`;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }

  const origin = `${valid[0].lat},${valid[0].lng}`;
  const destination = `${valid[valid.length - 1].lat},${valid[valid.length - 1].lng}`;

  // Intermediate stops (waypoints) - Google Maps Universal Directions URL supports up to 9 waypoints
  const intermediate = valid.slice(1, -1).slice(0, 9);
  const waypoints = intermediate.map(p => `${p.lat},${p.lng}`).join('|');

  let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;
  if (waypoints) {
    url += `&waypoints=${encodeURIComponent(waypoints)}`;
  }
  url += '&travelmode=walking';

  return url;
}

/**
 * Share or copy walking route URL
 * @param {{ url: string, title?: string, text?: string, onToast?: (msg: string) => void, copiedMsg?: string }} options
 */
export async function shareGmapsRoute({ url, title = 'Walking Route', text = 'เส้นทางเดิน Google Maps', onToast, copiedMsg = 'คัดลอกลิงก์เส้นทางแล้ว!' }) {
  if (!url) return false;

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title,
        text,
        url,
      });
      return true;
    } catch (err) {
      if (err && err.name === 'AbortError') return false;
      // Fallback to clipboard if share failed
    }
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(url);
      if (onToast) onToast(copiedMsg);
      return true;
    } catch (_) {
      return false;
    }
  }

  return false;
}
