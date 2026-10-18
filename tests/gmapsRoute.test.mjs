import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { getGmapsWalkingRouteUrl } from '../src/lib/gmapsRoute.js';

describe('getGmapsWalkingRouteUrl', () => {
  test('returns null when items is empty or invalid', () => {
    assert.equal(getGmapsWalkingRouteUrl([]), null);
    assert.equal(getGmapsWalkingRouteUrl(null), null);
    assert.equal(getGmapsWalkingRouteUrl([{ name: 'No coords' }]), null);
  });

  test('returns single search URL when only 1 valid place exists', () => {
    const single = [{ name: 'วัดพระแก้ว', lat: 13.7516, lng: 100.4927 }];
    const url = getGmapsWalkingRouteUrl(single);
    assert.ok(url.startsWith('https://www.google.com/maps/search/?api=1'));
    assert.ok(url.includes('13.7516') && url.includes('100.4927'));
  });

  test('returns walking directions URL for 2 places', () => {
    const items = [
      { name: 'วัดพระแก้ว', lat: 13.7516, lng: 100.4927 },
      { name: 'วัดโพธิ์', lat: 13.7466, lng: 100.4933 }
    ];
    const url = getGmapsWalkingRouteUrl(items);
    assert.ok(url.startsWith('https://www.google.com/maps/dir/?api=1'));
    assert.ok(url.includes('origin=13.7516,100.4927'));
    assert.ok(url.includes('destination=13.7466,100.4933'));
    assert.ok(url.includes('travelmode=walking'));
    assert.ok(!url.includes('waypoints='));
  });

  test('returns walking directions URL with waypoints for 3+ places', () => {
    const items = [
      { name: 'Stop 1', lat: 13.75, lng: 100.49 },
      { name: 'Stop 2', lat: 13.74, lng: 100.50 },
      { name: 'Stop 3', lat: 13.73, lng: 100.51 }
    ];
    const url = getGmapsWalkingRouteUrl(items);
    assert.ok(url.includes('origin=13.75,100.49'));
    assert.ok(url.includes('waypoints=13.74%2C100.5') || url.includes('waypoints=13.74,100.5'));
    assert.ok(url.includes('destination=13.73,100.51'));
    assert.ok(url.includes('travelmode=walking'));
  });
});

describe('shareGmapsRoute', () => {
  test('returns false when url is empty or falsy', async () => {
    const { shareGmapsRoute } = await import('../src/lib/gmapsRoute.js');
    assert.equal(await shareGmapsRoute({ url: '' }), false);
    assert.equal(await shareGmapsRoute({ url: null }), false);
  });
});
