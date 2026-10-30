import test from 'node:test';
import assert from 'node:assert/strict';
import { isPrivateIp, isHttpUrl, isGoogleMapsUrl, isImageCdnHost } from '../src/lib/urlSafety.js';
import { safeFetch, readBodyWithLimit, pinnedTransport } from '../src/lib/safeFetch.js';
import { createRateLimiter, getClientIp } from '../src/lib/rateLimit.js';
import { readFile } from 'node:fs/promises';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { validateAiInput, parseAiOutput, readJsonRequest } from '../src/lib/aiValidation.js';

let routeSequence = 0;

async function loadRoute(name, fetchStub) {
  const routeUrl = new URL(`../src/app/api/${name}/route.js`, import.meta.url);
  let source = await readFile(routeUrl, 'utf8');
  if (fetchStub) {
    const stubKey = `api-security-${name}`;
    globalThis[Symbol.for(stubKey)] = fetchStub;
    source = source.replace(/import \{ safeFetch \} from '[^']+';/, `const safeFetch = globalThis[Symbol.for('${stubKey}')];`);
  }
  source = source.replace(/import \{ fetchGoogleMapsPhotos \} from '[^']+';/, 'const fetchGoogleMapsPhotos = async () => [];');
  source = source.replace(/import \{ getSmartCategoryCover, getBrandPlacePhotos(?:, BRAND_PLACE_IMAGES)? \} from '[^']+';/, 'const getSmartCategoryCover = () => null; const getBrandPlacePhotos = () => [];');
  if (name === 'search-photos') source += '\nexport { photoCache };';
  source = source.replace(/import \{ NextResponse \} from 'next\/server';/g, 'const NextResponse = Response;');
  source = source.replace(/from '(@\/lib\/[^']+|\.\.[^']+)'/g, (_match, specifier) => {
    const target = specifier.startsWith('@/lib/') ? new URL(`../src/lib/${specifier.slice(6)}${specifier.endsWith('.js') ? '' : '.js'}`, import.meta.url) : new URL(specifier, routeUrl);
    return `from '${target.href}'`;
  });
  source = source.replace(/import \{ GoogleGenerativeAI \} from '@google\/generative-ai';/, 'class GoogleGenerativeAI { getGenerativeModel() { throw new Error("offline AI stub"); } }');
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}#${++routeSequence}`);
}

const jsonRequest = (payload) => new Request('https://app.test/api', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });

test('AI routes reject invalid input types, bound days and mark fallback responses', async () => {
  const plan = await loadRoute('ai-plan');
  const suggest = await loadRoute('ai-suggest');
  assert.equal((await plan.POST(jsonRequest({ num_days: '15' }))).status, 400);
  assert.equal((await plan.POST(jsonRequest({ interests: 'food' }))).status, 400);
  assert.equal((await suggest.POST(jsonRequest({ query: 'x'.repeat(201) }))).status, 400);
  assert.equal((await suggest.POST(jsonRequest({ query: {} }))).status, 400);
  const response = await plan.POST(jsonRequest({ num_days: 999 }));
  const payload = await response.json();
  assert.equal(payload.mock, true);
  assert.equal(Object.keys(payload.itin).length, 15);
  const fallback = await (await suggest.POST(jsonRequest({ query: 'Bangkok' }))).json();
  assert.equal(fallback.mock, true);
});

test('export escapes every line class while retaining trusted markup', async () => {
  const route = await loadRoute('ai-export');
  const injection = '<img src=x onerror=alert(1)>';
  const itinerary = [`📅 Day ${injection}`, `Hotel: ${injection}`, `09:00-10:00 ${injection}`, `  Address: ${injection}`, `  GPS: ${injection}`, `  Fee: ${injection}`, `  Transit: ${injection}`, `  Lunch: ${injection}`, `  Travel: ${injection}`, injection].join('\n');
  const response = await route.POST(jsonRequest({ itinerary, style: 'A' }));
  const { html } = await response.json();
  assert.equal(html.includes(injection), false);
  assert.ok(html.includes('&lt;img'));
  assert.ok(html.includes('<h2>'));
  assert.ok(html.includes('class="itin-item"'));
});

