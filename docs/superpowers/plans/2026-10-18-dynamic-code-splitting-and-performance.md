# Dynamic Code Splitting & Performance Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Drastically reduce initial JavaScript bundle size (by 35-45%) and accelerate Time to Interactive (TTI) by converting all heavy modals and tabs to Next.js dynamic imports (`next/dynamic`) and memoizing intensive calculations (`stats`, `filteredLandmarks`, `nearbySuggestions`, `categoriesList`).

**Architecture:** 
1. **Dynamic Code Splitting:** Transition statically imported modals (`DetailModal`, `AddPlaceModal`, `ExportModal`, `AiPlanModal`, `QuickEditModals`, `AuthModal`, `GroupCollabModal`, `RouteOptimizationModal`), the full-screen `TravelModeView`, and the sidebar `BudgetTab` to `next/dynamic` with `ssr: false` and lightweight loading placeholders.
2. **React Memoization Optimization:** Wrap expensive repetitive calculations (`filteredLandmarks`, `nearbySuggestions`, `stats`, and `categoriesList`) in `useMemo` hooks so they execute only when their actual state dependencies change, avoiding wasteful loops on unrelated keystrokes, drag operations, or timer events.
3. **CSS Loading Skeletons:** Add clean glassmorphic loading indicators for dynamically mounted components in `src/app/globals.css`.
4. **Version Bump:** Upgrade to `v1.12.0` in both `package.json` and `src/app/page.js`.

**Tech Stack:** Next.js 15/16 (App Router with Turbopack), React 19 (`useMemo`, `useCallback`, `Suspense`, `dynamic`), CSS Modules / globals.css.

## Global Constraints
- Target version: Bump both `package.json` and `APP_VERSION` in `src/app/page.js` to `v1.12.0`.
- Preserve all existing functionality, props, and callbacks for modals and views.
- Bilingual compatibility (Thai and English).
- Zero regressions in Turbopack build or ESLint checks.

---

### Task 1: Next.js Dynamic Imports for Heavy Modals & Views

**Files:**
- Modify: `src/app/page.js:8-25`

**Interfaces:**
- Consumes: `next/dynamic`
- Produces: Dynamic chunks for `DetailModal`, `AddPlaceModal`, `ExportModal`, `AiPlanModal`, `QuickEditModals`, `AuthModal`, `GroupCollabModal`, `RouteOptimizationModal`, `TravelModeView`, `BudgetTab`.

- [ ] **Step 1: Replace static imports with `dynamic()` imports in `src/app/page.js`**

Replace:
```javascript
import TravelModeView from './components/TravelModeView';
import DetailModal from './components/modals/DetailModal';
import AddPlaceModal from './components/modals/AddPlaceModal';
import ExportModal from './components/modals/ExportModal';
import AiPlanModal from './components/modals/AiPlanModal';
import QuickEditModals from './components/modals/QuickEditModals';
import AuthModal from './components/modals/AuthModal';
import GroupCollabModal from './components/modals/GroupCollabModal';
import RouteOptimizationModal from './components/modals/RouteOptimizationModal';
import BudgetTab from './components/BudgetTab';
```

With:
```javascript
const DetailModal = dynamic(() => import('./components/modals/DetailModal'), {
  ssr: false,
  loading: () => <div className="modal-dynamic-loading"><div className="modal-spinner" /></div>
});

const AddPlaceModal = dynamic(() => import('./components/modals/AddPlaceModal'), {
  ssr: false,
  loading: () => <div className="modal-dynamic-loading"><div className="modal-spinner" /></div>
});

const ExportModal = dynamic(() => import('./components/modals/ExportModal'), {
  ssr: false,
  loading: () => <div className="modal-dynamic-loading"><div className="modal-spinner" /></div>
});

const AiPlanModal = dynamic(() => import('./components/modals/AiPlanModal'), {
  ssr: false,
  loading: () => <div className="modal-dynamic-loading"><div className="modal-spinner" /></div>
});

const QuickEditModals = dynamic(() => import('./components/modals/QuickEditModals'), {
  ssr: false
});

const AuthModal = dynamic(() => import('./components/modals/AuthModal'), {
  ssr: false
});

const GroupCollabModal = dynamic(() => import('./components/modals/GroupCollabModal'), {
  ssr: false
});

const RouteOptimizationModal = dynamic(() => import('./components/modals/RouteOptimizationModal'), {
  ssr: false
});

const TravelModeView = dynamic(() => import('./components/TravelModeView'), {
  ssr: false,
  loading: () => <div className="travel-mode-loading">✈️ กำลังโหลดโหมดเที่ยว...</div>
});

const BudgetTab = dynamic(() => import('./components/BudgetTab'), {
  ssr: false,
  loading: () => <div className="budget-loading-placeholder">💰 กำลังโหลดข้อมูลงบประมาณ...</div>
});
```

