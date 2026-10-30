export function safeParseJson(text, fallback) {
  if (typeof text !== 'string' || text === '') return fallback;
  try {
    const parsed = JSON.parse(text);
    return parsed === null || parsed === undefined ? fallback : parsed;
  } catch {
    return fallback;
  }
}

export function safeArrayJson(text) {
  const parsed = safeParseJson(text, []);
  return Array.isArray(parsed) ? parsed.filter(item => item && typeof item === 'object' && !Array.isArray(item)) : [];
}

export function clampInt(value, min, max, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

export function limitString(value, maxLength) {
  if (typeof value !== 'string') return '';
  return value.slice(0, maxLength);
}
