import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { getWrappedFocusTarget } from '../src/lib/dialogFocus.js';

describe('getWrappedFocusTarget', () => {
  const first = {};
  const middle = {};
  const last = {};
  const controls = [first, middle, last];

  test('wraps forward and backward at the dialog boundaries', () => {
    assert.equal(getWrappedFocusTarget(controls, last, false), first);
    assert.equal(getWrappedFocusTarget(controls, first, true), last);
  });

  test('lets tab move normally within the dialog', () => {
    assert.equal(getWrappedFocusTarget(controls, middle, false), null);
    assert.equal(getWrappedFocusTarget(controls, middle, true), null);
  });

  test('returns an edge when focus is outside and handles an empty dialog', () => {
    assert.equal(getWrappedFocusTarget(controls, null, false), first);
    assert.equal(getWrappedFocusTarget(controls, null, true), last);
    assert.equal(getWrappedFocusTarget([], null, false), null);
  });
});
