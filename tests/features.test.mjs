import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { latLngToTile, boundsFromPoints, tilesForBounds, buildTileUrl } from '../src/lib/tileMath.js';
import { createHistory, pushHistory, undoHistory, redoHistory } from '../src/lib/itinHistory.js';

describe('tileMath', () => {
  test('latLngToTile matches known tiles', () => {
    assert.deepEqual(latLngToTile(0, 0, 1), { x: 1, y: 1, z: 1 });
    assert.deepEqual(latLngToTile(51.5074, -0.1278, 10), { x: 511, y: 340, z: 10 });
  });

  test('boundsFromPoints ignores invalid points and returns null when empty', () => {
    assert.equal(boundsFromPoints([]), null);
    assert.equal(boundsFromPoints([{ lat: null, lng: 1 }]), null);
    const bounds = boundsFromPoints([{ lat: 13, lng: 100 }, { lat: 14, lng: 101 }], 0);
    assert.deepEqual(bounds, { north: 14, south: 13, east: 101, west: 100 });
  });

  test('tilesForBounds never exceeds the tile budget', () => {
    const bounds = boundsFromPoints([{ lat: 13.6, lng: 100.4 }, { lat: 13.9, lng: 100.7 }]);
    const tiles = tilesForBounds(bounds, { maxTiles: 300 });
    assert.ok(tiles.length > 0);
    assert.ok(tiles.length <= 300);
    assert.deepEqual(tilesForBounds(null), []);
  });

  test('buildTileUrl fills template placeholders', () => {
    const url = buildTileUrl('https://{s}.example.com/{z}/{x}/{y}{r}.png', { x: 1, y: 2, z: 3 }, 'abcd');
    assert.equal(url, 'https://d.example.com/3/1/2.png');
  });

  test('rejects malformed coordinates, bounds and zoom budgets', () => {
    for (const point of [[NaN, 0], [91, 0], [0, 181], ['13', 100]]) {
      assert.throws(() => latLngToTile(...point, 12), RangeError);
    }
    for (const zoom of [-1, 23, 1.5, Infinity]) {
      assert.throws(() => latLngToTile(0, 0, zoom), RangeError);
    }
    assert.equal(boundsFromPoints([{ lat: 91, lng: 0 }]), null);
    assert.throws(() => boundsFromPoints([{ lat: 0, lng: 0 }], -1), RangeError);
    const bounds = { north: 1, south: 0, west: 0, east: 1 };
    for (const options of [{ minZoom: 2.5 }, { maxTiles: Infinity }, { maxTiles: 301 }, { minZoom: 16, maxZoom: 12 }]) {
      assert.throws(() => tilesForBounds(bounds, options), RangeError);
    }
    assert.throws(() => tilesForBounds({ ...bounds, north: NaN }), RangeError);
    assert.throws(() => tilesForBounds({ ...bounds, south: 2 }), RangeError);
  });

  test('dateline points produce a small wrapped bbox and unique tiles', () => {
    const bounds = boundsFromPoints([{ lat: 0, lng: 179.99 }, { lat: 0, lng: -179.99 }]);
    assert.ok(bounds.west > bounds.east);
    const tiles = tilesForBounds(bounds, { minZoom: 12, maxZoom: 12 });
    assert.ok(tiles.length > 0 && tiles.length < 20);
    assert.equal(new Set(tiles.map(tile => `${tile.z}/${tile.x}/${tile.y}`)).size, tiles.length);
    assert.ok(tiles.every(tile => tile.x === 0 || tile.x === 4095));
  });

  test('world-sized bounds stop before enumeration at high zoom', { timeout: 1000 }, () => {
    assert.deepEqual(tilesForBounds({ north: 90, south: -90, west: -180, east: 180 }, { minZoom: 22, maxZoom: 22 }), []);
  });
});

describe('itinHistory', () => {
  test('undo and redo restore snapshots', () => {
    let history = createHistory();
    history = pushHistory(history, 'a');
    history = pushHistory(history, 'b');

    const undone = undoHistory(history, 'c');
    assert.equal(undone.value, 'b');
    assert.equal(undone.changed, true);

    const redone = redoHistory(undone.history, undone.value);
    assert.equal(redone.value, 'c');
  });

  test('push clears the redo stack and caps entries', () => {
    let history = createHistory();
    for (let index = 0; index < 5; index++) history = pushHistory(history, index, 3);
    assert.deepEqual(history.past, [2, 3, 4]);
    const undone = undoHistory(history, 5);
    const pushed = pushHistory(undone.history, 'new', 3);
    assert.deepEqual(pushed.future, []);
  });

  test('undo and redo on empty history are no-ops', () => {
    const history = createHistory();
    assert.equal(undoHistory(history, 'x').changed, false);
    assert.equal(redoHistory(history, 'x').changed, false);
  });
});
