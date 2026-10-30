'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import ToolbarIcon from './ToolbarIcon';

export const CURRENCY_SYMBOLS = {
  THB: '฿',
  USD: '$',
  JPY: '¥',
  KRW: '₩',
  EUR: '€',
  TWD: 'NT$'
};

export const DEFAULT_RATES = {
  THB: 1.0,
  KRW: 0.027,
  JPY: 0.23,
  USD: 36.5,
  EUR: 39.5,
  TWD: 1.15
};

export const EXPENSE_CATEGORIES = [
  { id: 'food', icon: '🍜', color: '#f59e0b', th: 'อาหาร & เครื่องดื่ม', en: 'Food & Dining' },
  { id: 'transport', icon: '🚆', color: '#3b82f6', th: 'การเดินทาง', en: 'Transportation' },
  { id: 'hotel', icon: '🏨', color: '#8b5cf6', th: 'ที่พัก', en: 'Accommodation' },
  { id: 'ticket', icon: '🎟️', color: '#ec4899', th: 'ค่าเข้าชม / ตั๋ว', en: 'Tickets & Activities' },
  { id: 'shopping', icon: '🛍️', color: '#10b981', th: 'ช้อปปิ้ง', en: 'Shopping' },
  { id: 'other', icon: '📦', color: '#6b7280', th: 'อื่นๆ', en: 'Others' }
];

const RATES_TIMEOUT_MS = 12000;
const FIELD_STYLE = { display: 'grid', gap: '8px', minWidth: 0, fontSize: '12px', fontWeight: 600, color: 'var(--muted)' };
const CONTROL_STYLE = { width: '100%', minWidth: 0, minHeight: '44px', padding: '8px 12px', fontSize: '14px', background: 'var(--card)', color: 'var(--dark)', border: '1px solid var(--border)', borderRadius: '8px', boxSizing: 'border-box' };
const BUTTON_STYLE = { minHeight: '44px', fontSize: '14px', whiteSpace: 'normal' };
const TOOL_STYLE = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '44px', minHeight: '44px', padding: '8px', background: 'var(--card)', color: 'var(--dark)', border: '1px solid var(--border)', borderRadius: '8px', flexShrink: 0 };
const GRID_STYLE = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '16px' };
const LABEL_STYLE = { fontSize: '12px', color: 'var(--muted)', letterSpacing: 0, textTransform: 'none' };
const VALUE_STYLE = { fontSize: '20px', fontWeight: 700, color: 'var(--dark)', whiteSpace: 'normal', overflowWrap: 'anywhere' };
const RATE_COPY = {
  th: { refresh: 'รีเฟรชอัตราแลกเปลี่ยน', loading: 'กำลังโหลดอัตรา...', source: 'แหล่งข้อมูล', date: 'วันที่อัตรา', unknownDate: 'ไม่ระบุวันที่', fallback: 'ค่าเริ่มต้นโดยประมาณ', stale: 'อัตราล่าสุดที่มี อาจไม่เป็นปัจจุบัน', error: 'โหลดอัตราไม่ได้ ใช้อัตราที่มีอยู่', manual: 'กำหนดเอง', live: 'Frankfurter', unsupported: 'ไม่มีอัตราสด ใช้ค่ากำหนดเอง/ค่าเริ่มต้น', invalid: 'กรุณาระบุอัตราที่เป็นจำนวนบวกและมีค่าจำกัด', reset: 'ใช้ค่าเริ่มต้น', units: 'THB ต่อ 1 หน่วยสกุลเงิน', currency: 'สกุลเงินหลัก' },
  en: { refresh: 'Refresh exchange rates', loading: 'Loading rates...', source: 'Source', date: 'Rate date', unknownDate: 'Date unavailable', fallback: 'Approximate defaults', stale: 'Last known rates; may be outdated', error: 'Rates unavailable; keeping existing rates', manual: 'Manual', live: 'Frankfurter', unsupported: 'No live rate; using manual/default', invalid: 'Enter positive finite exchange rates', reset: 'Use defaults', units: 'THB per 1 currency unit', currency: 'Base currency' }
};

