import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const workerSource = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');

function workerHarness(options = {}) {
  const listeners = new Map();
  const entries = options.entries || new Map();
  const assets = options.assets || new Map();
  const fetched = [];
  const client = { id: 'trusted', type: 'window', url: 'https://trip.test/', frameType: 'top-level' };
  const cache = {
    keys: async () => [...entries.keys()].map(url => new Request(url)),
    match: async request => entries.get(typeof request === 'string' ? request : request.url)?.clone(),
    put: async (request, response) => {
      if (options.writeError) throw new Error('quota-exceeded');
      entries.set(typeof request === 'string' ? request : request.url, response.clone());
    },
    delete: async request => entries.delete(typeof request === 'string' ? request : request.url),
    addAll: async () => {}
  };
  const context = vm.createContext({
    URL, Request, Response, Headers, AbortController, setTimeout: options.setTimeout || setTimeout, clearTimeout, console,
    caches: { open: async name => name.includes('-tiles-') ? cache : {
      match: async key => assets.get(typeof key === 'string' ? key : key.url)?.clone(),
      put: async (key, response) => assets.set(typeof key === 'string' ? key : key.url, response.clone()),
      delete: async key => assets.delete(typeof key === 'string' ? key : key.url)
    }, keys: async () => [], delete: async () => true },
    fetch: async (request, init) => {
      fetched.push(typeof request === 'string' ? request : request.url);
      if (options.fetch) return options.fetch(request, init);
      return new Response(new Uint8Array([1, 2, 3]), { headers: { 'content-type': 'image/png' } });
    },
    self: {
      location: new URL('https://trip.test/sw.js'),
      addEventListener: (type, handler) => listeners.set(type, handler),
      clients: { get: async id => id === client.id ? client : undefined, matchAll: async () => options.uncontrolled ? [] : [client], claim: async () => {} },
      skipWaiting: async () => {}
    }
  });
  vm.runInContext(workerSource, context);
  return {
    entries, assets, fetched,
    async message(payload, trusted = true) {
      const messages = [];
      let pending;
      assert.equal(typeof listeners.get('message'), 'function', 'worker must implement the message protocol');
      listeners.get('message')({
        data: payload, origin: trusted ? 'https://trip.test' : 'https://evil.test',
        source: trusted ? client : { ...client, id: 'untrusted' },
        ports: [{ postMessage: message => messages.push(JSON.parse(JSON.stringify(message))) }],
        waitUntil: promise => { pending = promise; }
      });
      await pending;
      return messages;
    },
    async request(url, options = {}) {
      let response;
      const request = new Request(url, options);
      if (options.destination) Object.defineProperty(request, 'destination', { value: options.destination });
      listeners.get('fetch')({ clientId: client.id, request, respondWith: pending => { response = pending; }, waitUntil: () => {} });
      return response ? await response : null;
    }
  };
}

test('worker refuses downloads without an explicit licensed provider', async () => {
  const worker = workerHarness();
  const messages = await worker.message({ type: 'OFFLINE_DOWNLOAD', tiles: [{ x: 1, y: 1, z: 12 }] });
  assert.equal(messages.at(-1).status, 'error');
  assert.equal(worker.fetched.length, 0);
});

test('worker rejects standard OSM, CARTO, private and unsafe provider templates', async () => {
  const worker = workerHarness();
  for (const template of [
    'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    'https://a.basemaps.cartocdn.com/{z}/{x}/{y}.png?key=public',
    'http://tiles.example.com/{z}/{x}/{y}.png',
    'https://127.0.0.1/{z}/{x}/{y}.png',
    'https://localhost/{z}/{x}/{y}.png',
    'https://{s}.example.com/{z}/{x}/{y}.png'
  ]) {
    const messages = await worker.message({ type: 'OFFLINE_CONFIGURE', provider: { template, licensed: true } });
    assert.equal(messages.at(-1).status, 'error', template);
  }
  assert.equal(worker.fetched.length, 0);
});

