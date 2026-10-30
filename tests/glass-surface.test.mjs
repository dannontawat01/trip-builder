import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const helperUrl = new URL('../src/lib/glassCapabilities.js', import.meta.url);
const chromium = {
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36',
  platform: 'Win32',
  maxTouchPoints: 0,
  supportsBlur: true,
  supportsSvgBackdrop: true,
  reducedTransparency: false,
  forcedColors: false,
  reducedMotion: false,
};

async function resolve(options) {
  const { resolveGlassMode } = await import(helperUrl);
  return resolveGlassMode(options);
}

test('SSR and initial hydration stay CSS unless explicitly opaque', async () => {
  assert.equal(await resolve(), 'css');
  assert.equal(await resolve({ mode: 'auto' }), 'css');
  assert.equal(await resolve({ mode: 'opaque' }), 'opaque');
});

test('verified desktop Chromium permits native dock and toolbar decoration', async () => {
  for (const variant of ['dock', 'toolbar']) {
    assert.equal(await resolve({ variant, capabilities: chromium }), 'native');
  }
});

test('Android Chromium and desktop Edge can use native decoration', async () => {
  for (const userAgent of [
    'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130.0.0.0 Mobile Safari/537.36',
    `${chromium.userAgent} Edg/130.0.0.0`,
  ]) {
    assert.equal(await resolve({ capabilities: { ...chromium, userAgent } }), 'native');
  }
});

test('Safari, Firefox and unknown browsers never use native decoration', async () => {
  for (const userAgent of [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15',
    'Mozilla/5.0 Gecko/20100101 Firefox/130.0',
    `${chromium.userAgent} Firefox/130.0`,
    '',
  ]) {
    assert.equal(await resolve({ capabilities: { ...chromium, userAgent } }), 'css');
  }
});

test('all iOS browser tokens and iPhone or iPad platforms exclude native', async () => {
  for (const token of ['FxiOS/130', 'CriOS/130', 'EdgiOS/130', 'iPhone', 'iPad', 'iPod']) {
    assert.equal(await resolve({ capabilities: { ...chromium, userAgent: `${chromium.userAgent} ${token}` } }), 'css');
  }
  for (const platform of ['iPhone', 'iPad']) {
    assert.equal(await resolve({ capabilities: { ...chromium, platform } }), 'css');
  }
});

test('desktop-mode iPad touch identity excludes native', async () => {
  assert.equal(await resolve({ capabilities: { ...chromium, platform: 'MacIntel', maxTouchPoints: 5 } }), 'css');
  assert.equal(await resolve({ capabilities: { ...chromium, userAgent: `${chromium.userAgent} Macintosh`, maxTouchPoints: 5 } }), 'css');
});

test('Chromium without positive SVG backdrop support stays CSS', async () => {
  for (const supportsSvgBackdrop of [false, undefined, null]) {
    assert.equal(await resolve({ capabilities: { ...chromium, supportsSvgBackdrop } }), 'css');
  }
});

test('no blur, reduced transparency or forced colors always resolve opaque', async () => {
  for (const override of [{ supportsBlur: false }, { reducedTransparency: true }, { forcedColors: true }]) {
    for (const mode of ['auto', 'css', 'opaque']) {
      assert.equal(await resolve({ mode, capabilities: { ...chromium, ...override } }), 'opaque');
    }
  }
});

test('reduced motion uses static CSS even on supported Chromium', async () => {
  assert.equal(await resolve({ capabilities: { ...chromium, reducedMotion: true } }), 'css');
});

test('explicit CSS and opaque modes never upgrade to native', async () => {
  assert.equal(await resolve({ mode: 'css', capabilities: chromium }), 'css');
  assert.equal(await resolve({ mode: 'opaque', capabilities: chromium }), 'opaque');
});

test('map controls are CSS-only even on native-capable browsers', async () => {
  assert.equal(await resolve({ variant: 'map-controls', capabilities: chromium }), 'css');
  assert.equal(await resolve({ variant: 'map-controls', capabilities: { ...chromium, forcedColors: true } }), 'opaque');
});

test('invalid inputs and incomplete capabilities fail conservatively', async () => {
  assert.equal(await resolve(null), 'css');
  assert.equal(await resolve({ mode: 'native', capabilities: chromium }), 'css');
  assert.equal(await resolve({ variant: 'unknown', capabilities: chromium }), 'css');
  assert.equal(await resolve({ capabilities: {} }), 'opaque');
});