export function normalizeRateResponse(payload) {
  if (!payload || payload.base !== 'THB' || (payload.quote !== undefined && payload.quote !== 'currency units per THB') || !payload.rates || typeof payload.rates !== 'object' || Array.isArray(payload.rates)) throw new Error('Invalid rates contract');
  const date = payload.date ?? null;
  if (date !== null && (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date)) throw new Error('Invalid rate date');
  const source = payload.source === 'frankfurter' ? 'frankfurter' : 'fallback';
  if (source === 'frankfurter' && date === null) throw new Error('Missing rate date');
  const unsupported = new Set(Array.isArray(payload.unsupportedCurrencies) ? payload.unsupportedCurrencies : []);
  if (source === 'frankfurter') unsupported.add('TWD');
  const rates = { THB: 1 };
  for (const currency of Object.keys(DEFAULT_RATES)) {
    const value = payload.rates[currency];
    if (value === undefined || unsupported.has(currency)) continue;
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || !Number.isFinite(1 / value) || 1 / value <= 0 || (currency === 'THB' && value !== 1)) throw new Error('Invalid exchange rate');
    if (source !== 'fallback') rates[currency] = 1 / value;
  }
  const unavailable = Object.keys(DEFAULT_RATES).filter(currency => currency !== 'THB' && rates[currency] === undefined);
  return { rates, date, source, stale: payload.stale === true, fallback: payload.mock === true || source === 'fallback', unavailable };
}

export function getManualRateCurrencies(storedRates, manualCurrencies) {
  return Object.keys(DEFAULT_RATES).filter(currency => {
    const value = storedRates?.[currency];
    return currency !== 'THB' && typeof value === 'number' && Number.isFinite(value) && value > 0
      && (Array.isArray(manualCurrencies) ? manualCurrencies.includes(currency) : value !== DEFAULT_RATES[currency]);
  });
}

export function resolveExchangeRates(storedRates, liveRates = {}, manualCurrencies) {
  const rates = { ...DEFAULT_RATES };
  for (const currency of Object.keys(DEFAULT_RATES)) {
    const value = liveRates?.[currency];
    if (currency !== 'THB' && typeof value === 'number' && Number.isFinite(value) && value > 0) rates[currency] = value;
  }
  for (const currency of getManualRateCurrencies(storedRates, manualCurrencies)) {
    rates[currency] = storedRates[currency];
  }
  return rates;
}