test('only controlled same-origin clients can configure providers', async () => {
  const worker = workerHarness();
  await worker.message({ type: 'OFFLINE_CONFIGURE', provider: { template: 'https://tiles.example.com/{z}/{x}/{y}.png', licensed: true } }, false);
  const messages = await worker.message({ type: 'OFFLINE_DOWNLOAD', tiles: [{ x: 1, y: 1, z: 12 }] });
  assert.equal(messages.at(-1).status, 'error');
  assert.equal(worker.fetched.length, 0);
});

test('authorized tiles report all-or-none readiness and clear/count', async () => {
  const worker = workerHarness();
  const configured = await worker.message({ type: 'OFFLINE_CONFIGURE', provider: { template: 'https://tiles.example.com/{z}/{x}/{y}.png', licensed: true } });
  assert.equal(configured.at(-1).status, 'configured');
  const messages = await worker.message({ type: 'OFFLINE_DOWNLOAD', tiles: [{ x: 1, y: 2, z: 12 }, { x: 2, y: 2, z: 12 }] });
  assert.equal(messages.at(-1).status, 'complete');
  assert.equal(messages.at(-1).ready, true);
  assert.equal(messages.at(-1).completed, 2);
  assert.equal(worker.fetched.length, 2);
  assert.equal((await worker.message({ type: 'OFFLINE_STATUS' })).at(-1).count, 2);
  await worker.message({ type: 'OFFLINE_CLEAR' });
  assert.equal((await worker.message({ type: 'OFFLINE_STATUS' })).at(-1).count, 0);
});

test('worker validates the entire tile command before any fetch', async () => {
  const worker = workerHarness();
  await worker.message({ type: 'OFFLINE_CONFIGURE', provider: { template: 'https://tiles.example.com/{z}/{x}/{y}.png', licensed: true } });
  for (const tiles of [[], Array(301).fill({ x: 1, y: 1, z: 12 }), [{ x: 1, y: 1, z: 12 }, { x: -1, y: 1, z: 12 }], [{ url: 'https://evil.test/' }]]) {
    assert.equal((await worker.message({ type: 'OFFLINE_DOWNLOAD', tiles })).at(-1).status, 'error');
  }
  assert.equal(worker.fetched.length, 0);
});

test('worker never intercepts API, personal navigation or foreign lookalike hosts', async () => {
  const worker = workerHarness();
  for (const url of ['https://trip.test/api/personal.png', 'https://trip.test/?plan=private', 'https://trip.test/account/avatar.png', 'https://tile.openstreetmap.org.evil.test/1/1/1.png', 'https://a.basemaps.cartocdn.com/1/1/1.png']) {
    assert.equal(await worker.request(url), null);
  }
});

const provider = { template: 'https://tiles.example.com/{z}/{x}/{y}.png', licensed: true };
const sampleTiles = Array.from({ length: 8 }, (_, index) => ({ x: index + 1, y: 1, z: 12 }));

test('fresh workers do not persist public tiles before an explicit offline handshake', async () => {
  const worker = workerHarness();
  for (const url of ['https://tile.openstreetmap.org/12/1/1.png', 'https://a.basemaps.cartocdn.com/light_all/12/1/1.png']) {
    await worker.request(url, { destination: 'image' });
    assert.ok(worker.fetched.includes(url));
    assert.equal(worker.entries.size, 0, url);
  }
});

test('disable purges tiles and blocks public and licensed caching until explicit configure', async () => {
  const worker = workerHarness();
  await worker.message({ type: 'OFFLINE_CONFIGURE', provider });
  await worker.request('https://tile.openstreetmap.org/12/1/1.png');
  assert.equal(worker.entries.size, 1);
  assert.equal((await worker.message({ type: 'OFFLINE_DISABLE' })).at(-1).status, 'disabled');
  assert.equal(worker.entries.size, 0);
  const urls = ['https://tile.openstreetmap.org/12/2/1.png', 'https://a.basemaps.cartocdn.com/light_all/12/2/1.png', 'https://tiles.example.com/12/2/1.png'];
  for (const current of [worker, workerHarness({ entries: worker.entries, assets: worker.assets })]) {
    for (const url of urls) {
      await current.request(url, { destination: 'image' });
      assert.ok(current.fetched.includes(url));
      assert.equal(current.entries.size, 0, url);
    }
  }
  assert.equal((await worker.message({ type: 'OFFLINE_CONFIGURE', provider: { ...provider, licensed: false } })).at(-1).status, 'error');
  await worker.request(urls[0], { destination: 'image' });
  assert.equal(worker.entries.size, 0);
  await worker.message({ type: 'OFFLINE_CONFIGURE', provider });
  await worker.request(urls[0]);
  assert.equal(worker.entries.size, 1);
  assert.equal((await worker.message({ type: 'OFFLINE_DOWNLOAD', tiles: sampleTiles.slice(0, 1) })).at(-1).ready, true);
});