const adapterUrl = new URL('../src/app/components/GlassSurface.js', import.meta.url);
const readAdapter = () => readFile(adapterUrl, 'utf8');

test('header command island and map controls use scoped glass variants', async () => {
  const header = await readFile(new URL('../src/app/components/HeaderNav.js', import.meta.url), 'utf8');
  const map = await readFile(new URL('../src/app/components/MapComponent.js', import.meta.url), 'utf8');
  assert.match(header, /<GlassSurface\s+variant="toolbar"\s+className="topbar-action-group"/);
  assert.match(map, /<GlassSurface\s+variant="map-controls"\s+className="map-offline-controls"\s+role="group"/);
  assert.doesNotMatch(map, /<GlassSurface[^>]*variant="(?:dock|toolbar)"/);
});

test('adapter is a client boundary with deterministic initial capabilities', async () => {
  const source = await readAdapter();
  assert.match(source, /^'use client';/);
  assert.match(source, /useState\(null\)/);
  assert.match(source, /data-glass-mode=\{resolvedMode\}/);
  assert.match(source, /glass-surface glass-surface--\$\{safeVariant\}/);
});

test('Vaso import is effect-only and gated with cancellation and CSS failure fallback', async () => {
  const source = await readAdapter();
  assert.doesNotMatch(source, /import\s+.*from\s+['"]vaso/);
  assert.doesNotMatch(source, /vaso\/(?:core|support)/);
  assert.match(source, /if \(desiredMode !== 'native'\) return;/);
  assert.match(source, /import\('vaso'\)/);
  assert.match(source, /\.catch\(/);
  assert.match(source, /if \(!active\) return;/);
  assert.match(source, /active = false/);
  assert.match(source, /desiredMode === 'native' && !VasoComponent \? 'css' : desiredMode/);
});

test('Vaso is only an empty inaccessible noninteractive decorative span', async () => {
  const source = await readAdapter();
  const decoration = source.match(/<VasoComponent\b[\s\S]*?\/>/)?.[0];
  assert.ok(decoration);
  assert.match(decoration, /component="span"/);
  assert.match(decoration, /aria-hidden="true"/);
  assert.match(decoration, /className="glass-surface-effect"/);
  assert.match(source, /position: 'absolute'/);
  assert.match(source, /pointerEvents: 'none'/);
  assert.doesNotMatch(decoration, /component="button"|\{children\}/);
});

test('CSS and opaque modes keep a decorative surface without mounting Vaso', async () => {
  const source = await readAdapter();
  assert.match(source, /resolvedMode === 'native' && VasoComponent \? \(/);
  assert.match(source, /\) : \(\s*<span\s+aria-hidden="true"\s+className="glass-surface-effect"\s*\/>/);
});

test('semantic wrapper forwards native props and keeps real children as direct siblings', async () => {
  const source = await readAdapter();
  assert.match(source, /component: Component = 'div'/);
  assert.match(source, /<Component\s+\{\.\.\.props\}/);
  assert.match(source, /\/>\s*\)\}\s*\{children\}\s*<\/Component>/);
  assert.doesNotMatch(source, /cloneElement|glass-surface-content|dangerouslySetInnerHTML/);
});

test('media changes refresh capabilities and listeners are removed on cleanup', async () => {
  const source = await readAdapter();
  for (const query of ['prefers-reduced-motion: reduce', 'prefers-reduced-transparency: reduce', 'forced-colors: active']) {
    assert.ok(source.includes(query));
  }
  assert.match(source, /addEventListener\('change', updateCapabilities\)/);
  assert.match(source, /removeEventListener\('change', updateCapabilities\)/);
  assert.match(source, /supports\?\.\('backdrop-filter', 'url\(#a\)'\)/);
});

test('native decoration uses fixed light, low depth and no pointer animations', async () => {
  const source = await readAdapter();
  for (const setting of ['outset: 0', 'depth: 0.6', 'blur: 1', 'specular: 0.4', 'light: 315', 'pressable: false', 'ripple: false']) {
    assert.ok(source.includes(setting));
  }
});

test('adapter adds no filter, transform or containment to ancestors of fixed children', async () => {
  const source = await readAdapter();
  assert.doesNotMatch(source, /(?:filter|backdropFilter|transform|contain|overflow)\s*:/);
  assert.doesNotMatch(source, /VasoGroup|requestAnimationFrame|pointermove/);
});