export default function BudgetTab({
  budget = {},
  onUpdateBudget,
  activeLang = 'th',
  t,
  itin = {},
  nDays = 3,
  landmarks = [],
  groupMembers = [],
  toast = () => {}
}) {
  // Normalize budget state
  const totalBudget = Number.isFinite(Number(budget.totalBudget)) ? Math.max(0, Number(budget.totalBudget)) : 0;
  const baseCurrency = budget.baseCurrency || 'THB';
  const [rateState, setRateState] = useState({ rates: {}, source: 'fallback', date: null, fallback: true, stale: false, unavailable: ['TWD'], status: 'idle' });
  const ratesRequestRef = useRef(null);
  const manualRateCurrencies = useMemo(() => getManualRateCurrencies(budget.exchangeRates, budget.manualRateCurrencies), [budget.exchangeRates, budget.manualRateCurrencies]);
  const exchangeRates = useMemo(() => resolveExchangeRates(budget.exchangeRates, rateState.rates, budget.manualRateCurrencies), [budget.exchangeRates, rateState.rates, budget.manualRateCurrencies]);
  const rateCopy = RATE_COPY[activeLang] || RATE_COPY.en;
  const refreshRates = useCallback(async () => {
    ratesRequestRef.current?.abort();
    const controller = new AbortController();
    ratesRequestRef.current = controller;
    const timer = setTimeout(() => controller.abort(), RATES_TIMEOUT_MS);
    setRateState(previous => ({ ...previous, status: 'loading' }));
    try {
      const response = await fetch('/api/rates', { signal: controller.signal, cache: 'no-store', credentials: 'same-origin', redirect: 'error' });
      if (!response.ok) throw new Error('Rates unavailable');
      const snapshot = normalizeRateResponse(await response.json());
      if (!controller.signal.aborted && ratesRequestRef.current === controller) setRateState({ ...snapshot, status: 'ready' });
    } catch {
      if (ratesRequestRef.current === controller) setRateState(previous => ({ ...previous, status: 'error', stale: true }));
    } finally {
      clearTimeout(timer);
      if (ratesRequestRef.current === controller) ratesRequestRef.current = null;
    }
  }, []);

  useEffect(() => {
    refreshRates();
    return () => {
      const controller = ratesRequestRef.current;
      ratesRequestRef.current = null;
      controller?.abort();
    };
  }, [refreshRates]);
  const rawExpenses = budget.expenses;
  const expenses = useMemo(() => Array.isArray(rawExpenses) ? rawExpenses : [], [rawExpenses]);

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [showRatesModal, setShowRatesModal] = useState(false);
  const [filterDay, setFilterDay] = useState('all');
  const [filterCat, setFilterCat] = useState('all');

  // New Expense form fields
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(baseCurrency);
  const [category, setCategory] = useState('food');
  const [day, setDay] = useState('all');
  const [linkedPlaceId, setLinkedPlaceId] = useState('');
  const [paidBy, setPaidBy] = useState('Me');
  const [splitMembersInput, setSplitMembersInput] = useState('');

  // Editable rates state
  const [editRates, setEditRates] = useState(exchangeRates);
  const [editedCurrencies, setEditedCurrencies] = useState([]);

  // Conversion helper: converts any amount in currency to baseCurrency
  const convertToBase = useCallback((amt, curr) => {
    const val = Number(amt) || 0;
    if (curr === baseCurrency) return val;
    const fromRate = exchangeRates[curr] || 1;
    const toRate = exchangeRates[baseCurrency] || 1;
    // fromRate is relative to THB (1 unit = X THB)
    return (val * fromRate) / toRate;
  }, [baseCurrency, exchangeRates]);

  // Format currency
  const formatMoney = (val, curr = baseCurrency) => {
    const sym = CURRENCY_SYMBOLS[curr] || curr;
    return `${sym}${Number(val).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  // Total spent in base currency
  const totalSpent = useMemo(() => {
    return expenses.reduce((sum, item) => sum + convertToBase(item.amount, item.currency), 0);
  }, [expenses, convertToBase]);

  // Remaining budget
  const remaining = totalBudget - totalSpent;
  const isOverBudget = totalBudget > 0 && remaining < 0;
  const spentPercent = totalBudget > 0 ? Math.min(100, Math.round((totalSpent / totalBudget) * 100)) : 0;

  // Category breakdown
  const categoryStats = useMemo(() => {
    const map = {};
    EXPENSE_CATEGORIES.forEach(c => { map[c.id] = 0; });
    expenses.forEach(item => {
      const cat = item.category || 'other';
      const converted = convertToBase(item.amount, item.currency);
      map[cat] = (map[cat] || 0) + converted;
    });
    return EXPENSE_CATEGORIES.map(c => ({
      ...c,
      total: map[c.id] || 0,
      percent: totalSpent > 0 ? Math.round(((map[c.id] || 0) / totalSpent) * 100) : 0
    })).filter(c => c.total > 0);
  }, [expenses, totalSpent, convertToBase]);

  // Split bill settlement matrix
  const settlements = useMemo(() => {
    // balance[person] = positive (paid more than share, owed money), negative (owes money)
    const balances = {};
    expenses.forEach(item => {
      const converted = convertToBase(item.amount, item.currency);
      const payer = (item.paidBy || 'Me').trim();
      const splitters = Array.isArray(item.splitWith) && item.splitWith.length > 0 
        ? item.splitWith.map(s => s.trim()).filter(Boolean)
        : [payer];

      if (!balances[payer]) balances[payer] = 0;
      balances[payer] += converted;

      const perPerson = converted / splitters.length;
      splitters.forEach(sp => {
        if (!balances[sp]) balances[sp] = 0;
        balances[sp] -= perPerson;
      });
    });

    const debtors = [];
    const creditors = [];

    Object.keys(balances).forEach(person => {
      const bal = Math.round(balances[person] * 100) / 100;
      if (bal < -0.01) debtors.push({ person, amount: -bal });
      else if (bal > 0.01) creditors.push({ person, amount: bal });
    });

    const results = [];
    let dIdx = 0, cIdx = 0;
    while (dIdx < debtors.length && cIdx < creditors.length) {
      const debtor = debtors[dIdx];
      const creditor = creditors[cIdx];
      const settledAmt = Math.min(debtor.amount, creditor.amount);

      if (settledAmt > 0.01) {
        results.push({
          from: debtor.person,
          to: creditor.person,
          amount: settledAmt
        });
      }

      debtor.amount -= settledAmt;
      creditor.amount -= settledAmt;

      if (debtor.amount <= 0.01) dIdx++;
      if (creditor.amount <= 0.01) cIdx++;
    }

    return results;
  }, [expenses, convertToBase]);

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter(item => {
      if (filterDay !== 'all' && String(item.day) !== String(filterDay)) return false;
      if (filterCat !== 'all' && item.category !== filterCat) return false;
      return true;
    });
  }, [expenses, filterDay, filterCat]);

  // Collect places in itinerary for dropdown linking
  const placesInItin = useMemo(() => {
    const list = [];
    Object.keys(itin).forEach(dayKey => {
      const dayPlaces = itin[dayKey] || [];
      dayPlaces.forEach(p => {
        const foundLm = landmarks.find(l => l.id === p.id);
        list.push({
          id: p.id,
          name: p.customName || foundLm?.name || `Place #${p.id}`,
          day: dayKey
        });
      });
    });
    return list;
  }, [itin, landmarks]);

  // Handlers
  const handleUpdateTotalBudget = (val) => {
    if (!Number.isFinite(Number(val)) || Number(val) < 0) return;
    const newTotal = Number(val);
    onUpdateBudget({ ...budget, totalBudget: newTotal });
  };

  const handleUpdateBaseCurrency = (newCurr) => {
    onUpdateBudget({ ...budget, baseCurrency: newCurr });
    setCurrency(newCurr);
  };

  const handleAddExpense = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      toast(activeLang === 'th' ? '⚠️ กรุณาระบุชื่อรายการ' : '⚠️ Please enter item name');
      return;
    }
    const parsedAmt = Number(amount);
    if (!Number.isFinite(parsedAmt) || parsedAmt <= 0) {
      toast(activeLang === 'th' ? '⚠️ กรุณาระบุจำนวนเงินที่ถูกต้อง' : '⚠️ Please enter a valid amount');
      return;
    }

    const splitList = splitMembersInput.trim()
      ? splitMembersInput.split(',').map(s => s.trim()).filter(Boolean)
      : [paidBy.trim() || 'Me'];

    const newExpense = {
      id: `exp_${crypto.randomUUID()}`,
      title: title.trim(),
      amount: parsedAmt,
      currency,
      category,
      day: day === 'all' ? null : Number(day),
      placeId: linkedPlaceId ? Number(linkedPlaceId) : null,
      paidBy: paidBy.trim() || 'Me',
      splitWith: splitList,
      createdAt: new Date().toISOString()
    };

    const updatedExpenses = [newExpense, ...expenses];
    onUpdateBudget({ ...budget, expenses: updatedExpenses });

    toast(activeLang === 'th' ? '➕ บันทึกค่าใช้จ่ายสำเร็จ!' : '➕ Expense added successfully!');
    setTitle('');
    setAmount('');
    setLinkedPlaceId('');
    setShowAddForm(false);
  };

  const handleDeleteExpense = (id) => {
    if (window.confirm(t('deleteExpenseConfirm') || 'Delete this expense?')) {
      const updated = expenses.filter(item => item.id !== id);
      onUpdateBudget({ ...budget, expenses: updated });
      toast(activeLang === 'th' ? '🗑️ ลบรายการเรียบร้อย' : '🗑️ Expense removed');
    }
  };

  const handleSaveRates = () => {
    const manualRates = Object.fromEntries(manualRateCurrencies.map(currency => [currency, budget.exchangeRates[currency]]));
    for (const currency of editedCurrencies) {
      const value = Number(editRates[currency]);
      if (!Number.isFinite(value) || value <= 0) return toast(rateCopy.invalid);
      manualRates[currency] = value;
    }
    onUpdateBudget({ ...budget, exchangeRates: manualRates, manualRateCurrencies: Object.keys(manualRates) });
    setShowRatesModal(false);
    toast(activeLang === 'th' ? '✅ บันทึกอัตราแลกเปลี่ยนแล้ว' : '✅ Exchange rates updated');
  };

  const handleUseDefaultRates = () => {
    setEditRates({ ...DEFAULT_RATES });
    setEditedCurrencies(Object.keys(DEFAULT_RATES).filter(currency => currency !== 'THB'));
  };

  return (
    <div className="budget-tab-wrapper">
      <div style={{ display: 'grid', gap: '24px', minWidth: 0, color: 'var(--dark)', fontSize: '14px', lineHeight: 1.6 }}>
      {/* ─── BUDGET HEADER & SUMMARY CARD ─── */}
      <section className="budget-summary-section" aria-labelledby="budget-title">
        <div className="budget-summary-header" style={{ flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
          <div className="budget-title-area">
            <div>
              <h3 id="budget-title" className="budget-title" style={{ fontSize: '18px', color: 'var(--dark)' }}>{t('budgetTitle')}</h3>
              <p className="budget-subtitle" style={{ fontSize: '12px', marginTop: '8px' }}>
                {t('baseCurrency')}: <strong>{baseCurrency} ({CURRENCY_SYMBOLS[baseCurrency] || ''})</strong>
              </p>
            </div>
          </div>
          <div className="budget-header-actions" style={{ flexWrap: 'wrap', gap: '8px', alignItems: 'end' }}>
            <label style={FIELD_STYLE}>{t('baseCurrency')}
            <select
              value={baseCurrency}
              onChange={(e) => handleUpdateBaseCurrency(e.target.value)}
              className="budget-curr-select"
              style={CONTROL_STYLE}
              title={rateCopy.currency}
              aria-label={rateCopy.currency}
            >
              {Object.keys(DEFAULT_RATES).map(c => (
                <option key={c} value={c}>{c} ({CURRENCY_SYMBOLS[c]})</option>
              ))}
            </select>
            </label>
            <button
              type="button"
              onClick={() => { setEditRates(exchangeRates); setEditedCurrencies([]); setShowRatesModal(true); }}
              className="budget-rates-btn"
              style={TOOL_STYLE}
              title={t('manageRates')}
              aria-label={t('manageRates')}
            >
              <ToolbarIcon name="settings" />
            </button>
            <button type="button" className="budget-rates-btn" style={TOOL_STYLE} onClick={refreshRates} disabled={rateState.status === 'loading'} title={rateCopy.refresh} aria-label={rateCopy.refresh}><ToolbarIcon name="refresh" spinning={rateState.status === 'loading'} /></button>
          </div>
        </div>

        <div role="status" aria-live="polite" style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '16px', overflowWrap: 'anywhere' }}>
          {rateState.status === 'loading' ? rateCopy.loading : rateState.status === 'error' ? rateCopy.error : rateState.stale ? rateCopy.stale : rateState.fallback ? rateCopy.fallback : rateCopy.live}
          {' · '}{rateCopy.source}: {rateState.source === 'frankfurter' ? rateCopy.live : rateCopy.fallback}
          {' · '}{rateCopy.date}: {rateState.date || rateCopy.unknownDate}
          {rateState.unavailable.length > 0 && <div>{rateState.unavailable.join(', ')}: {rateCopy.unsupported}</div>}
          {manualRateCurrencies.length > 0 && <div>{rateCopy.manual}: {manualRateCurrencies.join(', ')}</div>}
        </div>

        {/* Budget Numbers Grid */}
        <div className="budget-stats-grid" style={{ ...GRID_STYLE, background: 'none', padding: '16px 0', borderRadius: 0, borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', marginBottom: '16px' }}>
          <div className="budget-stat-box" style={{ minWidth: 0, gap: '8px' }}>
            <label htmlFor="budget-total" className="stat-label" style={LABEL_STYLE}>{t('totalBudget')}</label>
            <div className="budget-input-group" style={{ gap: '8px' }}>
              <span className="input-sym" style={{ fontSize: '14px', color: 'var(--teal-d)' }}>{CURRENCY_SYMBOLS[baseCurrency]}</span>
              <input
                id="budget-total"
                type="number"
                min="0"
                step="100"
                value={totalBudget || ''}
                onChange={(e) => handleUpdateTotalBudget(e.target.value)}
                placeholder="0"
                className="budget-stat-input"
                style={{ ...CONTROL_STYLE, fontWeight: 700, outline: 'revert' }}
              />
            </div>
          </div>

          <div className="budget-stat-box" style={{ minWidth: 0, gap: '8px' }}>
            <span className="stat-label" style={LABEL_STYLE}>{t('spent')}</span>
            <span className="stat-val spent-val" style={VALUE_STYLE}>{formatMoney(totalSpent)}</span>
          </div>

          <div className={`budget-stat-box ${isOverBudget ? 'stat-over' : 'stat-good'}`} style={{ minWidth: 0, gap: '8px' }}>
            <span className="stat-label" style={LABEL_STYLE}>{isOverBudget ? t('overBudget') : t('remaining')}</span>
            <span className="stat-val" style={{ ...VALUE_STYLE, color: isOverBudget ? 'var(--dark)' : 'var(--teal-d)' }}>{formatMoney(Math.abs(remaining))}</span>
          </div>
        </div>

        {/* Progress Bar */}
        {totalBudget > 0 && (
          <div className="budget-bar-container">
            <div className="budget-bar-bg" role="progressbar" aria-label={t('spent')} aria-valuenow={spentPercent} aria-valuemin={0} aria-valuemax={100} style={{ background: 'var(--border)' }}>
              <div
                className={`budget-bar-fill ${isOverBudget ? 'bar-over' : ''}`}
                style={{ width: `${Math.min(100, spentPercent)}%`, background: isOverBudget ? 'var(--dark)' : 'var(--teal)' }}
              />
            </div>
            <div className="budget-bar-info" style={{ fontSize: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <span>{spentPercent}% {t('spent')}</span>
              <span>{isOverBudget ? `${t('overBudget')} ${formatMoney(Math.abs(remaining))}` : `${t('remaining')} ${formatMoney(remaining)}`}</span>
            </div>
          </div>
        )}

        {/* Category Breakdown Bar */}
        {categoryStats.length > 0 && (
          <div className="budget-cat-breakdown">
            <div className="cat-multibar">
              {categoryStats.map(c => (
                <div
                  key={c.id}
                  className="cat-bar-segment"
                  style={{ width: `${c.percent}%`, backgroundColor: c.color }}
                  title={`${c[activeLang] || c.th}: ${formatMoney(c.total)} (${c.percent}%)`}
                />
              ))}
            </div>
            <div className="cat-pills-row">
              {categoryStats.map(c => (
                <div key={c.id} className="cat-pill" style={{ fontSize: '12px', padding: '8px 0', background: 'none', gap: '8px', flexWrap: 'wrap' }}>
                  <span className="cat-pill-dot" style={{ backgroundColor: c.color }} />
                  <span className="cat-pill-name" style={{ color: 'var(--muted)' }}>{c[activeLang] || c.th}</span>
                  <span className="cat-pill-val" style={{ color: 'var(--dark)' }}>{formatMoney(c.total)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ─── ACTION BUTTONS ─── */}
      <div className="budget-actions-row">
        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn btn-primary"
          style={BUTTON_STYLE}
          aria-expanded={showAddForm}
          aria-controls="budget-add-expense"
        >
          {showAddForm ? t('close') : t('addExpenseBtn')}
        </button>
      </div>

      {/* ─── ADD EXPENSE FORM ─── */}
      {showAddForm && (
        <form id="budget-add-expense" onSubmit={handleAddExpense} className="budget-add-form animate-fade-in" style={{ background: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px', padding: '16px', gap: '16px' }}>
          <label style={FIELD_STYLE}>{t('expenseTitlePh')}
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('expenseTitlePh')}
              className="budget-form-input flex-1"
              style={CONTROL_STYLE}
              required
            />
          </label>

          <div style={GRID_STYLE}>
            <label style={FIELD_STYLE}>{t('expenseAmountPh')}
              <input
                type="number"
                min="0.01"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={t('expenseAmountPh')}
                className="budget-form-input"
                style={CONTROL_STYLE}
                required
              />
            </label>
            <label style={FIELD_STYLE}>{t('baseCurrency')}
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="budget-form-select"
                style={CONTROL_STYLE}
              >
                {Object.keys(DEFAULT_RATES).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>

            <label style={FIELD_STYLE}>{t('checklistCategory')}
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="budget-form-select"
              style={CONTROL_STYLE}
            >
              {EXPENSE_CATEGORIES.map(c => (
                <option key={c.id} value={c.id}>{c.icon} {c[activeLang] || c.th}</option>
              ))}
            </select>
            </label>
          </div>

          <div style={GRID_STYLE}>
            <label style={FIELD_STYLE}>{t('expenseDay')}
            <select
              value={day}
              onChange={(e) => setDay(e.target.value)}
              className="budget-form-select"
              style={CONTROL_STYLE}
            >
              <option value="all">{t('allDaysOption')}</option>
              {Array.from({ length: nDays }, (_, i) => i + 1).map(d => (
                <option key={d} value={d}>{t('dayLabel')} {d}</option>
              ))}
            </select>
            </label>

            <label style={FIELD_STYLE}>{t('expenseLinkedPlace')}
            <select
              value={linkedPlaceId}
              onChange={(e) => setLinkedPlaceId(e.target.value)}
              className="budget-form-select"
              style={CONTROL_STYLE}
            >
              <option value="">{t('expenseLinkedPlace')} ({activeLang === 'th' ? 'ไม่ระบุ' : 'None'})...</option>
              {placesInItin.map(p => (
                <option key={`${p.day}_${p.id}`} value={p.id}>
                  D{p.day}: {p.name}
                </option>
              ))}
            </select>
            </label>
          </div>

          {/* Bill Splitting fields */}
          <div style={GRID_STYLE}>
            <label style={FIELD_STYLE}>{t('expensePaidBy')}
            <input
              type="text"
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value)}
              placeholder={t('expensePaidBy') + ' (e.g. Me)'}
              className="budget-form-input"
              style={CONTROL_STYLE}
            />
            </label>
            <label style={FIELD_STYLE}>{t('expenseSplitWith')}
            <input
              type="text"
              value={splitMembersInput}
              onChange={(e) => setSplitMembersInput(e.target.value)}
              placeholder={t('expenseSplitWith') + ' (e.g. Me, Friend A)'}
              className="budget-form-input"
              style={CONTROL_STYLE}
            />
            </label>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" style={BUTTON_STYLE}>
              {t('save')}
            </button>
          </div>
        </form>
      )}

      {/* ─── GROUP SPLIT BILL SECTION ─── */}
      {settlements.length > 0 && (
        <section className="budget-settlements" aria-labelledby="budget-split-title" style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
          <div className="split-header">
            <h4 id="budget-split-title" style={{ fontSize: '16px', color: 'var(--dark)' }}>{t('splitBillTitle')}</h4>
            <span className="split-count-badge" style={{ fontSize: '12px', color: 'var(--teal-d)', background: 'var(--teal-l)', borderRadius: '8px' }}>{settlements.length}</span>
          </div>
          <div className="split-list">
            {settlements.map((s, idx) => (
              <div key={idx} className="split-item" style={{ flexWrap: 'wrap', gap: '8px 16px', padding: '12px 0', fontSize: '14px', background: 'none', border: 0, borderBottom: '1px solid var(--border)', borderRadius: 0, overflowWrap: 'anywhere' }}>
                <span className="split-from" style={{ color: 'var(--dark)', minWidth: 0 }}>{s.from}</span>
                <span className="split-arrow" style={{ fontSize: '12px', color: 'var(--muted)' }}>{t('whoOwesWho')}</span>
                <span className="split-to" style={{ color: 'var(--dark)', minWidth: 0 }}>{s.to}</span>
                <span className="split-amt" style={{ color: 'var(--teal-d)' }}>{formatMoney(s.amount)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─── EXPENSES LIST SECTION ─── */}
      <div className="budget-list-section" style={{ gap: '16px', minWidth: 0 }}>
        <div className="list-filters-row" style={GRID_STYLE}>
          <label style={FIELD_STYLE}>{t('expenseDay')}
          <select
            value={filterDay}
            onChange={(e) => setFilterDay(e.target.value)}
            className="filter-select"
            style={CONTROL_STYLE}
          >
            <option value="all">{t('allDaysFilter')}</option>
            {Array.from({ length: nDays }, (_, i) => i + 1).map(d => (
              <option key={d} value={d}>{t('dayLabel')} {d}</option>
            ))}
          </select>
          </label>

          <label style={FIELD_STYLE}>{t('checklistCategory')}
          <select
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
            className="filter-select"
            style={CONTROL_STYLE}
          >
            <option value="all">{t('checklistCategory')}: {activeLang === 'th' ? 'ทั้งหมด' : 'All'}</option>
            {EXPENSE_CATEGORIES.map(c => (
              <option key={c.id} value={c.id}>{c.icon} {c[activeLang] || c.th}</option>
            ))}
          </select>
          </label>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="budget-empty" style={{ fontSize: '14px', background: 'none', border: 0, borderTop: '1px solid var(--border)', borderRadius: 0 }}>
            <p>{t('noExpenses')}</p>
          </div>
        ) : (
          <div className="budget-items-list" style={{ gap: 0 }}>
            {filteredExpenses.map(item => {
              const catObj = EXPENSE_CATEGORIES.find(c => c.id === item.category) || EXPENSE_CATEGORIES[5];
              const converted = convertToBase(item.amount, item.currency);
              const isForeign = item.currency !== baseCurrency;

              return (
                <div key={item.id} className="budget-expense-row" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px 16px', padding: '16px 0', borderBottom: '1px solid var(--border)', minWidth: 0 }}>
                  <div className="budget-item-left" style={{ flex: '1 1 200px', gap: '12px' }}>
                    <span className="budget-item-icon" style={{ backgroundColor: `${catObj.color}22`, color: catObj.color }}>
                      {catObj.icon}
                    </span>
                    <div className="budget-item-info">
                      <div className="budget-item-title-row" style={{ flexWrap: 'wrap', gap: '8px' }}>
                        <strong className="item-title" style={{ fontSize: '14px', color: 'var(--dark)', whiteSpace: 'normal', maxWidth: 'none', overflowWrap: 'anywhere' }}>{item.title}</strong>
                        {item.day && <span className="item-day-tag" style={{ fontSize: '12px', background: 'var(--teal-l)', color: 'var(--teal-d)' }}>{t('dayLabel')} {item.day}</span>}
                      </div>
                      <div className="budget-item-meta" style={{ fontSize: '12px', flexWrap: 'wrap', marginTop: '4px', overflowWrap: 'anywhere' }}>
                        <span className="item-paid">{t('paidByYou')} {item.paidBy || 'Me'}</span>
                        {item.splitWith && item.splitWith.length > 1 && (
                          <span className="item-split">👥 {item.splitWith.length} {activeLang === 'th' ? 'คน' : 'people'}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="budget-item-right" style={{ flexWrap: 'wrap', gap: '12px', marginLeft: 'auto', minWidth: 0, maxWidth: '100%' }}>
                    <div className="budget-item-amount-box" style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
                      <span className="main-amt" style={{ fontSize: '14px', color: 'var(--dark)' }}>
                        {isForeign ? formatMoney(converted) : formatMoney(item.amount, item.currency)}
                      </span>
                      {isForeign && (
                        <span className="sub-amt" style={{ fontSize: '12px' }}>
                          {formatMoney(item.amount, item.currency)}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteExpense(item.id)}
                      className="btn btn-ghost"
                      style={BUTTON_STYLE}
                      title={activeLang === 'th' ? 'ลบรายการ' : 'Delete'}
                      aria-label={`${activeLang === 'th' ? 'ลบรายการ' : 'Delete'} ${item.title}`}
                    >
                      {activeLang === 'th' ? 'ลบรายการ' : 'Delete'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── EXCHANGE RATES MODAL ─── */}
      {showRatesModal && (
        <div className="rates-modal-overlay" onClick={() => setShowRatesModal(false)}>
          <div className="rates-modal-box" role="dialog" aria-labelledby="budget-rates-title" style={{ background: 'var(--card)', color: 'var(--dark)', border: '1px solid var(--border)', borderRadius: '8px', padding: '24px', maxWidth: '480px', maxHeight: 'calc(100dvh - 32px)', overflowY: 'auto', fontSize: '14px' }} onClick={(e) => e.stopPropagation()}>
            <div className="rates-modal-header" style={{ gap: '16px', flexWrap: 'wrap' }}>
              <h4 id="budget-rates-title" style={{ fontSize: '18px', color: 'var(--dark)' }}>{t('manageRates')}</h4>
              <button type="button" onClick={() => setShowRatesModal(false)} className="btn btn-ghost" style={BUTTON_STYLE}>{t('close')}</button>
            </div>
            <p className="rates-modal-desc" style={{ fontSize: '12px' }}>
              {rateCopy.units}
            </p>
            <div className="rates-grid">
              {Object.keys(DEFAULT_RATES).map(curr => {
                if (curr === 'THB') return null;
                return (
                  <div key={curr} className="rate-row" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '8px', marginBottom: '8px' }}>
                    <label className="rate-label" style={{ fontSize: '12px', color: 'var(--dark)' }} htmlFor={`budget-rate-${curr}`}>1 {curr} ({CURRENCY_SYMBOLS[curr]}) =</label>
                    <input
                      id={`budget-rate-${curr}`}
                      type="number"
                      step="any"
                      min="0.0001"
                      value={editRates[curr] !== undefined ? editRates[curr] : DEFAULT_RATES[curr]}
                      onChange={(e) => {
                        setEditRates(prev => ({ ...prev, [curr]: e.target.value }));
                        setEditedCurrencies(previous => previous.includes(curr) ? previous : [...previous, curr]);
                      }}
                      className="rate-input"
                      style={CONTROL_STYLE}
                    />
                    <span className="rate-base" style={{ fontSize: '12px' }}>THB {editedCurrencies.includes(curr) || manualRateCurrencies.includes(curr) ? rateCopy.manual : rateState.rates[curr] ? rateCopy.live : rateCopy.fallback}</span>
                  </div>
                );
              })}
            </div>
            <div className="rates-modal-actions" style={{ flexWrap: 'wrap', gap: '8px' }}>
              <button
                type="button"
                onClick={handleUseDefaultRates}
                className="btn btn-ghost"
                style={BUTTON_STYLE}
              >
                {rateCopy.reset}
              </button>
              <button
                type="button"
                onClick={handleSaveRates}
                className="btn btn-primary"
                style={BUTTON_STYLE}
              >
                {t('saveRates')}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
