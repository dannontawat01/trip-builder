import { safeFetch } from '../../../lib/safeFetch.js';
import { createRateLimiter, getClientIp, rateLimitResponse } from '../../../lib/rateLimit.js';

const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const FAILURE_RETRY_MS = 60_000;
const MAX_QUERY_LENGTH = 200;
const MAX_CURRENCIES = 10;
const PROVIDER_HOST = 'api.frankfurter.dev';
const PROVIDER_URL = `https://${PROVIDER_HOST}/v1/latest?base=THB`;
const SUPPORTED_CURRENCIES = Object.freeze(['AUD', 'BRL', 'CAD', 'CHF', 'CNY', 'CZK', 'DKK', 'EUR', 'GBP', 'HKD', 'HUF', 'IDR', 'ILS', 'INR', 'ISK', 'JPY', 'KRW', 'MXN', 'MYR', 'NOK', 'NZD', 'PHP', 'PLN', 'RON', 'SEK', 'SGD', 'THB', 'TRY', 'USD', 'ZAR']);
const DEFAULT_CURRENCIES = ['THB', 'USD', 'JPY', 'KRW', 'EUR', 'TWD'];
const FALLBACK_THB_PER_UNIT = Object.freeze({ THB: 1, USD: 36.5, JPY: 0.23, KRW: 0.027, EUR: 39.5, TWD: 1.15 });
const checkRate = createRateLimiter({ limit: 30, windowMs: 60_000 });
let cachedRates = null;
let inFlight = null;
let retryAt = 0;

function parseProvider(payload) {
  if (payload?.base !== 'THB' || typeof payload.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(payload.date) || !payload.rates || typeof payload.rates !== 'object' || Array.isArray(payload.rates)) throw new Error('Invalid rates');
  const rates = { THB: 1 };
  for (const [currency, value] of Object.entries(payload.rates)) {
    if (!SUPPORTED_CURRENCIES.includes(currency)) continue;
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) throw new Error('Invalid rate');
    rates[currency] = value;
  }
  if (Object.keys(rates).length < 2) throw new Error('Missing rates');
  return { rates, date: payload.date, fetchedAt: Date.now() };
}

async function refreshRates() {
  if (cachedRates && Date.now() - cachedRates.fetchedAt < CACHE_TTL_MS) return;
  if (Date.now() < retryAt) return;
  if (!inFlight) inFlight = (async () => {
    try {
      const { response } = await safeFetch(PROVIDER_URL, { isHostAllowed: (host) => host === PROVIDER_HOST, maxBytes: 64 * 1024, timeoutMs: 8000 });
      if (!response.ok) throw new Error('Rates unavailable');
      cachedRates = parseProvider(await response.json());
      retryAt = 0;
    } catch (error) {
      retryAt = Date.now() + FAILURE_RETRY_MS;
      console.warn('Rates provider unavailable:', error.name);
    } finally {
      inFlight = null;
    }
  })();
  await inFlight;
}

function formatRates(currencies) {
  const unsupportedCurrencies = currencies.filter((currency) => !SUPPORTED_CURRENCIES.includes(currency));
  const rates = {};
  const fallbackRates = {};
  const exchangeRates = {};
  const fresh = cachedRates && Date.now() - cachedRates.fetchedAt < CACHE_TTL_MS;
  for (const currency of currencies) {
    const liveRate = cachedRates?.rates[currency];
    const fallbackRate = FALLBACK_THB_PER_UNIT[currency] ? 1 / FALLBACK_THB_PER_UNIT[currency] : undefined;
    if (liveRate !== undefined && !unsupportedCurrencies.includes(currency)) rates[currency] = liveRate;
    else if (fallbackRate !== undefined) fallbackRates[currency] = fallbackRate;
    const effectiveRate = rates[currency] ?? fallbackRates[currency];
    if (effectiveRate) exchangeRates[currency] = 1 / effectiveRate;
  }
  rates.THB = 1;
  return { base: 'THB', quote: 'currency units per THB', rates, exchangeRates, fallbackRates, supportedCurrencies: SUPPORTED_CURRENCIES, unsupportedCurrencies, unavailableCurrencies: currencies.filter((currency) => currency !== 'THB' && rates[currency] === undefined), date: cachedRates?.date ?? null, fetchedAt: cachedRates ? new Date(cachedRates.fetchedAt).toISOString() : null, source: cachedRates ? 'frankfurter' : 'fallback', stale: Boolean(cachedRates && !fresh), mock: !fresh, cacheTtlSeconds: CACHE_TTL_MS / 1000 };
}

export async function GET(request) {
  const rate = checkRate(getClientIp(request.headers));
  if (!rate.allowed) return rateLimitResponse(rate.retryAfterSeconds);
  const query = new URL(request.url).searchParams.get('currencies');
  if (query !== null && (query.length > MAX_QUERY_LENGTH || !/^[A-Z]{3}(?:,[A-Z]{3})*$/.test(query))) return Response.json({ error: 'Invalid currencies' }, { status: 400 });
  const currencies = query ? [...new Set(query.split(','))] : DEFAULT_CURRENCIES;
  if (currencies.length > MAX_CURRENCIES) return Response.json({ error: 'Too many currencies' }, { status: 400 });
  await refreshRates();
  return Response.json(formatRates(currencies), { headers: { 'Cache-Control': 'no-store' } });
}