test('rates explicitly reports unsupported TWD fallback and THB base offline', async () => {
  const route = await loadRoute('rates', async () => { throw new Error('offline'); });
  const response = await route.GET(new Request('https://app.test/api/rates?currencies=TWD,THB'));
  const payload = await response.json();
  assert.equal(payload.base, 'THB');
  assert.ok(payload.unsupportedCurrencies.includes('TWD'));
  assert.equal(payload.fallbackRates.TWD, 1 / 1.15);
  assert.equal(payload.exchangeRates.TWD, 1.15);
  assert.equal(payload.rates.THB, 1);
});

test('rejects reserved IPv4 and IPv6, including hexadecimal mapped addresses', () => {
  for (const address of ['192.0.0.1', '192.0.2.1', '198.18.0.1', '198.51.100.1', '203.0.113.1', '::ffff:7f00:1', '::ffff:c0a8:101', '0:0:0:0:0:ffff:127.0.0.1', '2001:db8::1', '64:ff9b::a00:1', '100::1', 'fec0::1']) {
    assert.equal(isPrivateIp(address), true, address);
  }
  for (const address of ['8.8.8.8', '1.1.1.1', '2606:4700:4700::1111']) assert.equal(isPrivateIp(address), false, address);
});

test('rejects credentials, unsafe ports and deceptive Maps hosts', () => {
  for (const url of ['https://user:pass@google.com/maps', 'https://google.com:444/maps', 'http://google.com:8080/maps']) assert.equal(isHttpUrl(url), false, url);
  assert.equal(isGoogleMapsUrl('https://google.com.attacker.test/maps'), false);
  assert.equal(isGoogleMapsUrl('https://maps.app.goo.gl/example'), true);
});

const publicLookup = async () => [{ address: '8.8.8.8', family: 4 }];

test('pins every actual transport to the verified DNS address and cancels redirects', async () => {
  let cancelled = false;
  const calls = [];
  const transport = async (options) => {
    calls.push(options);
    if (calls.length === 1) return new Response(new ReadableStream({ cancel() { cancelled = true; } }), { status: 302, headers: { location: '/next' } });
    return new Response('ok');
  };
  const { response, finalUrl } = await safeFetch('https://example.com/start', { lookup: publicLookup, transport });
  assert.equal(await response.text(), 'ok');
  assert.equal(finalUrl, 'https://example.com/next');
  assert.equal(cancelled, true);
  assert.equal(calls.length, 2);
  assert.ok(calls.every(({ address }) => address.address === '8.8.8.8'));
});

test('blocks unsafe DNS and redirect destinations before transport', async () => {
  let calls = 0;
  const transport = async () => { calls++; return new Response(null, { status: 302, headers: { location: 'http://127.0.0.1/' } }); };
  await assert.rejects(safeFetch('https://example.com/', { lookup: publicLookup, transport }));
  assert.equal(calls, 1);
  await assert.rejects(safeFetch('https://example.com/', { lookup: async () => [{ address: '::ffff:7f00:1', family: 6 }], transport }));
  assert.equal(calls, 1);
});

test('cancels oversized declared and streamed bodies', async () => {
  for (const headers of [{ 'content-length': '100' }, {}]) {
    let cancelled = false;
    const response = new Response(new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(20)); }, cancel() { cancelled = true; } }), { headers });
    await assert.rejects(readBodyWithLimit(response, 10));
    assert.equal(cancelled, true);
  }
});

test('timeout covers stalled body, DNS and transport, not just response headers', async () => {
  let cancelled = false;
  await assert.rejects(safeFetch('https://example.com/', {
    timeoutMs: 20, lookup: publicLookup,
    transport: async () => new Response(new ReadableStream({ cancel() { cancelled = true; } }))
  }));
  assert.equal(cancelled, true);
  await assert.rejects(safeFetch('https://example.com/', { timeoutMs: 20, lookup: () => new Promise(() => {}), transport: async () => new Response('bad') }));
});

test('ignores spoofed forwarding headers unless explicitly configured', () => {
  const headers = new Headers({ 'x-forwarded-for': 'attacker', 'x-real-ip': '8.8.8.8', 'x-platform-client-ip': '1.1.1.1' });
  assert.equal(getClientIp(headers, { trustedHeader: '' }), 'unknown');
  assert.equal(getClientIp(headers, { trustedHeader: 'x-platform-client-ip' }), '1.1.1.1');
});