test('disable rejects stale opportunistic writes even after explicit re-enable', async () => {
  let release;
  let started;
  const firstFetch = new Promise(resolve => { started = resolve; });
  const worker = workerHarness({ fetch: () => new Promise(resolve => {
    release = () => resolve(new Response('tile', { headers: { 'content-type': 'image/png' } }));
    started();
  }) });
  await worker.message({ type: 'OFFLINE_CONFIGURE', provider });
  const pending = worker.request('https://tile.openstreetmap.org/12/1/1.png');
  await firstFetch;
  await worker.message({ type: 'OFFLINE_DISABLE' });
  await worker.message({ type: 'OFFLINE_CONFIGURE', provider });
  release();
  assert.equal((await pending).status, 200);
  assert.equal(worker.entries.size, 0);
});

test('uncontrolled same-origin clients cannot authorize a provider', async () => {
  const worker = workerHarness({ uncontrolled: true });
  assert.deepEqual(await worker.message({ type: 'OFFLINE_CONFIGURE', provider }), []);
});

test('download concurrency is bounded to four requests', async () => {
  let release;
  let started;
  let active = 0;
  let peak = 0;
  const gate = new Promise(resolve => { release = resolve; });
  const batch = new Promise(resolve => { started = resolve; });
  const worker = workerHarness({ fetch: async (_, init) => {
    assert.equal(init.redirect, 'error');
    assert.equal(init.credentials, 'omit');
    active++;
    peak = Math.max(peak, active);
    if (active === 4) started();
    await gate;
    active--;
    return new Response('tile', { headers: { 'content-type': 'image/png' } });
  } });
  await worker.message({ type: 'OFFLINE_CONFIGURE', provider });
  const pending = worker.message({ type: 'OFFLINE_DOWNLOAD', tiles: sampleTiles });
  await batch;
  assert.equal(peak, 4);
  release();
  assert.equal((await pending).at(-1).ready, true);
  assert.equal(peak, 4);
});

test('cancel aborts in-flight requests and never announces readiness', async () => {
  let started;
  const firstFetch = new Promise(resolve => { started = resolve; });
  const worker = workerHarness({ fetch: (_, init) => new Promise((resolve, reject) => {
    started();
    init.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
  }) });
  await worker.message({ type: 'OFFLINE_CONFIGURE', provider });
  const pending = worker.message({ type: 'OFFLINE_DOWNLOAD', tiles: sampleTiles });
  await firstFetch;
  await worker.message({ type: 'OFFLINE_CANCEL' });
  const messages = await pending;
  assert.equal(messages.at(-1).status, 'cancelled');
  assert.equal(messages.at(-1).ready, false);
  assert.equal(worker.entries.size, 0);
});

test('failed, oversized and private responses never enter the tile cache', async () => {
  for (const response of [
    () => new Response('failed', { status: 503, headers: { 'content-type': 'image/png' } }),
    () => new Response('private', { headers: { 'content-type': 'image/png', 'cache-control': 'private' } }),
    () => new Response('personal', { headers: { 'content-type': 'image/png', vary: 'Cookie, Authorization' } }),
    () => new Response('large', { headers: { 'content-type': 'image/png', 'content-length': String(2 * 1024 * 1024 + 1) } }),
    () => new Response(new Uint8Array(2 * 1024 * 1024 + 1), { headers: { 'content-type': 'image/png' } }),
    () => new Response('<html>login</html>', { headers: { 'content-type': 'text/html' } })
  ]) {
    const worker = workerHarness({ fetch: response });
    await worker.message({ type: 'OFFLINE_CONFIGURE', provider });
    const messages = await worker.message({ type: 'OFFLINE_DOWNLOAD', tiles: sampleTiles.slice(0, 1) });
    assert.equal(messages.at(-1).status, 'error');
    assert.equal(messages.at(-1).ready, false);
    assert.equal(worker.entries.size, 0);
  }
});

