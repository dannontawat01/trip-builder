import { isIP } from 'node:net';

const CLEANUP_INTERVAL_MS = 60_000;

// In-memory only: limits are per server instance, not shared across serverless instances.
export function createRateLimiter({ limit, windowMs, maxKeys = 10_000 }) {
  const hitsByKey = new Map();
  let lastCleanup = 0;

  function cleanup(now) {
    if (hitsByKey.size < maxKeys && now - lastCleanup < CLEANUP_INTERVAL_MS) return;
    lastCleanup = now;
    for (const [key, timestamps] of hitsByKey) {
      const recent = timestamps.filter((timestamp) => now - timestamp < windowMs);
      if (recent.length === 0) hitsByKey.delete(key);
      else hitsByKey.set(key, recent);
    }
  }

  return function check(key, now = Date.now()) {
    cleanup(now);
    if (!hitsByKey.has(key) && hitsByKey.size >= maxKeys) return { allowed: false, retryAfterSeconds: Math.ceil(windowMs / 1000) };
    const recent = (hitsByKey.get(key) || []).filter((timestamp) => now - timestamp < windowMs);
    if (recent.length >= limit) {
      hitsByKey.set(key, recent);
      const retryAfterMs = windowMs - (now - recent[0]);
      return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)) };
    }
    recent.push(now);
    hitsByKey.set(key, recent);
    return { allowed: true, retryAfterSeconds: 0 };
  };
}

export function getClientIp(headers, { trustedHeader = process.env.TRUSTED_PROXY_IP_HEADER } = {}) {
  if (!trustedHeader) return 'unknown';
  const value = headers?.get?.(trustedHeader)?.trim();
  return value && isIP(value) ? value : 'unknown';
}

export function rateLimitResponse(retryAfterSeconds) {
  return new Response(JSON.stringify({ error: 'Too many requests' }), {
    status: 429,
    headers: { 'Content-Type': 'application/json', 'Retry-After': String(retryAfterSeconds) }
  });
}

export const checkAiRateLimit = createRateLimiter({ limit: 10, windowMs: 60_000 });
