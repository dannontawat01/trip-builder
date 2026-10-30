import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';

const stylesheet = readFileSync(new URL('../src/app/globals.css', import.meta.url), 'utf8');
const require = createRequire(import.meta.url);
const parsedStyles = require('postcss').parse(stylesheet);
const declarationsFor = (selector, property) => {
  const declarations = [];
  parsedStyles.walkRules((rule) => {
    if (rule.selectors.includes(selector)) {
      rule.walkDecls(property, (declaration) => declarations.push(declaration.value));
    }
  });
  return declarations;
};
const lastValue = (selector, property) => declarationsFor(selector, property).at(-1);

test('workspace light palette ends on neutral opaque work surfaces', () => {
  const lightThemes = [...stylesheet.matchAll(/:root\s*\{([^}]+)\}/g)].map((match) => match[1]).join('\n');
  const finalToken = (name) => [...lightThemes.matchAll(new RegExp(`--${name}:\\s*([^;]+);`, 'g'))].at(-1)?.[1];
  assert.equal(finalToken('bg'), '#f3f5f6');
  assert.equal(finalToken('card'), '#ffffff');
  assert.equal(finalToken('teal'), '#087F5B');
  assert.equal(finalToken('blue'), '#2563EB');
  assert.equal(finalToken('amber'), '#B45309');
});

test('retires all-content Liquid Glass and Apple font layers', () => {
  assert.ok(!stylesheet.includes('Liquid Glass layer (Apple-style'));
  assert.ok(!stylesheet.includes('--font-apple'));
  assert.equal(lastValue('.ambient-background', 'display'), 'none');
  assert.ok(!stylesheet.includes('radial-gradient(40vmax'));
});

test('only the adapter decoration can blur the backdrop', () => {
  const blurredSelectors = [];
  parsedStyles.walkDecls(/backdrop-filter$/, (declaration) => {
    if (declaration.value !== 'none') blurredSelectors.push(declaration.parent.selector);
  });
  assert.ok(blurredSelectors.length > 0);
  assert.ok(blurredSelectors.every((selector) => selector.includes('.glass-surface-effect')),
    `Unexpected blurred surfaces: ${blurredSelectors.join(', ')}`);
  assert.equal(lastValue('.glass-surface', 'backdrop-filter'), 'none');
  assert.equal(lastValue('.glass-surface-effect', 'pointer-events'), 'none');
  assert.equal(lastValue('.glass-surface-effect', 'position'), 'absolute');
  assert.equal(lastValue('.glass-surface-effect', 'inset'), '0');
});