test('download timeout aborts network and reports an error', async () => {
  const worker = workerHarness({
    setTimeout: callback => setTimeout(callback, 1),
    fetch: (_, init) => new Promise((resolve, reject) => init.signal.addEventListener('abort', () => reject(new Error('timeout')), { once: true }))
  });
  await worker.message({ type: 'OFFLINE_CONFIGURE', provider });
  const messages = await worker.message({ type: 'OFFLINE_DOWNLOAD', tiles: sampleTiles.slice(0, 1) });
  assert.equal(messages.at(-1).status, 'error');
  assert.equal(messages.at(-1).ready, false);
});

test('tile cache evicts oldest entries at 2000 and status verifies the whole requested area', async () => {
  const worker = workerHarness();
  const oldTile = new Response('tile', { headers: { 'content-type': 'image/png' } });
  for (let index = 0; index < 2000; index++) worker.entries.set(`https://tiles.example.com/12/${index}/0.png`, oldTile);
  await worker.message({ type: 'OFFLINE_CONFIGURE', provider });
  assert.equal((await worker.message({ type: 'OFFLINE_DOWNLOAD', tiles: sampleTiles.slice(0, 1) })).at(-1).ready, true);
  assert.equal(worker.entries.size, 2000);
  assert.equal(worker.entries.has('https://tiles.example.com/12/0/0.png'), false);
  assert.equal((await worker.message({ type: 'OFFLINE_STATUS', tiles: sampleTiles.slice(0, 1) })).at(-1).ready, true);
  assert.equal((await worker.message({ type: 'OFFLINE_STATUS', tiles: sampleTiles })).at(-1).ready, false);
});

test('only the exact configured template is cached opportunistically', async () => {
  const worker = workerHarness();
  await worker.message({ type: 'OFFLINE_CONFIGURE', provider });
  assert.equal((await worker.request('https://tiles.example.com/12/1/1.png')).status, 200);
  assert.equal(worker.entries.size, 1);
  assert.equal(await worker.request('https://tiles.example.com/account/avatar.png'), null);
  assert.equal(await worker.request('https://tiles.example.com/12/1/1.png?token=personal'), null);
});

test('opportunistic tiles stay visible when cache is full or provider disallows storage', async () => {
  for (const options of [
    { writeError: true },
    { fetch: async () => new Response('tile', { headers: { 'content-type': 'image/png', 'cache-control': 'no-store' } }) }
  ]) {
    const worker = workerHarness(options);
    await worker.message({ type: 'OFFLINE_CONFIGURE', provider });
    const response = await worker.request('https://tile.openstreetmap.org/12/1/1.png');
    assert.equal(response.status, 200);
    assert.equal(worker.entries.size, 0);
  }
});

test('clear prevents older in-flight opportunistic requests from repopulating cache', async () => {
  let release;
  let started;
  const firstFetch = new Promise(resolve => { started = resolve; });
  const worker = workerHarness({ fetch: () => new Promise(resolve => {
    release = () => resolve(new Response('tile', { headers: { 'content-type': 'image/png' } }));
    started();
  }) });
  await worker.message({ type: 'OFFLINE_CONFIGURE', provider });
  const pending = worker.request('https://tile.openstreetmap.org/12/1/1.png');
  await firstFetch;
  await worker.message({ type: 'OFFLINE_CLEAR' });
  release();
  assert.equal((await pending).status, 200);
  assert.equal(worker.entries.size, 0);
});

