import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTheme } from '../src/lib/theme.js';

describe('normalizeTheme', () => {
  test('preserves supported themes', () => {
    assert.equal(normalizeTheme('clean'), 'clean');
    assert.equal(normalizeTheme('dark'), 'dark');
  });

  test('migrates the retired theme and invalid preferences to clean', () => {
    for (const value of ['colorful', '', null, undefined, 'unknown']) {
      assert.equal(normalizeTheme(value), 'clean');
    }
  });
});