test('limiter fails closed at capacity without evicting active clients', () => {
  const check = createRateLimiter({ limit: 1, windowMs: 1000, maxKeys: 1 });
  assert.equal(check('first', 0).allowed, true);
  assert.equal(check('second', 1).allowed, false);
  assert.equal(check('first', 2).allowed, false);
  assert.equal(check('second', 1001).allowed, true);
});

test('image proxy rejects SVG and uses a full-body 5MiB/8s bounded fetch', async () => {
  let fetchOptions;
  const route = await loadRoute('image-proxy', async (_url, options) => {
    fetchOptions = options;
    return { response: new Response('<svg onload="alert(1)"/>', { headers: { 'content-type': 'image/svg+xml' } }) };
  });
  const response = await route.GET(new Request('https://app.test/api/image-proxy?url=https://images.example.test/test.svg'));
  assert.equal(response.status, 415);
  assert.equal(fetchOptions.maxBytes, 5 * 1024 * 1024);
  assert.equal(fetchOptions.timeoutMs, 8000);
});

test('Maps rejects nonallowlisted, credentialed and oversized input before network', async () => {
  let calls = 0;
  const route = await loadRoute('resolve-gmaps', async () => { calls++; throw new Error('unexpected network'); });
  for (const payload of [{ url: 'https://attacker.test/' }, { url: 'https://user@google.com/maps' }, { url: 'x'.repeat(33000) }, { urls: [123] }]) {
    assert.equal((await route.POST(jsonRequest(payload))).status, 400);
  }
  assert.equal(calls, 0);
});

test('photo search bounds query and prunes cache on early returns', async () => {
  const route = await loadRoute('search-photos');
  for (let index = 0; index < 600; index++) route.photoCache.set(`key-${index}`, { value: {}, expiresAt: Date.now() + 100000 });
  assert.equal((await route.GET(new Request('https://app.test/api/search-photos'))).status, 400);
  assert.ok(route.photoCache.size <= 500);
  assert.equal((await route.POST(jsonRequest({ query: 'x'.repeat(201) }))).status, 400);
  assert.equal((await route.POST(jsonRequest({ query: {} }))).status, 400);
});

test('native transport lookup supplies only the vetted IP and preserves TLS hostname', async () => {
  let observed;
  const requestImpl = (url, options, onResponse) => {
    observed = { url, options };
    const request = new EventEmitter();
    request.end = () => {
      const incoming = new PassThrough();
      incoming.statusCode = 200;
      incoming.headers = {};
      onResponse(incoming);
      incoming.end('raster');
    };
    return request;
  };
  const response = await pinnedTransport({ url: new URL('https://public.test/image'), address: { address: '8.8.8.8', family: 4 }, signal: new AbortController().signal, requestImpl });
  assert.equal(await response.text(), 'raster');
  assert.equal(observed.url.hostname, 'public.test');
  assert.equal(observed.options.agent, false);
  observed.options.lookup('public.test', { all: true }, (error, addresses) => {
    assert.equal(error, null);
    assert.deepEqual(addresses, [{ address: '8.8.8.8', family: 4 }]);
  });
  observed.options.lookup('public.test', {}, (error, address, family) => {
    assert.equal(error, null);
    assert.equal(address, '8.8.8.8');
    assert.equal(family, 4);
  });
});

  test('native transport rejects malformed upstream status without an uncaught callback exception', async () => {
    let destroyed = false;
    const requestImpl = (_url, _options, onResponse) => {
      const request = new EventEmitter();
      request.end = () => {
        const incoming = new PassThrough();
        incoming.statusCode = 700;
        incoming.headers = {};
        incoming.on('close', () => { destroyed = true; });
        onResponse(incoming);
        destroyed = incoming.destroyed;
      };
      return request;
    };
    await assert.rejects(pinnedTransport({ url: new URL('https://public.test/'), address: { address: '8.8.8.8', family: 4 }, requestImpl }));
    assert.equal(destroyed, true);
  });

test('CDN matching uses exact suffix boundaries', () => {
  assert.equal(isImageCdnHost('lh3.googleusercontent.com', 'googleusercontent.com'), true);
  for (const host of ['evilgoogleusercontent.com', 'googleusercontent.com.evil.test']) assert.equal(isImageCdnHost(host, 'googleusercontent.com'), false);
});

