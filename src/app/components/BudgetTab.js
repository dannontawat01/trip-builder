'use client';

import React, { useState, useMemo, useCallback } from 'react';

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
  const totalBudget = Number(budget.totalBudget) || 0;
  const baseCurrency = budget.baseCurrency || 'THB';
  const exchangeRates = { ...DEFAULT_RATES, ...(budget.exchangeRates || {}) };
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
  }, [expenses, totalSpent, convertToBase, activeLang]);

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
    const newTotal = Math.max(0, Number(val) || 0);
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
    if (!parsedAmt || parsedAmt <= 0) {
      toast(activeLang === 'th' ? '⚠️ กรุณาระบุจำนวนเงินที่ถูกต้อง' : '⚠️ Please enter a valid amount');
      return;
    }

    const splitList = splitMembersInput.trim()
      ? splitMembersInput.split(',').map(s => s.trim()).filter(Boolean)
      : [paidBy.trim() || 'Me'];

    const newExpense = {
      id: `exp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
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
    onUpdateBudget({ ...budget, exchangeRates: editRates });
    setShowRatesModal(false);
    toast(activeLang === 'th' ? '✅ บันทึกอัตราแลกเปลี่ยนแล้ว' : '✅ Exchange rates updated');
  };

  return (
    <div className="budget-tab-wrapper">
      {/* ─── BUDGET HEADER & SUMMARY CARD ─── */}
      <div className="budget-summary-card">
        <div className="budget-summary-header">
          <div className="budget-title-area">
            <span className="budget-icon-badge">💰</span>
            <div>
              <h3 className="budget-title">{t('budgetTitle')}</h3>
              <p className="budget-subtitle">
                {t('baseCurrency')}: <strong>{baseCurrency} ({CURRENCY_SYMBOLS[baseCurrency] || ''})</strong>
              </p>
            </div>
          </div>
          <div className="budget-header-actions">
            <select
              value={baseCurrency}
              onChange={(e) => handleUpdateBaseCurrency(e.target.value)}
              className="budget-curr-select"
              title="Select Base Currency"
            >
              {Object.keys(DEFAULT_RATES).map(c => (
                <option key={c} value={c}>{c} ({CURRENCY_SYMBOLS[c]})</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => { setEditRates(exchangeRates); setShowRatesModal(true); }}
              className="budget-rates-btn"
              title={t('manageRates')}
            >
              ⚙️
            </button>
          </div>
        </div>

        {/* Budget Numbers Grid */}
        <div className="budget-stats-grid">
          <div className="budget-stat-box">
            <span className="stat-label">{t('totalBudget')}</span>
            <div className="budget-input-group">
              <span className="input-sym">{CURRENCY_SYMBOLS[baseCurrency]}</span>
              <input
                type="number"
                min="0"
                step="100"
                value={totalBudget || ''}
                onChange={(e) => handleUpdateTotalBudget(e.target.value)}
                placeholder="0"
                className="budget-stat-input"
              />
            </div>
          </div>

          <div className="budget-stat-box">
            <span className="stat-label">{t('spent')}</span>
            <span className="stat-val spent-val">{formatMoney(totalSpent)}</span>
          </div>

          <div className={`budget-stat-box ${isOverBudget ? 'stat-over' : 'stat-good'}`}>
            <span className="stat-label">{isOverBudget ? t('overBudget') : t('remaining')}</span>
            <span className="stat-val">{formatMoney(Math.abs(remaining))}</span>
          </div>
        </div>

        {/* Progress Bar */}
        {totalBudget > 0 && (
          <div className="budget-bar-container">
            <div className="budget-bar-bg">
              <div
                className={`budget-bar-fill ${isOverBudget ? 'bar-over' : ''}`}
                style={{ width: `${Math.min(100, spentPercent)}%` }}
              />
            </div>
            <div className="budget-bar-info">
              <span>{spentPercent}% {t('spent')}</span>
              <span>{isOverBudget ? `⚠️ -${formatMoney(Math.abs(remaining))}` : `${t('remaining')} ${formatMoney(remaining)}`}</span>
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
                <div key={c.id} className="cat-pill">
                  <span className="cat-pill-dot" style={{ backgroundColor: c.color }} />
                  <span className="cat-pill-name">{c.icon} {c[activeLang] || c.th}</span>
                  <span className="cat-pill-val">{formatMoney(c.total)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ─── ACTION BUTTONS ─── */}
      <div className="budget-actions-row">
        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className={`budget-primary-btn ${showAddForm ? 'active' : ''}`}
        >
          {showAddForm ? '✕ ' + t('close') : t('addExpenseBtn')}
        </button>
      </div>

      {/* ─── ADD EXPENSE FORM ─── */}
      {showAddForm && (
        <form onSubmit={handleAddExpense} className="budget-add-form animate-fade-in">
          <div className="form-row">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('expenseTitlePh')}
              className="budget-form-input flex-1"
              required
            />
          </div>

          <div className="form-row form-grid-2">
            <div className="input-with-select">
              <input
                type="number"
                min="0.01"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={t('expenseAmountPh')}
                className="budget-form-input"
                required
              />
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="budget-form-select inline-select"
              >
                {Object.keys(DEFAULT_RATES).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="budget-form-select"
            >
              {EXPENSE_CATEGORIES.map(c => (
                <option key={c.id} value={c.id}>{c.icon} {c[activeLang] || c.th}</option>
              ))}
            </select>
          </div>

          <div className="form-row form-grid-2">
            <select
              value={day}
              onChange={(e) => setDay(e.target.value)}
              className="budget-form-select"
            >
              <option value="all">🗓️ {t('allDaysOption')}</option>
              {Array.from({ length: nDays }, (_, i) => i + 1).map(d => (
                <option key={d} value={d}>{t('dayLabel')} {d}</option>
              ))}
            </select>

            <select
              value={linkedPlaceId}
              onChange={(e) => setLinkedPlaceId(e.target.value)}
              className="budget-form-select"
            >
              <option value="">📍 {t('expenseLinkedPlace')} ({activeLang === 'th' ? 'ไม่ระบุ' : 'None'})...</option>
              {placesInItin.map(p => (
                <option key={`${p.day}_${p.id}`} value={p.id}>
                  D{p.day}: {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Bill Splitting fields */}
          <div className="form-row form-grid-2">
            <input
              type="text"
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value)}
              placeholder={t('expensePaidBy') + ' (e.g. Me)'}
              className="budget-form-input"
            />
            <input
              type="text"
              value={splitMembersInput}
              onChange={(e) => setSplitMembersInput(e.target.value)}
              placeholder={t('expenseSplitWith') + ' (e.g. Me, Friend A)'}
              className="budget-form-input"
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="budget-submit-btn">
              ✓ {t('save')}
            </button>
          </div>
        </form>
      )}

      {/* ─── GROUP SPLIT BILL SECTION ─── */}
      {settlements.length > 0 && (
        <div className="budget-split-card">
          <div className="split-header">
            <h4>{t('splitBillTitle')}</h4>
            <span className="split-count-badge">{settlements.length}</span>
          </div>
          <div className="split-list">
            {settlements.map((s, idx) => (
              <div key={idx} className="split-item">
                <span className="split-from">👤 {s.from}</span>
                <span className="split-arrow">➔ {t('whoOwesWho')}</span>
                <span className="split-to">👤 {s.to}</span>
                <span className="split-amt">{formatMoney(s.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── EXPENSES LIST SECTION ─── */}
      <div className="budget-list-section">
        <div className="list-filters-row">
          <select
            value={filterDay}
            onChange={(e) => setFilterDay(e.target.value)}
            className="filter-select"
          >
            <option value="all">🗓️ {t('allDaysFilter')}</option>
            {Array.from({ length: nDays }, (_, i) => i + 1).map(d => (
              <option key={d} value={d}>{t('dayLabel')} {d}</option>
            ))}
          </select>

          <select
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
            className="filter-select"
          >
            <option value="all">🏷️ {t('checklistCategory')}: {activeLang === 'th' ? 'ทั้งหมด' : 'All'}</option>
            {EXPENSE_CATEGORIES.map(c => (
              <option key={c.id} value={c.id}>{c.icon} {c[activeLang] || c.th}</option>
            ))}
          </select>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="budget-empty">
            <p>{t('noExpenses')}</p>
          </div>
        ) : (
          <div className="budget-items-list">
            {filteredExpenses.map(item => {
              const catObj = EXPENSE_CATEGORIES.find(c => c.id === item.category) || EXPENSE_CATEGORIES[5];
              const converted = convertToBase(item.amount, item.currency);
              const isForeign = item.currency !== baseCurrency;

              return (
                <div key={item.id} className="budget-item-card">
                  <div className="budget-item-left">
                    <span className="budget-item-icon" style={{ backgroundColor: `${catObj.color}22`, color: catObj.color }}>
                      {catObj.icon}
                    </span>
                    <div className="budget-item-info">
                      <div className="budget-item-title-row">
                        <strong className="item-title">{item.title}</strong>
                        {item.day && <span className="item-day-tag">D{item.day}</span>}
                      </div>
                      <div className="budget-item-meta">
                        <span className="item-paid">{t('paidByYou')} {item.paidBy || 'Me'}</span>
                        {item.splitWith && item.splitWith.length > 1 && (
                          <span className="item-split">👥 {item.splitWith.length} {activeLang === 'th' ? 'คน' : 'people'}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="budget-item-right">
                    <div className="budget-item-amount-box">
                      <span className="main-amt">
                        {isForeign ? formatMoney(converted) : formatMoney(item.amount, item.currency)}
                      </span>
                      {isForeign && (
                        <span className="sub-amt">
                          {formatMoney(item.amount, item.currency)}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteExpense(item.id)}
                      className="budget-delete-btn"
                      title={activeLang === 'th' ? 'ลบรายการ' : 'Delete'}
                    >
                      ✕
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
          <div className="rates-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="rates-modal-header">
              <h4>{t('manageRates')}</h4>
              <button type="button" onClick={() => setShowRatesModal(false)} className="close-btn">✕</button>
            </div>
            <p className="rates-modal-desc">
              {t('ratesTitle')} (Base: <strong>{baseCurrency}</strong>)
            </p>
            <div className="rates-grid">
              {Object.keys(DEFAULT_RATES).map(curr => {
                if (curr === baseCurrency) return null;
                return (
                  <div key={curr} className="rate-row">
                    <span className="rate-label">1 {curr} ({CURRENCY_SYMBOLS[curr]}) =</span>
                    <input
                      type="number"
                      step="any"
                      min="0.0001"
                      value={editRates[curr] !== undefined ? editRates[curr] : DEFAULT_RATES[curr]}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setEditRates(prev => ({ ...prev, [curr]: isNaN(val) ? 0 : val }));
                      }}
                      className="rate-input"
                    />
                    <span className="rate-base">{baseCurrency}</span>
                  </div>
                );
              })}
            </div>
            <div className="rates-modal-actions">
              <button
                type="button"
                onClick={() => setEditRates(DEFAULT_RATES)}
                className="rates-reset-btn"
              >
                Reset Default
              </button>
              <button
                type="button"
                onClick={handleSaveRates}
                className="rates-save-btn"
              >
                {t('saveRates')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