test('adapter preserves direct nav buttons and native decoration internals', () => {
  assert.equal(lastValue('.glass-surface > :not(.glass-surface-effect)', 'position'), 'relative');
  assert.ok(!/\.glass-surface\s+\*\s*\{/.test(stylesheet));
  for (const variant of ['dock', 'toolbar', 'map-controls']) {
    assert.ok(stylesheet.includes(`.glass-surface--${variant}`));
  }
});

test('native, CSS, opaque and accessibility fallback modes are explicit', () => {
  for (const mode of ['native', 'css', 'opaque']) {
    assert.ok(stylesheet.includes(`[data-glass-mode="${mode}"]`));
  }
  for (const preference of ['prefers-reduced-motion', 'prefers-reduced-transparency', 'forced-colors']) {
    assert.ok(stylesheet.includes(`(${preference}:`));
  }
  assert.ok(stylesheet.includes('@supports not ((backdrop-filter:'));
});

test('content surfaces are opaque and top-level sections are unframed', () => {
  for (const selector of ['.sidebar', '.nearby', '.trip-bar', '.summary-bar', '.day-zone', '.modal', '.lm-card', '.it-item']) {
    assert.equal(lastValue(selector, 'background'), 'var(--card)', selector);
  }
  for (const selector of ['.trip-bar', '.summary-bar', '.day-zone', '.stat-card']) {
    assert.equal(lastValue(selector, 'box-shadow'), 'none', selector);
  }
  for (const selector of ['.lm-card', '.it-item']) {
    assert.equal(lastValue(selector, 'border-radius'), '8px', selector);
  }
});

test('day columns scroll locally at a readable minimum and place names wrap', () => {
  assert.equal(lastValue('.days-grid-wrapper', 'overflow-x'), 'auto');
  assert.equal(lastValue('.days-grid', 'grid-template-columns'), 'none');
  assert.equal(lastValue('.days-grid', 'grid-auto-columns'), 'minmax(280px, 1fr)');
  for (const selector of ['.it-name', '.lm-name']) {
    assert.equal(lastValue(selector, 'white-space'), 'normal');
    assert.equal(lastValue(selector, 'text-overflow'), 'clip');
  }
});

test('workspace uses the shared Thai/Latin font stack and readable type', () => {
  assert.equal(lastValue('body', 'font-family'), 'var(--font-body)');
  assert.equal(lastValue('body', 'font-size'), '14px');
  assert.equal(lastValue('body', 'line-height'), '1.55');
  assert.ok(stylesheet.includes('--font-body: var(--font-dm-sans'));
  assert.ok(stylesheet.includes('var(--font-noto-sans-thai,'));
  assert.equal(lastValue('*', 'letter-spacing'), '0');
  const tinyType = [];
  parsedStyles.walkDecls('font-size', (declaration) => {
    const pixelSize = /^(\d+(?:\.\d+)?)px$/.exec(declaration.value);
    if (pixelSize && Number(pixelSize[1]) < 12) tinyType.push(declaration.parent.selector);
  });
  assert.deepEqual(tinyType, []);
});

test('trip setup AI action fits its track and keeps an inset from the form edge', () => {
  assert.equal(lastValue('.ai-plan-btn', 'min-width'), '0');
  assert.equal(lastValue('.ai-plan-btn', 'max-width'), '100%');
  assert.equal(lastValue('.ai-plan-btn', 'white-space'), 'normal');
  assert.equal(lastValue('.ai-plan-btn', 'overflow-wrap'), 'anywhere');
  assert.equal(lastValue('.trip-bar', 'padding'), '16px');
});

test('narrow sidebar tabs shrink and wrap instead of clipping', () => {
  assert.equal(lastValue('.sidebar-tab-btn', 'min-width'), '0');
  assert.equal(lastValue('.sidebar-tab-btn', 'white-space'), 'normal');
  assert.equal(lastValue('.sidebar-tab-btn', 'overflow-wrap'), 'anywhere');
});

test('mobile dock has five balanced actions without a duplicate export', () => {
  const pageSource = readFileSync(new URL('../src/app/page.js', import.meta.url), 'utf8');
  const dock = pageSource.match(/<GlassSurface component="nav"[\s\S]*?<\/GlassSurface>/)?.[0];
  assert.ok(dock);
  assert.equal([...dock.matchAll(/<button\b/g)].length, 5);
  assert.doesNotMatch(dock, /setExportModalOpen|mobExport/);
  assert.equal(lastValue('.mob-nav', 'grid-template-columns'), 'repeat(5, minmax(44px, 1fr))');
  assert.match(pageSource, /className="btn btn-primary btn-sm" onClick=\{\(\) => setExportModalOpen\(true\)\}/);
});

test('mobile dock keeps safe area and forty-four pixel button targets', () => {
  assert.ok(declarationsFor('.mob-nav', 'padding').some((value) => value.includes('safe-area-inset-bottom')));
  assert.equal(lastValue('.mob-nav-btn', 'min-height'), '44px');
  assert.equal(lastValue('.mob-nav-center-add', 'min-width'), '44px');
  assert.ok(stylesheet.includes('z-index: 10030 !important'));
  assert.ok(stylesheet.includes('z-index: 15000 !important'));
  assert.ok(stylesheet.includes('z-index: 20000 !important'));
});

test('glass dock stays viewport-fixed and native decoration fills its span', () => {
  assert.equal(lastValue('.mob-nav.glass-surface', 'position'), 'fixed');
  assert.equal(lastValue('.glass-surface-effect > :only-child', 'display'), 'block');
});

test('dark work surfaces resolve aliases on the dark body', () => {
  for (const [property, value] of Object.entries({
    '--surface': 'var(--card)',
    '--surface2': 'var(--surface-hover)',
    '--text': 'var(--dark)',
    '--text-primary': 'var(--dark)',
    '--text-secondary': 'var(--muted)',
  })) {
    assert.equal(lastValue('body.theme-dark', property), value);
  }
});

test('budget sections and inline forms do not nest framed cards', () => {
  for (const selector of ['.budget-stats-grid', '.budget-add-form']) {
    assert.equal(lastValue(selector, 'border-radius'), '0');
    assert.equal(lastValue(selector, 'border'), '0');
  }
});

test('unsupported blur stays opaque even when motion preferences also match', () => {
  let opaqueFallback = false;
  parsedStyles.walkAtRules('supports', (supportRule) => {
    if (!supportRule.params.startsWith('not ((backdrop-filter:')) return;
    supportRule.walkDecls('background', (declaration) => {
      if (declaration.value === 'var(--card)' && declaration.important) opaqueFallback = true;
    });
  });
  assert.ok(opaqueFallback);
});

test('budget primary actions retain emerald fill in both themes', () => {
  assert.equal(lastValue('.budget-primary-btn', 'background'), 'var(--teal)');
  assert.equal(lastValue('.rates-save-btn', 'background'), 'var(--teal)');
});

test('tablet drawers stop before the 1280px workspace breakpoint', () => {
  assert.ok(!stylesheet.includes('(min-width: 1025px) and (max-width: 1280px)'));
  assert.ok(stylesheet.includes('(min-width: 1025px) and (max-width: 1279px)'));
});