import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { isNonPlacePhoto } from '../src/lib/photoUrl.js';

describe('isNonPlacePhoto', () => {
  test('detects reviewer avatars', () => {
    assert.equal(isNonPlacePhoto('https://lh3.googleusercontent.com/a-/ALV-UjW6Tc5=w800-h500-k-no'), true);
    assert.equal(isNonPlacePhoto('https://lh3.googleusercontent.com/a/ACg8oc=s40-c'), true);
    assert.equal(isNonPlacePhoto('https://lh6.googleusercontent.com/-abc/AAAA/s44-p-k-no-ns-nd/photo.jpg'), true);
  });

  test('keeps real place photos', () => {
    assert.equal(isNonPlacePhoto('https://lh3.googleusercontent.com/grass-cs/AABkmL=w800-h500-k-no'), false);
    assert.equal(isNonPlacePhoto('https://upload.wikimedia.org/a.jpg'), false);
  });

  test('handles empty and non-string values', () => {
    assert.equal(isNonPlacePhoto(''), false);
    assert.equal(isNonPlacePhoto(null), false);
    assert.equal(isNonPlacePhoto(undefined), false);
  });
});
