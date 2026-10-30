// Trip Builder Service Worker - v1.24.0
const CACHE_NAME = 'trip-builder-assets-v1.24.1';
const TILE_CACHE_NAME = 'trip-builder-tiles-v1.24.1';
const MAX_TILES = 300;
const TILE_CACHE_LIMIT = 2000;
const DOWNLOAD_CONCURRENCY = 4;
const TILE_TIMEOUT_MS = 15000;
const MAX_TILE_BYTES = 2 * 1024 * 1024;
const STATIC_PRECACHE = ['/manifest.json', '/icons/icon.svg', '/icons/icon-192.png', '/icons/icon-512.png'];
const PROVIDER_CACHE_KEY = new URL('/__trip_builder_offline_provider__', self.location.origin).href;
const providers = new Map();
const jobs = new Map();
let tileMutation = Promise.resolve();
let tileEpoch = 0;
let savedProviderPromise;
let tileCachingDisabled = false;

function serializeTileMutation(action) {
  const pending = tileMutation.then(action);
  tileMutation = pending.catch(() => {});
  return pending;
}

function validateProvider(provider) {
  if (provider?.licensed !== true || typeof provider.template !== 'string' || provider.template.length > 2048) throw new Error('provider-unavailable');
  const template = provider.template;
  if (!['{z}', '{x}', '{y}'].every(token => template.split(token).length === 2)) throw new Error('provider-unavailable');
  const parsed = new URL(template.replaceAll('{z}', '12').replaceAll('{x}', '1').replaceAll('{y}', '1'));
  const host = parsed.hostname;
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.port || parsed.hash || /[{}\s\\]/.test(template.replaceAll('{z}', '').replaceAll('{x}', '').replaceAll('{y}', ''))) throw new Error('provider-unavailable');
  if (!/^[a-z0-9.-]+$/.test(host) || !host.includes('.') || /^\d[\d.]*$/.test(host) || /(^|\.)(localhost|local|internal|test|invalid)$/.test(host)) throw new Error('provider-unavailable');
  if (/(^|\.)(openstreetmap\.org|cartocdn\.com|carto\.com)$/.test(host)) throw new Error('provider-unavailable');
  if (new URL(template).origin !== parsed.origin || !['{z}', '{x}', '{y}'].every(token => template.slice(template.indexOf('/', 'https://'.length)).includes(token))) throw new Error('provider-unavailable');
  return { template, origin: parsed.origin };
}

function tileUrl(provider, tile) {
  return provider.template.replace('{z}', String(tile.z)).replace('{x}', String(tile.x)).replace('{y}', String(tile.y));
}

function savedProvider() {
  if (!savedProviderPromise) savedProviderPromise = (async () => {
    try {
      const cache = await caches.open(CACHE_NAME);
      const response = await cache.match(PROVIDER_CACHE_KEY);
      return response ? validateProvider(await response.json()) : null;
    } catch (error) {
      console.warn('Offline provider config unavailable:', error.name);
      return null;
    }
  })();
  return savedProviderPromise;
}

async function saveProvider(provider) {
  await savedProvider();
  const cache = await caches.open(CACHE_NAME);
  if (provider) await cache.put(PROVIDER_CACHE_KEY, new Response(JSON.stringify({ template: provider.template, licensed: true }), { headers: { 'content-type': 'application/json' } }));
  else await cache.delete(PROVIDER_CACHE_KEY);
  savedProviderPromise = Promise.resolve(provider);
}

function validateTiles(tiles) {
  if (!Array.isArray(tiles) || !tiles.length || tiles.length > MAX_TILES) throw new Error('invalid-tiles');
  const unique = new Set();
  for (const tile of tiles) {
    if (!tile || !Number.isInteger(tile.z) || tile.z < 12 || tile.z > 16 || !Number.isInteger(tile.x) || !Number.isInteger(tile.y) || tile.x < 0 || tile.y < 0 || tile.x >= 2 ** tile.z || tile.y >= 2 ** tile.z) throw new Error('invalid-tiles');
    unique.add(`${tile.z}/${tile.x}/${tile.y}`);
  }
  if (unique.size !== tiles.length) throw new Error('invalid-tiles');
  return tiles;
}

function isCacheable(response) {
  const variesByIdentity = (response.headers.get('vary') || '').split(',').some(header => ['*', 'cookie', 'authorization'].includes(header.trim().toLowerCase()));
  return response.status === 200 && response.type !== 'opaque' && !response.redirected && !/private|no-store/i.test(response.headers.get('cache-control') || '') && !response.headers.has('set-cookie') && !variesByIdentity;
}

