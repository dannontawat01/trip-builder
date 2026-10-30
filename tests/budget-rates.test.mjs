import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../src/app/components/BudgetTab.js', import.meta.url), 'utf8');
const helpers = source.slice(0, source.indexOf('export default function BudgetTab'))
  .replace(/^import .*;\r?\n/gm, '').replaceAll('export const ', 'const ').replaceAll('export function ', 'function ');
const context = vm.createContext({ URL });
vm.runInContext(helpers, context);
const payload = { base: 'THB', quote: 'currency units per THB', rates: { THB: 1, USD: 0.025, JPY: 4, TWD: 0.9 }, exchangeRates: { USD: 40 }, date: '2026-10-29', source: 'frankfurter', unsupportedCurrencies: ['TWD'] };

test('legacy seeded defaults do not override live rates', () => {
  const defaults = vm.runInContext('({ ...DEFAULT_RATES })', context);
  const rates = context.resolveExchangeRates(defaults, { USD: 40, JPY: 0.25 });
  assert.equal(rates.USD, 40);
  assert.equal(rates.JPY, 0.25);
  assert.equal(rates.TWD, defaults.TWD);
});

test('rates invert currency-per-THB exactly once and omit unsupported TWD', () => {
  assert.equal(typeof context.normalizeRateResponse, 'function');
  const normalized = context.normalizeRateResponse(payload);
  assert.equal(normalized.rates.USD, 40);
  assert.equal(normalized.rates.JPY, 0.25);
  assert.equal(normalized.rates.THB, 1);
  assert.equal(normalized.rates.TWD, undefined);
  assert.equal(normalized.date, payload.date);
});

test('manual rates override live values, with defaults for unsupported currencies', () => {
  assert.equal(typeof context.resolveExchangeRates, 'function');
  const rates = context.resolveExchangeRates({ USD: 38, TWD: 1.2 }, { USD: 40, JPY: 0.25 });
  assert.equal(rates.USD, 38);
  assert.equal(rates.TWD, 1.2);
  assert.equal(rates.JPY, 0.25);
  assert.equal(context.resolveExchangeRates({}, { USD: 40 }).TWD, 1.15);
});

test('legacy custom values remain manual while seeded defaults use live rates', () => {
  const stored = vm.runInContext('({ ...DEFAULT_RATES, TWD: 1.2 })', context);
  const rates = context.resolveExchangeRates(stored, { USD: 40, JPY: 0.25 });
  assert.equal(rates.USD, 40);
  assert.equal(rates.JPY, 0.25);
  assert.equal(rates.TWD, 1.2);
  assert.deepEqual(Array.from(context.getManualRateCurrencies(stored)), ['TWD']);
});

test('explicit manual selection preserves equal-default overrides and ignores unselected custom values', () => {
  const stored = { USD: 36.5, JPY: 0.3, TWD: 1.2 };
  const rates = context.resolveExchangeRates(stored, { USD: 40, JPY: 0.25 }, ['USD']);
  assert.equal(rates.USD, 36.5);
  assert.equal(rates.JPY, 0.25);
  assert.equal(rates.TWD, 1.15);
  assert.deepEqual(Array.from(context.getManualRateCurrencies(stored, ['USD'])), ['USD']);
  assert.equal(context.resolveExchangeRates(stored, { USD: 40 }, []).USD, 40);
});

test('manual selection rejects invalid, missing, base, and unsupported currencies', () => {
  const stored = { USD: Infinity, JPY: -1, KRW: '0.03', TWD: 0, THB: 5, GBP: 45 };
  const selection = ['USD', 'USD', 'JPY', 'KRW', 'TWD', 'EUR', 'THB', 'GBP'];
  assert.deepEqual(Array.from(context.getManualRateCurrencies(stored, selection)), []);
  assert.equal(context.resolveExchangeRates(stored, { USD: 40 }, selection).USD, 40);
  assert.equal(context.resolveExchangeRates(null, null, selection).THB, 1);
  assert.deepEqual(Array.from(context.getManualRateCurrencies(null)), []);
});