test('redirect loops are bounded and streaming overflow is rejected', async () => {
  let calls = 0;
  let cancelled = 0;
  await assert.rejects(safeFetch('https://public.test', { lookup: publicLookup, transport: async () => {
    calls++;
    return new Response(new ReadableStream({ cancel() { cancelled++; } }), { status: 302, headers: { location: '/loop' } });
  } }));
  assert.equal(calls, 4);
  assert.equal(cancelled, 4);
  await assert.rejects(safeFetch('https://public.test', { lookup: publicLookup, maxBytes: 2, transport: async () => new Response('123') }));
});

test('AI helpers reject malformed/oversized JSON and sanitize bounded output', async () => {
  for (const num_days of [null, [], {}, '2', 1.5, Infinity]) assert.throws(() => validateAiInput({ num_days }));
  assert.equal(validateAiInput({ num_days: -3 }).num_days, 1);
  assert.equal(validateAiInput({ num_days: 50 }).num_days, 15);
  assert.throws(() => validateAiInput({ interests: new Array(11).fill('food') }));
  assert.throws(() => parseAiOutput('x'.repeat(300000), 'plan', 1));
  assert.throws(() => parseAiOutput('{"places":{}}', 'suggestions'));
  const output = parseAiOutput(JSON.stringify({ places: [{ name: 'Good', lat: null, lng: true, extra: '<script>' }] }), 'suggestions');
  assert.equal(output.places[0].lat, null);
  assert.equal(output.places[0].lng, null);
  assert.equal(output.places[0].extra, undefined);
  await assert.rejects(readJsonRequest(jsonRequest({ query: 'x'.repeat(40000) })));
  await assert.rejects(readJsonRequest(jsonRequest(null)));
});

test('rates caches valid THB quotes, inverts UI rates and never labels TWD live', async () => {
  let calls = 0;
  const route = await loadRoute('rates', async (url, options) => {
    calls++;
    assert.equal(new URL(url).searchParams.get('base'), 'THB');
    assert.equal(options.timeoutMs, 8000);
    assert.equal(options.isHostAllowed('api.frankfurter.dev'), true);
    assert.equal(options.isHostAllowed('api.frankfurter.dev.attacker.test'), false);
    return { response: Response.json({ base: 'THB', date: '2026-10-30', rates: { USD: 0.025, JPY: 4, TWD: 999 } }) };
  });
  const request = () => new Request('https://app.test/api/rates?currencies=USD,JPY,TWD,THB');
  const first = await (await route.GET(request())).json();
  const second = await (await route.GET(request())).json();
  assert.equal(calls, 1);
  assert.equal(first.rates.USD, 0.025);
  assert.equal(first.exchangeRates.USD, 40);
  assert.equal(first.rates.TWD, undefined);
  assert.equal(first.exchangeRates.TWD, 1.15);
  assert.equal(first.date, '2026-10-30');
  assert.equal(first.cacheTtlSeconds, 43200);
  assert.equal(second.mock, false);
  assert.equal((await route.GET(new Request('https://app.test/api/rates?currencies=USD,INVALID'))).status, 400);
});

test('AI routes share one 10-per-minute budget and return Retry-After', async () => {
  const previous = process.env.TRUSTED_PROXY_IP_HEADER;
  process.env.TRUSTED_PROXY_IP_HEADER = 'x-security-test-client';
  try {
    const plan = await loadRoute('ai-plan');
    const suggest = await loadRoute('ai-suggest');
    const request = () => new Request('https://app.test/api', { method: 'POST', headers: { 'x-security-test-client': '203.0.113.20', 'Content-Type': 'application/json' }, body: '{}' });
    for (let count = 0; count < 10; count++) {
      assert.equal((await (count % 2 ? suggest : plan).POST(request())).status, 200);
    }
    const blocked = await suggest.POST(request());
    assert.equal(blocked.status, 429);
    assert.ok(Number(blocked.headers.get('retry-after')) > 0);
  } finally {
    if (previous === undefined) delete process.env.TRUSTED_PROXY_IP_HEADER;
    else process.env.TRUSTED_PROXY_IP_HEADER = previous;
  }
  await assert.rejects(safeFetch('https://example.com/', { timeoutMs: 20, lookup: publicLookup, transport: () => new Promise(() => {}) }));
});