test('licensed cached tiles survive a worker restart but persisted permission never authorizes bulk commands', async () => {
  const first = workerHarness();
  await first.message({ type: 'OFFLINE_CONFIGURE', provider });
  await first.message({ type: 'OFFLINE_DOWNLOAD', tiles: sampleTiles.slice(0, 1) });
  const restarted = workerHarness({ entries: first.entries, assets: first.assets, fetch: async () => { throw new Error('offline'); } });
  const response = await restarted.request('https://tiles.example.com/12/1/1.png', { destination: 'image' });
  assert.equal(response?.status, 200);
  assert.equal(restarted.fetched.length, 0);
  assert.equal((await restarted.message({ type: 'OFFLINE_DOWNLOAD', tiles: sampleTiles.slice(0, 1) })).at(-1).status, 'error');
  await restarted.message({ type: 'OFFLINE_DISABLE' });
  assert.equal(first.entries.size, 0);
  const afterDisable = workerHarness({ entries: first.entries, assets: first.assets });
  await afterDisable.request('https://tiles.example.com/12/1/1.png', { destination: 'image' });
  assert.equal(afterDisable.fetched.length, 1);
});

test('public assets are fetched without credentials and personalized variants are never cached', async () => {
  const worker = workerHarness({ fetch: async (_, init) => {
    assert.equal(init?.credentials, 'omit');
    assert.equal(init?.redirect, 'error');
    return new Response('private asset', { headers: { vary: 'Cookie', 'content-type': 'application/javascript' } });
  } });
  assert.equal((await worker.request('https://trip.test/_next/static/example.js')).status, 200);
  assert.equal(worker.assets.size, 0);
});

test('disable aborts active downloads, clears cached tiles and revokes bulk permission', async () => {
  let started;
  const firstFetch = new Promise(resolve => { started = resolve; });
  const worker = workerHarness({ fetch: (_, init) => new Promise((resolve, reject) => {
    started();
    init.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
  }) });
  await worker.message({ type: 'OFFLINE_CONFIGURE', provider });
  worker.entries.set('https://tiles.example.com/12/0/0.png', new Response('old tile'));
  const pending = worker.message({ type: 'OFFLINE_DOWNLOAD', tiles: sampleTiles });
  await firstFetch;
  assert.equal((await worker.message({ type: 'OFFLINE_DISABLE' })).at(-1).status, 'disabled');
  assert.equal((await pending).at(-1).status, 'cancelled');
  assert.equal(worker.entries.size, 0);
  assert.equal(worker.assets.size, 0);
  assert.equal((await worker.message({ type: 'OFFLINE_DOWNLOAD', tiles: sampleTiles })).at(-1).status, 'error');
});

test('map handshake explicitly configures or disables offline permission before reading status', async () => {
  const mapSource = await readFile(new URL('../src/app/components/MapComponent.js', import.meta.url), 'utf8');
  const componentSource = mapSource.slice(0, mapSource.indexOf('\n  return (\n    <div className={`map-component-wrapper'))
    .replace(/^import .*;\r?\n/gm, '').replaceAll('export function ', 'function ').replace('export default function ', 'function ');
  for (const configuredProvider of [null, provider]) {
    const effects = [];
    const messages = [];
    const runtime = vm.createContext({
      URL, AbortController, process: { env: {} }, getOfflineProvider: () => configuredProvider,
      useState: initial => [initial, () => {}], useRef: current => ({ current }), useEffect: effect => effects.push(effect),
      navigator: { serviceWorker: { controller: {}, addEventListener: () => {}, removeEventListener: () => {} } },
      sendOfflineMessage: async (_, payload) => { messages.push(payload); return { count: 0 }; }
    });
    vm.runInContext(`${componentSource}\n}\nMapComponent({ itin: {}, nDays: 1, activeCity: 'bkk', activeLang: 'en' });`, runtime);
    const cleanup = effects[0]();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(messages[0]?.type, configuredProvider ? 'OFFLINE_CONFIGURE' : 'OFFLINE_DISABLE');
    assert.equal(messages[1]?.type, 'OFFLINE_STATUS');
    cleanup();
  }
});

test('identity-dependent asset variants are rejected case-insensitively', async () => {
  for (const vary of ['cookie', 'Accept-Encoding, AUTHORIZATION', ' Cookie ', '*']) {
    const worker = workerHarness({ fetch: async () => new Response('asset', { headers: { vary } }) });
    assert.equal((await worker.request('https://trip.test/_next/static/example.js')).status, 200);
    assert.equal(worker.assets.size, 0, vary);
  }
});