import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { extractPhotos, normalizePhotoUrl, fetchGoogleMapsPhotos, isNearbyPlace } from '../src/lib/googleMapsPhoto.js';
import { isGooglePlaceId, placeIdFromFeatureParts } from '../src/lib/googleMapsIdentity.js';

const placePhoto = 'https://lh3.googleusercontent.com/grass-cs/AAA=w211-h120-k-no';
const avatar = 'https://lh3.googleusercontent.com/a/ACg8oc=s40-c';

describe('googleMapsPhoto', () => {
  test('normalizePhotoUrl replaces size suffix', () => {
    assert.equal(normalizePhotoUrl(placePhoto), 'https://lh3.googleusercontent.com/grass-cs/AAA=w800-h500-k-no');
  });

  test('extractPhotos reads place photo groups and skips avatars', () => {
    const payload = [null, null, null, null, null, null, []];
    payload[6][37] = [[[null, null, null, null, null, null, [placePhoto]], [null, null, null, null, null, null, [avatar]]]];
    assert.deepEqual(extractPhotos(payload), ['https://lh3.googleusercontent.com/grass-cs/AAA=w800-h500-k-no']);
  });

  test('prefers the Google Maps place-page cover over gallery photos', () => {
    const cover = 'https://lh3.googleusercontent.com/grass-cs/COVER=w203-h270-k-no';
    const gallery = 'https://lh3.googleusercontent.com/grass-cs/GALLERY=w140-h186-k-no';
    const payload = [null, null, null, null, null, null, []];
    payload[6][37] = [[[null, null, null, null, null, null, [gallery]]]];
    payload[6][51] = [[[null, null, null, null, null, null, [cover]]]];

    assert.deepEqual(extractPhotos(payload), [
      'https://lh3.googleusercontent.com/grass-cs/COVER=w800-h500-k-no',
      'https://lh3.googleusercontent.com/grass-cs/GALLERY=w800-h500-k-no'
    ]);
  });

  test('extractPhotos handles empty or malformed payloads', () => {
    assert.deepEqual(extractPhotos(null), []);
    assert.deepEqual(extractPhotos([]), []);
    assert.deepEqual(extractPhotos([null, null, null, null, null, null, 'x']), []);
  });

  test('fetchGoogleMapsPhotos returns [] for missing name or coordinates', async () => {
    assert.deepEqual(await fetchGoogleMapsPhotos('', 35, 139), []);
    assert.deepEqual(await fetchGoogleMapsPhotos('Place', null, undefined), []);
    assert.deepEqual(await fetchGoogleMapsPhotos('Place', 'abc', 139), []);
  });

  test('converts saved-list identity to its exact Google place ID', () => {
    assert.equal(placeIdFromFeatureParts(['6924439578625545943', '-9131715045231272990']), 'ChIJ15ahCByNGGAR4lvmWoyhRYE');
    assert.notEqual(placeIdFromFeatureParts(['6924442342634998683', '-4338747055735439336']), placeIdFromFeatureParts(['6924441804370694415', '6994733734435362173']));
    assert.equal(placeIdFromFeatureParts(['not-a-number', '2']), null);
    assert.equal(placeIdFromFeatureParts(['18446744073709551616', '2']), null);
    assert.equal(placeIdFromFeatureParts(null), null);
    assert.equal(isGooglePlaceId('ChIJ15ahCByNGGAR4lvmWoyhRYE'), true);
    assert.equal(isGooglePlaceId('bad/id'), false);
  });

  test('rejects a name-search result for a different branch', () => {
    const payload = [null, null, null, null, null, null, []];
    payload[6][9] = [null, null, 35.708115, 139.7734496];
    assert.equal(isNearbyPlace(payload, 35.708115, 139.7734496), true);
    assert.equal(isNearbyPlace(payload, 35.7119017, 139.7962876), false);
    assert.equal(isNearbyPlace([], 35.708115, 139.7734496), false);
  });

  test('uses the saved-list ID without searching by name', async () => {
    const originalFetch = globalThis.fetch;
    const calls = [];
    const payload = [null, null, null, null, null, null, []];
    payload[6][51] = [[[null, null, null, null, null, null, [placePhoto]]]];
    globalThis.fetch = async url => {
      calls.push(url);
      if (calls.length === 1) return new Response('<a href="/maps/preview/place?test=1">');
      return new Response(`)]}'\n${JSON.stringify(payload)}`);
    };
    try {
      const photos = await fetchGoogleMapsPhotos('Same name', 35.12345, 139.12345, 'ChIJ15ahCByNGGAR4lvmWoyhRYE');
      assert.equal(photos.length, 1);
      assert.match(calls[0], /place_id:ChIJ15ahCByNGGAR4lvmWoyhRYE/);
      assert.equal(calls.length, 2);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('does not use a search result from a different branch', async () => {
    const originalFetch = globalThis.fetch;
    const payload = [null, null, null, null, null, null, []];
    payload[6][9] = [null, null, 35.71, 139.79];
    payload[6][51] = [[[null, null, null, null, null, null, [placePhoto]]]];
    globalThis.fetch = async url => {
      if (url.includes('/search?')) return new Response('placeid=ChIJ15ahCByNGGAR4lvmWoyhRYE');
      if (url.includes('/maps/place/')) return new Response('<a href="/maps/preview/place?test=1">');
      return new Response(`)]}'\n${JSON.stringify(payload)}`);
    };
    try {
      assert.deepEqual(await fetchGoogleMapsPhotos('Different branch', 35.70, 139.79), []);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