test('rates reject malformed contracts and nonpositive/nonfinite rates', () => {
  assert.equal(typeof context.normalizeRateResponse, 'function');
  for (const invalid of [null, {}, { ...payload, base: 'USD' }, { ...payload, date: '2026-02-31' }, { ...payload, rates: [] }, ...[0, -1, Infinity, NaN, '0.025', Number.MIN_VALUE].map(value => ({ ...payload, rates: { USD: value } }))]) {
    assert.throws(() => context.normalizeRateResponse(invalid));
  }
  const rates = context.resolveExchangeRates({ USD: Infinity, JPY: -1, KRW: 0, THB: 5 }, {});
  assert.equal(rates.USD, 36.5);
  assert.equal(rates.THB, 1);
});

test('fallback and stale source metadata are retained without inventing a rate date', () => {
  assert.equal(typeof context.normalizeRateResponse, 'function');
  const fallback = context.normalizeRateResponse({ base: 'THB', rates: { THB: 1 }, date: null, source: 'fallback', mock: true });
  assert.equal(fallback.date, null);
  assert.equal(fallback.source, 'fallback');
  assert.equal(fallback.fallback, true);
  const stale = context.normalizeRateResponse({ ...payload, stale: true, mock: true });
  assert.equal(stale.stale, true);
  assert.equal(stale.source, 'frankfurter');
});

function renderBudget(fetchResponse, initialBudget = { exchangeRates: { USD: 38, TWD: 1.2 } }) {
  const updates = [];
  const persisted = [];
  const effects = [];
  const stateValues = [];
  let stateIndex = 0;
  const componentSource = source.slice(0, source.indexOf('\n  return (\n    <div className="budget-tab-wrapper">'))
    .replace(/^import .*;\r?\n/gm, '').replaceAll('export const ', 'const ').replaceAll('export function ', 'function ').replace('export default function ', 'function ');
  const runtime = vm.createContext({
    URL, AbortController, setTimeout, clearTimeout, fetch: fetchResponse,
    useState: initial => {
      const index = stateIndex++;
      if (!(index in stateValues)) stateValues[index] = initial;
      return [stateValues[index], update => {
        stateValues[index] = typeof update === 'function' ? update(stateValues[index]) : update;
        updates.push(stateValues[index]);
      }];
    },
    useMemo: compute => compute(), useCallback: callback => callback,
    useRef: current => ({ current }), useEffect: effect => effects.push(effect)
  });
  vm.runInContext(`${componentSource}\n return { refreshRates, exchangeRates, manualRateCurrencies, handleSaveRates, handleUseDefaultRates, setEditRates, setEditedCurrencies }; }\nglobalThis.render = () => BudgetTab({ budget: globalThis.budget, onUpdateBudget: value => globalThis.persist(value) });`, Object.assign(runtime, { budget: initialBudget, persist: value => persisted.push(value) }));
  const rerender = () => { stateIndex = 0; runtime.component = runtime.render(); };
  rerender();
  return { get component() { return runtime.component; }, rerender, effects, updates, persisted };
}

test('legacy seeded budget uses live rates after refresh without becoming manual', async () => {
  const stored = vm.runInContext('({ ...DEFAULT_RATES })', context);
  const budget = renderBudget(async () => ({ ok: true, json: async () => payload }), { exchangeRates: stored });
  await budget.component.refreshRates();
  budget.rerender();
  assert.equal(budget.component.exchangeRates.USD, 40);
  assert.equal(budget.component.exchangeRates.JPY, 0.25);
  assert.deepEqual(Array.from(budget.component.manualRateCurrencies), []);
  assert.equal(budget.persisted.length, 0);
});

test('saving edits infers existing legacy customs and prunes seeded defaults', () => {
  const stored = vm.runInContext('({ ...DEFAULT_RATES, TWD: 1.2 })', context);
  const budget = renderBudget(undefined, { totalBudget: 500, exchangeRates: stored });
  budget.component.setEditRates({ ...stored, USD: '38' });
  budget.component.setEditedCurrencies(['USD']);
  budget.rerender();
  budget.component.handleSaveRates();
  const saved = JSON.parse(JSON.stringify(budget.persisted[0]));
  assert.deepEqual(saved.exchangeRates, { TWD: 1.2, USD: 38 });
  assert.deepEqual(saved.manualRateCurrencies, ['TWD', 'USD']);
  assert.equal(saved.totalBudget, 500);
  assert.equal(context.resolveExchangeRates(saved.exchangeRates, { JPY: 0.25 }, saved.manualRateCurrencies).JPY, 0.25);
});

