import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml } from '../src/lib/htmlEscape.js';
import { isPrivateIp, isGoogleMapsHost, isGoogleMapsUrl, isHttpUrl } from '../src/lib/urlSafety.js';
import { createRateLimiter, getClientIp } from '../src/lib/rateLimit.js';
import { generateRoomCode, ROOM_CODE_ALPHABET } from '../src/lib/roomCode.js';
import { safeParseJson, clampInt, limitString } from '../src/lib/safeJson.js';
import { sanitizeAiPlan, sanitizeAiSuggestions, sanitizeInterests, MAX_TRIP_DAYS } from '../src/lib/aiValidation.js';

describe('escapeHtml', () => {
  test('escapes markup characters', () => {
    assert.equal(escapeHtml('<img src=x onerror="a(\'1\')">&'), '&lt;img src=x onerror=&quot;a(&#39;1&#39;)&quot;&gt;&amp;');
  });

  test('handles null, undefined and numbers', () => {
    assert.equal(escapeHtml(null), '');
    assert.equal(escapeHtml(undefined), '');
    assert.equal(escapeHtml(42), '42');
  });
});

describe('isPrivateIp', () => {
  test('rejects private, loopback, link-local and metadata addresses', () => {
    for (const address of ['10.0.0.1', '127.0.0.1', '169.254.169.254', '172.16.5.4', '172.31.0.1', '192.168.1.1', '0.0.0.0', '100.64.0.1', '::1', '::', 'fc00::1', 'fd12::1', 'fe80::1', '::ffff:127.0.0.1', '', 'not-an-ip']) {
      assert.equal(isPrivateIp(address), true, address);
    }
  });

  test('accepts public addresses', () => {
    for (const address of ['8.8.8.8', '172.32.0.1', '142.250.1.1', '2001:4860:4860::8888', '::ffff:8.8.8.8']) {
      assert.equal(isPrivateIp(address), false, address);
    }
  });
});

describe('Google Maps host allowlist', () => {
  test('accepts Google Maps hosts', () => {
    for (const host of ['maps.app.goo.gl', 'goo.gl', 'www.google.com', 'maps.google.com', 'google.co.th', 'www.google.co.jp', 'google.com.sg']) {
      assert.equal(isGoogleMapsHost(host), true, host);
    }
  });

  test('rejects lookalike and unrelated hosts', () => {
    for (const host of ['google.com.evil.io', 'evilgoogle.com', 'localhost', '169.254.169.254', 'example.com']) {
      assert.equal(isGoogleMapsHost(host), false, host);
    }
  });

  test('requires http(s) urls', () => {
    assert.equal(isGoogleMapsUrl('https://maps.app.goo.gl/abc'), true);
    assert.equal(isGoogleMapsUrl('file:///etc/passwd'), false);
    assert.equal(isHttpUrl('javascript:alert(1)'), false);
  });
});

describe('createRateLimiter', () => {
  test('blocks after limit and recovers after window', () => {
    const check = createRateLimiter({ limit: 2, windowMs: 1000 });
    assert.equal(check('ip', 0).allowed, true);
    assert.equal(check('ip', 100).allowed, true);
    const blocked = check('ip', 200);
    assert.equal(blocked.allowed, false);
    assert.equal(blocked.retryAfterSeconds, 1);
    assert.equal(check('other', 200).allowed, true);
    assert.equal(check('ip', 1100).allowed, true);
  });

  test('trusts only an explicitly configured proxy header containing one IP', () => {
    assert.equal(getClientIp(new Headers({ 'x-forwarded-for': '1.2.3.4, 10.0.0.1' }), { trustedHeader: '' }), 'unknown');
    assert.equal(getClientIp(new Headers({ 'x-real-ip': '5.6.7.8' }), { trustedHeader: 'x-real-ip' }), '5.6.7.8');
    assert.equal(getClientIp(new Headers(), { trustedHeader: '' }), 'unknown');
  });
});

describe('generateRoomCode', () => {
  test('creates prefixed 8-character codes from the alphabet', () => {
    const code = generateRoomCode();
    assert.match(code, /^TRIP-[A-Z2-9]{8}$/);
    for (const character of code.slice(5)) assert.ok(ROOM_CODE_ALPHABET.includes(character));
  });

  test('uses the injected random source', () => {
    const code = generateRoomCode((length) => new Uint8Array(length).fill(32));
    assert.equal(code, 'TRIP-AAAAAAAA');
  });
});

describe('safeJson helpers', () => {
  test('safeParseJson returns fallback on invalid input', () => {
    assert.deepEqual(safeParseJson('{"a":1}', {}), { a: 1 });
    assert.deepEqual(safeParseJson('{broken', []), []);
    assert.deepEqual(safeParseJson(null, []), []);
    assert.deepEqual(safeParseJson('null', {}), {});
  });

  test('clampInt bounds values', () => {
    assert.equal(clampInt('99', 1, 15, 3), 15);
    assert.equal(clampInt(-4, 1, 15, 3), 1);
    assert.equal(clampInt('abc', 1, 15, 3), 3);
    assert.equal(clampInt(undefined, 1, 15, 3), 3);
  });

  test('limitString trims length and rejects non-strings', () => {
    assert.equal(limitString('abcdef', 3), 'abc');
    assert.equal(limitString(5, 3), '');
  });
});

describe('AI output validation', () => {
  test('sanitizeAiPlan keeps only requested days and valid places', () => {
    const plan = sanitizeAiPlan({
      itin: {
        1: [{ name: 'A', dur: 99999, lat: 13.7, lng: 100.5 }, { name: '' }, 'junk'],
        2: 'not-an-array',
        20: [{ name: 'Out of range' }]
      }
    }, 2);
    assert.deepEqual(Object.keys(plan.itin), ['1', '2']);
    assert.equal(plan.itin[1].length, 1);
    assert.equal(plan.itin[1][0].dur, 720);
    assert.deepEqual(plan.itin[2], []);
  });

  test('sanitizeAiPlan handles malformed input', () => {
    assert.deepEqual(sanitizeAiPlan(null, 1), { itin: { 1: [] } });
  });

  test('sanitizeAiSuggestions drops invalid coordinates', () => {
    const { places } = sanitizeAiSuggestions({ places: [{ name: 'X', lat: 999, lng: 'a' }] });
    assert.equal(places[0].lat, null);
    assert.equal(places[0].lng, null);
  });

  test('sanitizeInterests limits count and type', () => {
    assert.equal(sanitizeInterests(new Array(30).fill('food')).length, 10);
    assert.deepEqual(sanitizeInterests('food'), []);
    assert.equal(MAX_TRIP_DAYS, 15);
  });
});