async function boundedTileResponse(response, requireCacheable) {
  if (response.status !== 200 || response.type === 'opaque' || response.redirected || (requireCacheable && !isCacheable(response)) || !/^image\/(png|jpeg|webp|avif)(;|$)/i.test(response.headers.get('content-type') || '')) throw new Error('tile-response');
  if (Number(response.headers.get('content-length')) > MAX_TILE_BYTES || !response.body) throw new Error('tile-size');
  const reader = response.body.getReader();
  const chunks = [];
  let bytes = 0;
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > MAX_TILE_BYTES) throw new Error('tile-size');
      chunks.push(chunk.value);
    }
  } catch (error) {
    await reader.cancel();
    throw error;
  } finally {
    reader.releaseLock();
  }
  const content = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) { content.set(chunk, offset); offset += chunk.byteLength; }
  const headers = new Headers(response.headers);
  headers.delete('content-encoding');
  headers.delete('content-length');
  return new Response(content, { headers });
}

async function fetchTile(url, signal, requireCacheable = true) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) throw new Error('cancelled');
  signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, TILE_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal, credentials: 'omit', mode: 'cors', redirect: 'error', referrerPolicy: 'strict-origin-when-cross-origin' });
    return await boundedTileResponse(response, requireCacheable);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}

async function putTile(url, response, signal, epoch = tileEpoch) {
  return serializeTileMutation(async () => {
    if (tileCachingDisabled || signal?.aborted || epoch !== tileEpoch) throw new Error('cancelled');
    const cache = await caches.open(TILE_CACHE_NAME);
    await cache.delete(url);
    await cache.put(url, response);
    const keys = await cache.keys();
    for (const key of keys.slice(0, Math.max(0, keys.length - TILE_CACHE_LIMIT))) await cache.delete(key);
  });
}

async function downloadTiles(clientId, provider, tiles, port) {
  if (jobs.size) throw new Error('busy');
  const controller = new AbortController();
  const job = { controller, completed: 0, total: tiles.length };
  jobs.set(clientId, job);
  let nextIndex = 0;
  let failure;
  const run = async () => {
    while (!controller.signal.aborted && nextIndex < tiles.length) {
      const url = tileUrl(provider, tiles[nextIndex++]);
      try {
        const cache = await caches.open(TILE_CACHE_NAME);
        if (!await cache.match(url)) await putTile(url, await fetchTile(url, controller.signal), controller.signal);
        if (controller.signal.aborted) break;
        job.completed++;
        port.postMessage({ status: 'progress', completed: job.completed, total: job.total, ready: false });
      } catch (error) {
        if (!controller.signal.aborted) failure = error;
        controller.abort();
      }
    }
  };
  job.done = Promise.all(Array.from({ length: DOWNLOAD_CONCURRENCY }, run));
  try {
    await job.done;
    const cache = await caches.open(TILE_CACHE_NAME);
    const ready = !controller.signal.aborted && job.completed === job.total && (await Promise.all(tiles.map(tile => cache.match(tileUrl(provider, tile))))).every(Boolean);
    port.postMessage({ status: ready ? 'complete' : failure ? 'error' : 'cancelled', completed: job.completed, total: job.total, ready });
  } finally {
    jobs.delete(clientId);
  }
}

async function trustedClient(event) {
  if (!event.source?.id || event.origin !== self.location.origin) return null;
  const client = await self.clients.get(event.source.id);
  if (!client || client.type !== 'window' || new URL(client.url).origin !== self.location.origin || client.frameType !== 'top-level') return null;
  const controlled = await self.clients.matchAll({ type: 'window', includeUncontrolled: false });
  if (!controlled.some(candidate => candidate.id === client.id)) return null;
  return client;
}

async function cacheStatus(clientId, tiles) {
  await tileMutation;
  const cache = await caches.open(TILE_CACHE_NAME);
  const count = (await cache.keys()).length;
  const provider = providers.get(clientId);
  const requested = tiles && provider ? validateTiles(tiles) : [];
  const ready = requested.length > 0 && (await Promise.all(requested.map(tile => cache.match(tileUrl(provider, tile))))).every(Boolean);
  return { count, ready };
}

async function clearTiles() {
  tileEpoch++;
  for (const job of jobs.values()) job.controller.abort();
  await Promise.all([...jobs.values()].map(job => job.done));
  await serializeTileMutation(async () => {
    const cache = await caches.open(TILE_CACHE_NAME);
    for (const key of await cache.keys()) await cache.delete(key);
  });
}

