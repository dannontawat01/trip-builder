import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { extractPhotos, normalizePhotoUrl, fetchGoogleMapsPhotos } from '../src/lib/googleMapsPhoto.js';

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
});
