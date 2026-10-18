import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { getOptimizedImageUrl } from '../src/lib/optimizedImage.js';

describe('getOptimizedImageUrl', () => {
  test('returns empty or non-string as is', () => {
    assert.equal(getOptimizedImageUrl(''), '');
    assert.equal(getOptimizedImageUrl(null), '');
    assert.equal(getOptimizedImageUrl(undefined), '');
  });

  test('preserves data: and local asset URLs', () => {
    const dataUrl = 'data:image/svg+xml;utf8,<svg></svg>';
    assert.equal(getOptimizedImageUrl(dataUrl), dataUrl);
    assert.equal(getOptimizedImageUrl('/images/logo.png'), '/images/logo.png');
  });

  test('rewrites Google usercontent photos to direct Edge CDN with sizing params', () => {
    const googlePhoto = 'https://lh5.googleusercontent.com/p/AF1QipNabc123';
    const optimized = getOptimizedImageUrl(googlePhoto, 400);
    assert.equal(optimized, 'https://lh5.googleusercontent.com/p/AF1QipNabc123=w400-h250-c');

    // Strips any existing dimensions
    const googlePhotoWithParams = 'https://lh3.googleusercontent.com/p/AF1QipNxyz789=w1000-h800-k-no';
    const optimizedWithParams = getOptimizedImageUrl(googlePhotoWithParams, 600);
    assert.equal(optimizedWithParams, 'https://lh3.googleusercontent.com/p/AF1QipNxyz789=w600-h375-c');
  });

  test('rewrites Unsplash images with auto=format, fit=crop, w and q params', () => {
    const unsplash = 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?q=80';
    const optimized = getOptimizedImageUrl(unsplash, 400);
    assert.ok(optimized.includes('images.unsplash.com/photo-1508009603885-50cf7c579365'));
    assert.ok(optimized.includes('w=400'));
    assert.ok(optimized.includes('auto=format'));
    assert.ok(optimized.includes('fit=crop'));
  });

  test('routes third-party external URLs through /api/image-proxy', () => {
    const wikimedia = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Wat_Phra_Kaew.jpg';
    const optimized = getOptimizedImageUrl(wikimedia, 400);
    assert.ok(optimized.startsWith('/api/image-proxy?url='));
    assert.ok(optimized.includes(encodeURIComponent(wikimedia)));
    assert.ok(optimized.includes('w=400'));
  });
});