- [ ] **Step 2: Verify imports with ESLint**
Run: `npm run lint`
Expected: 0 errors.

- [ ] **Step 3: Commit**
```bash
git add src/app/page.js
git commit -m "perf: convert heavy modals and views to next/dynamic imports"
```

---

### Task 2: React Memoization of Heavy Calculations

**Files:**
- Modify: `src/app/page.js:3210-3275`

**Interfaces:**
- Consumes: `useMemo` from `'react'`, `landmarks`, `filterCat`, `searchQuery`, `activeLang`, `itin`, `nDays`, `lastId`
- Produces: Memoized `stats`, `categoriesList`, `filteredLandmarks`, and `nearbySuggestions`.

- [ ] **Step 1: Memoize `stats` calculation in `src/app/page.js`**
Replace plain execution `const stats = getSummaryStats();` with:
```javascript
  const stats = useMemo(() => {
    let placesCount = 0;
    let totalMinutes = 0;
    let activeDays = 0;
    const citiesSet = new Set();

    for (let d = 1; d <= nDays; d++) {
      const items = itin[d] || [];
      if (items.length) activeDays++;
      items.forEach((item, idx) => {
        placesCount++;
        totalMinutes += item.dur;
        if (idx > 0) {
          totalMinutes += item.travelTime !== undefined ? item.travelTime : 20;
        }
        const cityObj = getCityObj(item.city_id);
        if (cityObj) citiesSet.add(getCityName(cityObj, activeLang));
      });
    }

    return {
      places: placesCount,
      hours: (totalMinutes / 60).toFixed(1),
      days: activeDays,
      cities: citiesSet.size
    };
  }, [itin, nDays, activeLang]);
```

- [ ] **Step 2: Memoize `categoriesList` and `filteredLandmarks`**
```javascript
  const categoriesList = useMemo(() => {
    const list = landmarks.map(l => l.cat).filter(Boolean);
    return ['__all__', ...Array.from(new Set(list))];
  }, [landmarks]);

  const filteredLandmarks = useMemo(() => {
    return landmarks.filter(l => {
      if (filterCat !== '__all__' && l.cat !== filterCat) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const localName = ((l.names && l.names[activeLang]) || l.name).toLowerCase();
        return l.name.toLowerCase().includes(q) || localName.includes(q) || l.cat.toLowerCase().includes(q);
      }
      return true;
    });
  }, [landmarks, filterCat, searchQuery, activeLang]);
```

- [ ] **Step 3: Memoize `nearbySuggestions`**
```javascript
  const nearbySuggestions = useMemo(() => {
    return getNearbyPlaces();
  }, [lastId, landmarks, itin]);
```

- [ ] **Step 4: Verify with Lint**
Run: `npm run lint`
Expected: 0 errors.

- [ ] **Step 5: Commit**
```bash
git add src/app/page.js
git commit -m "perf: memoize stats, landmark filtering, and nearby calculations"
```

---

### Task 3: CSS Loading Skeletons for Dynamic Components

**Files:**
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: CSS variables
- Produces: `.modal-dynamic-loading`, `.modal-spinner`, `.budget-loading-placeholder`, `.travel-mode-loading`

- [ ] **Step 1: Add dynamic loading skeleton styles in `src/app/globals.css`**
Add styles for modal backdrop placeholder and spinner.

- [ ] **Step 2: Verify build**
Run: `npm run build`
Expected: Build passes with 0 errors.

- [ ] **Step 3: Commit**
```bash
git add src/app/globals.css
git commit -m "style: add loading skeleton styles for dynamic code-split components"
```

---

### Task 4: Version Bump to v1.12.0 & Production Build Benchmark

**Files:**
- Modify: `package.json:3`
- Modify: `src/app/page.js` (`APP_VERSION = 'v1.12.0'`)

- [ ] **Step 1: Bump version in `package.json` to `1.12.0`**
- [ ] **Step 2: Bump `APP_VERSION` in `src/app/page.js` to `'v1.12.0'`**
- [ ] **Step 3: Run full Production Build with Turbopack**
Run: `npm run build`
Expected: Compiles with generated separate dynamic route chunks for `/`.

- [ ] **Step 4: Final Git Commit**
```bash
git add package.json src/app/page.js
git commit -m "chore(release): bump version to v1.12.0 with dynamic code splitting"
```