test('saving without edits removes legacy seeds and preserves explicit manual defaults', () => {
  const stored = vm.runInContext('({ ...DEFAULT_RATES, JPY: 0.3 })', context);
  for (const selection of [undefined, [], ['USD']]) {
    const budget = renderBudget(undefined, { exchangeRates: stored, manualRateCurrencies: selection });
    budget.component.handleSaveRates();
    const saved = JSON.parse(JSON.stringify(budget.persisted[0]));
    const expected = selection === undefined ? { JPY: 0.3 } : selection.length ? { USD: 36.5 } : {};
    assert.deepEqual(saved.exchangeRates, expected);
    assert.deepEqual(saved.manualRateCurrencies, Object.keys(expected));
  }
});

test('saving merges newly edited currencies into the explicit manual selection', () => {
  const budget = renderBudget(undefined, { exchangeRates: { USD: 36.5, JPY: 0.3 }, manualRateCurrencies: ['USD'] });
  budget.component.setEditRates({ TWD: '1.2' });
  budget.component.setEditedCurrencies(['TWD']);
  budget.rerender();
  budget.component.handleSaveRates();
  const saved = JSON.parse(JSON.stringify(budget.persisted[0]));
  assert.deepEqual(saved.exchangeRates, { USD: 36.5, TWD: 1.2 });
  assert.deepEqual(saved.manualRateCurrencies, ['USD', 'TWD']);
});

test('Use defaults saves explicit manual defaults that continue overriding live rates', () => {
  const budget = renderBudget(undefined, { exchangeRates: { USD: 38 }, manualRateCurrencies: [] });
  budget.component.handleUseDefaultRates();
  budget.rerender();
  budget.component.handleSaveRates();
  const saved = budget.persisted[0];
  assert.equal(saved.exchangeRates.THB, undefined);
  assert.equal(saved.manualRateCurrencies.length, 5);
  const rates = context.resolveExchangeRates(saved.exchangeRates, { USD: 40, JPY: 0.25 }, saved.manualRateCurrencies);
  assert.equal(rates.USD, 36.5);
  assert.equal(rates.JPY, 0.23);
});

test('invalid edited rates do not persist a budget', () => {
  for (const invalid of ['', '0', '-1', 'Infinity', 'invalid']) {
    const budget = renderBudget(undefined);
    budget.component.setEditRates({ USD: invalid });
    budget.component.setEditedCurrencies(['USD']);
    budget.rerender();
    budget.component.handleSaveRates();
    assert.equal(budget.persisted.length, 0);
  }
});

test('manual labels use effective selection and pending modal edits, not seeded values', () => {
  assert.match(source, /manualRateCurrencies\.length > 0 && <div>\{rateCopy\.manual\}: \{manualRateCurrencies\.join/);
  assert.match(source, /editedCurrencies\.includes\(curr\) \|\| manualRateCurrencies\.includes\(curr\) \? rateCopy\.manual/);
});

test('refresh never persists or overwrites saved manual rates', async () => {
  const budget = renderBudget(async (url, options) => {
    assert.equal(url, '/api/rates');
    assert.equal(options.cache, 'no-store');
    return { ok: true, json: async () => payload };
  });
  await budget.component.refreshRates();
  assert.equal(budget.updates.at(-1).status, 'ready');
  assert.equal(budget.updates.at(-1).rates.USD, 40);
  assert.equal(budget.persisted.length, 0);
});

test('unmount aborts rates request and blocks late state updates', async () => {
  let requestSignal;
  let respond;
  const budget = renderBudget(async (_, options) => {
    requestSignal = options.signal;
    return new Promise(resolve => { respond = resolve; });
  });
  const cleanup = budget.effects[0]();
  const countBefore = budget.updates.length;
  cleanup();
  assert.equal(requestSignal.aborted, true);
  respond({ ok: true, json: async () => payload });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(budget.updates.length, countBefore);
});

test('refresh aborts previous request and ignores its late response', async () => {
  const requests = [];
  const budget = renderBudget((_, options) => new Promise(resolve => requests.push({ signal: options.signal, resolve })));
  const first = budget.component.refreshRates();
  const second = budget.component.refreshRates();
  assert.equal(requests[0].signal.aborted, true);
  requests[1].resolve({ ok: true, json: async () => payload });
  await second;
  const countBefore = budget.updates.length;
  requests[0].resolve({ ok: true, json: async () => ({ ...payload, rates: { USD: 0.02 } }) });
  await first;
  assert.equal(budget.updates.length, countBefore);
});