async function handleMessage(event) {
  const port = event.ports?.[0];
  if (!port) return;
  try {
    const client = await trustedClient(event);
    if (!client) return;
    const { type, provider, tiles } = event.data || {};
    if (type === 'OFFLINE_CONFIGURE') {
      providers.delete(client.id);
      const configured = validateProvider(provider);
      await saveProvider(configured);
      providers.set(client.id, configured);
      tileCachingDisabled = false;
      return port.postMessage({ status: 'configured' });
    }
    if (type === 'OFFLINE_DISABLE') {
      tileCachingDisabled = true;
      providers.clear();
      await Promise.all([saveProvider(null), clearTiles()]);
      return port.postMessage({ status: 'disabled', ready: false });
    }
    if (type === 'OFFLINE_DOWNLOAD') {
      if (!providers.has(client.id)) throw new Error('provider-unavailable');
      return await downloadTiles(client.id, providers.get(client.id), validateTiles(tiles), port);
    }
    if (type === 'OFFLINE_CANCEL') {
      jobs.get(client.id)?.controller.abort();
      return port.postMessage({ status: 'cancel-requested', ready: false });
    }
    if (type === 'OFFLINE_CLEAR') {
      await clearTiles();
    }
    if (type === 'OFFLINE_STATUS' || type === 'OFFLINE_CLEAR') {
      return port.postMessage({ status: type === 'OFFLINE_CLEAR' ? 'cleared' : 'status', ...await cacheStatus(client.id, type === 'OFFLINE_STATUS' ? tiles : null) });
    }
    throw new Error('unknown-command');
  } catch (error) {
    const codes = ['provider-unavailable', 'invalid-tiles', 'busy', 'unknown-command'];
    port.postMessage({ status: 'error', code: codes.includes(error.message) ? error.message : 'offline-failed', ready: false });
  }
}

self.addEventListener('message', event => event.waitUntil(handleMessage(event)));

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const responses = await Promise.all(STATIC_PRECACHE.map(path => fetch(new URL(path, self.location.origin).href, { credentials: 'omit', cache: 'reload', redirect: 'error' })));
    if (!responses.every(isCacheable)) throw new Error('asset-precache-failed');
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(STATIC_PRECACHE.map((path, index) => cache.put(path, responses[index])));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) {
      if (name.startsWith('trip-builder-') && name !== CACHE_NAME && name !== TILE_CACHE_NAME) await caches.delete(name);
    }
    await self.clients.claim();
  })());
});

function matchesProvider(url, provider) {
  if (url.origin !== provider.origin) return false;
  const escaped = provider.template.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace('\\{z\\}', '(\\d{1,2})').replace('\\{x\\}', '(\\d{1,7})').replace('\\{y\\}', '(\\d{1,7})');
  return new RegExp(`^${escaped}$`).test(url.href);
}

function isOpportunisticTile(url, clientId) {
  if (url.protocol !== 'https:') return false;
  if (url.hostname === 'tile.openstreetmap.org' && !url.search && /^\/\d{1,2}\/\d{1,7}\/\d{1,7}\.png$/.test(url.pathname)) return true;
  const provider = providers.get(clientId);
  return provider ? matchesProvider(url, provider) : false;
}

async function tileResponse(request) {
  const epoch = tileEpoch;
  if (tileCachingDisabled || !await savedProvider() || tileCachingDisabled || epoch !== tileEpoch) return fetch(request);
  const cache = await caches.open(TILE_CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetchTile(request.url, undefined, false);
    if (isCacheable(response)) {
      try {
        await putTile(request.url, response.clone(), undefined, epoch);
      } catch (error) {
        console.warn('Tile cache write failed:', error.name);
      }
    }
    return response;
  } catch {
    return new Response('', { status: 504, statusText: 'Tile unavailable' });
  }
}

async function assetResponse(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request, { credentials: 'omit', redirect: 'error' });
  if (isCacheable(response)) await cache.put(request, response.clone());
  return response;
}

async function restoredImageResponse(request) {
  const provider = await savedProvider();
  if (provider && matchesProvider(new URL(request.url), provider)) return tileResponse(request);
  return fetch(request);
}

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || request.mode === 'navigate' || request.headers.has('authorization') || (url.origin === self.location.origin && url.pathname.startsWith('/api/'))) return;
  if (isOpportunisticTile(url, event.clientId)) {
    event.respondWith(tileResponse(request));
    return;
  }
  const asset = url.origin === self.location.origin && !url.search && (url.pathname.startsWith('/_next/static/') || STATIC_PRECACHE.includes(url.pathname));
  if (asset) event.respondWith(assetResponse(request));
  else if (event.clientId && request.destination === 'image' && url.protocol === 'https:') event.respondWith(restoredImageResponse(request));
});
