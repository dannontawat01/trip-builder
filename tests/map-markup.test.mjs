import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { escapeHtml } from '../src/lib/htmlEscape.js';
import { getOfflineProvider } from '../src/lib/offlineMap.js';

const source = await readFile(new URL('../src/app/components/MapComponent.js', import.meta.url), 'utf8');
const helpers = source.slice(0, source.indexOf('export default function MapComponent'))
  .replace(/^import .*;\r?\n/gm, '').replaceAll('export function ', 'function ');
const context = vm.createContext({ URL, escapeHtml, getOfflineProvider, process: { env: {} } });
vm.runInContext(helpers, context);

test('all place-derived fields are escaped before Leaflet parses markup', () => {
  assert.equal(typeof context.createPlaceMarkup, 'function');
  const attack = '<img src=x onerror="alert(1)">';
  const markup = context.createPlaceMarkup({ icon: attack, names: { en: attack }, rating: attack, dur: attack, addr: attack, gmaps_url: 'javascript:alert(1)' }, 1, 0, 'red; background:url(javascript:alert(1))', 'en', 13, 100);
  assert.ok(markup.iconHtml.includes('&lt;img'));
  assert.ok(markup.popupContent.includes('&lt;img'));
  assert.ok(!markup.popupContent.includes('<img'));
  assert.ok(!markup.popupContent.includes('href="javascript:'));
  assert.ok(!markup.popupContent.includes('background:url('));
  assert.ok(!markup.iconHtml.includes('background:url('));
  assert.ok(markup.popupContent.includes('https://www.google.com/maps/search/'));
});

test('safe maps URLs survive attribute escaping without permitting quote injection', () => {
  assert.equal(typeof context.createPlaceMarkup, 'function');
  const markup = context.createPlaceMarkup({ name: 'Cafe & Tea', gmaps_url: 'https://www.google.com/maps?q=" onmouseover="alert(1)' }, 1, 0, '#639922', 'th', 0, 0);
  assert.ok(markup.popupContent.includes('Cafe &amp; Tea'));
  assert.ok(!markup.popupContent.includes(' onmouseover="'));
});

test('offline provider requires explicit licence and safe fixed HTTPS origin', () => {
  const authorized = 'https://tiles.example.com/{z}/{x}/{y}.png';
  assert.equal(getOfflineProvider(authorized, 'false'), null);
  assert.ok(getOfflineProvider(authorized, 'true'));
  for (const template of ['https://tile.openstreetmap.org/{z}/{x}/{y}.png', 'https://a.basemaps.cartocdn.com/{z}/{x}/{y}.png', 'http://tiles.example.com/{z}/{x}/{y}.png', 'https://{x}.example.com/{z}/{y}.png', 'https://user:pass@tiles.example.com/{z}/{x}/{y}.png', 'https://192.168.1.1/{z}/{x}/{y}.png']) {
    assert.equal(getOfflineProvider(template, 'true'), null, template);
  }
});

test('map cleanup clears refs and ignores late ResizeObserver callbacks', () => {
  const initialization = source.slice(source.indexOf('  // Initialize Map'), source.indexOf('  // Handle City Change'));
  let resize;
  let cleanup;
  let invalidations = 0;
  let stopped = 0;
  const map = { setView() { return this; }, invalidateSize() { invalidations++; }, stop() { stopped++; }, remove() {} };
  const references = { mapRef: { current: null }, mapContainerRef: { current: {} }, markersLayerRef: { current: null }, pathsLayerRef: { current: null } };
  const scope = vm.createContext({ ...references, activeCity: 'bkk', CITY_COORDS: { bkk: [13, 100] }, OFFLINE_PROVIDER: null, process: { env: {} },
    L: { map: () => map, control: { zoom: () => ({ addTo() {} }) }, tileLayer: () => ({ addTo() {} }), layerGroup: () => ({ addTo() { return this; } }) },
    ResizeObserver: class { constructor(callback) { resize = callback; } observe() {} disconnect() {} },
    useEffect: effect => { cleanup = effect(); }
  });
  vm.runInContext(initialization, scope);
  resize();
  assert.equal(invalidations, 1);
  cleanup();
  assert.equal(references.mapRef.current, null);
  assert.equal(references.markersLayerRef.current, null);
  assert.equal(references.pathsLayerRef.current, null);
  assert.equal(stopped, 1);
  resize();
  assert.equal(invalidations, 1);
});