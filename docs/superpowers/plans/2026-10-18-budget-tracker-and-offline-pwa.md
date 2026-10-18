# Budget Tracker & Offline PWA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a comprehensive Multi-Currency Budget & Expense Tracker (with Split Bill) and full Offline-First PWA support (Service Worker, Tile Cache, and Offline Banner) in Trip Builder.

**Architecture:** 
1. **Budget Tracker:** Encapsulated in `src/app/components/BudgetTab.js` mounted inside the right sidebar alongside `nearby` and `checklist`. Data model (`budget`) is bound to the active plan, synced in real-time to LocalStorage, Supabase Room collaboration, and share link export.
2. **Offline-First PWA:** Implemented via `public/manifest.json`, high-resolution icons in `public/icons/`, custom Service Worker `public/sw.js` with Cache-First asset strategy + OSM map tile caching, and real-time offline detection banner in `src/app/page.js`.
3. **Version Bump:** Upgraded from `v1.10.0` to `v1.11.0` in both `package.json` and `src/app/page.js`.

**Tech Stack:** Next.js 15 (App Router), React 19, Vanilla CSS Glassmorphic Design, Service Worker API, CacheStorage API, Web App Manifest.

## Global Constraints
- Version management rule: Bump both `package.json` and `APP_VERSION` in `src/app/page.js` to `v1.11.0`.
- Preserve existing comments and docstrings.
- Fully bilingual (Thai `th` and English `en`) via `src/app/constants/translations.js`.
- Responsive design for Desktop, Tablet, and Mobile devices.
- No third-party heavy dependencies; use native Web APIs (Service Worker, CacheStorage, localStorage).

---

### Task 1: Bilingual Translations for Budget & PWA

**Files:**
- Modify: `src/app/constants/translations.js:40-75`

**Interfaces:**
- Consumes: `LANG_STRINGS.th`, `LANG_STRINGS.en`
- Produces: Keys for `tabBudget`, `budgetHeader`, `totalBudget`, `spent`, `remaining`, `addExpense`, `splitBill`, `offlineAlert`, `currencies`, etc.

- [ ] **Step 1: Add Budget and PWA translations to `LANG_STRINGS.th` and `LANG_STRINGS.en`**

Add the following keys to `LANG_STRINGS.th`:
```javascript
tabBudget: 'งบประมาณ',
budgetTitle: 'งบประมาณ & บันทึกค่าใช้จ่าย',
totalBudget: 'งบประมาณรวม',
spent: 'ใช้ไปแล้ว',
remaining: 'คงเหลือ',
overBudget: 'เกินงบ',
baseCurrency: 'สกุลเงินหลัก',
addExpenseBtn: '+ บันทึกค่าใช้จ่าย',
expenseTitlePh: 'ชื่อรายการ เช่น ค่าตั๋ว, ค่าอาหาร',
expenseAmountPh: 'จำนวนเงิน',
expenseCat: 'หมวดหมู่',
expensePaidBy: 'ผู้ชำระ',
expenseSplitWith: 'ผู้ร่วมแชร์',
expenseDay: 'วันที่',
expenseLinkedPlace: 'ผูกกับสถานที่',
splitBillTitle: 'สรุปการหารค่าใช้จ่ายกลุ่ม (Split Bill)',
splitEqual: 'หารเท่ากัน',
splitSummary: 'ยอดชำระสุทธิ',
noExpenses: 'ยังไม่มีรายการค่าใช้จ่าย เริ่มต้นบันทึกค่าใช้จ่ายรายการแรกของคุณ!',
catAccommodation: '🏨 ที่พัก',
catFood: '🍜 อาหาร & เครื่องดื่ม',
catTransport: '🚆 การเดินทาง',
catTicket: '🎟️ ค่าเข้าชม / กิจกรรม',
catShopping: '🛍️ ช้อปปิ้ง',
catOthers: '📦 อื่นๆ',
offlineBannerMsg: '📶 กำลังใช้งานในโหมดออฟไลน์: บันทึกข้อมูลในเครื่องและใช้งาน Travel Mode ได้ตามปกติ',
offlinePwaReady: 'พร้อมใช้งานออฟไลน์แล้ว',
ratesTitle: 'อัตราแลกเปลี่ยน (เมื่อเทียบกับ 1 หน่วย)',
```

Add the following keys to `LANG_STRINGS.en`:
```javascript
tabBudget: 'Budget',
budgetTitle: 'Trip Budget & Expenses',
totalBudget: 'Total Budget',
spent: 'Spent',
remaining: 'Remaining',
overBudget: 'Over Budget',
baseCurrency: 'Base Currency',
addExpenseBtn: '+ Add Expense',
expenseTitlePh: 'e.g. Flight ticket, Dinner, Metro pass',
expenseAmountPh: 'Amount',
expenseCat: 'Category',
expensePaidBy: 'Paid By',
expenseSplitWith: 'Split With',
expenseDay: 'Day',
expenseLinkedPlace: 'Linked Place',
splitBillTitle: 'Group Split Bill Summary',
splitEqual: 'Split Equally',
splitSummary: 'Net Balances',
noExpenses: 'No expenses recorded yet. Add your first expense!',
catAccommodation: '🏨 Accommodation',
catFood: '🍜 Food & Dining',
catTransport: '🚆 Transportation',
catTicket: '🎟️ Tickets & Activities',
catShopping: '🛍️ Shopping',
catOthers: '📦 Others',
offlineBannerMsg: '📶 Offline Mode: Data saved locally, Travel Mode is fully available',
offlinePwaReady: 'Ready for offline usage',
ratesTitle: 'Exchange Rates (Per 1 Unit)',
```

- [ ] **Step 2: Verify translations compilation**
Run: `npm run lint`
Expected: 0 errors.

- [ ] **Step 3: Commit**
```bash
git add src/app/constants/translations.js
git commit -m "feat(i18n): add translations for budget tracker and offline pwa"
```

---

### Task 2: Budget Tracker UI Component (`BudgetTab.js`)

**Files:**
- Create: `src/app/components/BudgetTab.js`
- Modify: `src/app/globals.css` (Add budget styling)

**Interfaces:**
- Consumes:
  - `budget`: `{ totalBudget: number, baseCurrency: string, exchangeRates: object, expenses: array }`
  - `onUpdateBudget`: `(updatedBudget) => void`
  - `activeLang`: `'th' | 'en'`
  - `t`: translation function
  - `itin`: itinerary object
  - `nDays`: number of days
  - `landmarks`: array of landmarks
  - `toast`: toast alert function
- Produces: Interactive Budget Sidebar Tab with live calculation, category distribution bar, expense entry form, list, and split bill summary.

- [ ] **Step 1: Create `src/app/components/BudgetTab.js`**

Implement `src/app/components/BudgetTab.js` with:
1. Overview Card: Total Budget (editable input), Total Spent (summed in base currency using `exchangeRates`), Balance / Remaining with percentage progress bar.
2. Category Breakdown Bar: Visual progress bar segments for `hotel`, `food`, `transport`, `ticket`, `shopping`, `other`.
3. Add Expense Form:
   - Title, Amount, Currency (THB, KRW, JPY, USD, EUR, TWD), Category, Day, Paid By, Split With.
4. Expense List with filter & delete:
   - Displays icon, title, amount in original currency + converted amount in base currency.
5. Group Split Bill Calculator:
   - Calculates who paid what and outputs settlement instructions: e.g. "Member A owes Member B: ฿500".

- [ ] **Step 2: Add CSS rules for Budget in `src/app/globals.css`**
Add styles for `.budget-container`, `.budget-summary-card`, `.budget-progress-bar`, `.budget-cat-bar`, `.budget-expense-item`, `.budget-split-badge`.

- [ ] **Step 3: Run Build Verification**
Run: `npm run build`
Expected: Build successfully without errors.

- [ ] **Step 4: Commit**
```bash
git add src/app/components/BudgetTab.js src/app/globals.css
git commit -m "feat(budget): create BudgetTab component with multi-currency and split bill"
```

---

### Task 3: Integrate Budget State & Sidebar Tab in `src/app/page.js`

**Files:**
- Modify: `src/app/page.js:195-205, 3975-4015, 1670-1700, 2560-2600`

**Interfaces:**
- Consumes: `BudgetTab` component from `./components/BudgetTab`
- Produces:
  - `activeRightTab` state handling `'nearby' | 'checklist' | 'budget'`
  - `budget` state tied to active plan, saved to localStorage, Supabase room, and share link URL
  - Dynamic 3-tab switcher in the right sidebar (`💡 ที่เที่ยวแนะนำ`, `📋 สิ่งที่ต้องเตรียม`, `💰 งบประมาณ`)

- [ ] **Step 1: Import `BudgetTab` in `src/app/page.js`**
```javascript
import BudgetTab from './components/BudgetTab';
```

- [ ] **Step 2: Add `budget` state and persistence helpers**
Initialize `budget` state:
```javascript
const defaultBudget = {
  totalBudget: 30000,
  baseCurrency: 'THB',
  exchangeRates: { THB: 1, KRW: 0.027, JPY: 0.23, USD: 36.5, EUR: 39.5, TWD: 1.15 },
  expenses: []
};
const [budget, setBudget] = useState(defaultBudget);
```
Add `budget` to `saveItinData`, localStorage sync (`budget_${activePlanId}`), and plan switching.

- [ ] **Step 3: Add `budget` tab button and render `BudgetTab` in Right Sidebar**
Update `.sidebar-tabs` to include:
```jsx
<button 
  className={`sidebar-tab-btn ${activeRightTab === 'budget' ? 'active' : ''}`}
  onClick={() => setActiveRightTab('budget')}
  id="tab-budget"
>
  💰 {t('tabBudget')}
</button>
```
And inside `.nearby-body`:
```jsx
{activeRightTab === 'budget' && (
  <BudgetTab
    budget={budget}
    onUpdateBudget={(newBudget) => {
      setBudget(newBudget);
      saveItinData(itin, nDays, checklist, newBudget);
    }}
    activeLang={activeLang}
    t={t}
    itin={itin}
    nDays={nDays}
    landmarks={landmarks}
    toast={toast}
  />
)}
```

- [ ] **Step 4: Verify with Build**
Run: `npm run build`
Expected: Build passes with zero errors.

- [ ] **Step 5: Commit**
```bash
git add src/app/page.js
git commit -m "feat(page): integrate budget tab and multi-currency persistence"
```

---

### Task 4: Web App Manifest & App Icons (PWA Setup)

**Files:**
- Create: `public/manifest.json`
- Create: `public/icons/icon-192.png` (or SVG icon mapping)
- Create: `public/icons/icon-512.png`
- Modify: `src/app/layout.js:3-18`

**Interfaces:**
- Consumes: Web App Manifest standard
- Produces: Installable PWA metadata and homescreen icons.

- [ ] **Step 1: Create `public/manifest.json`**
Define app name, description, start URL, standalone display mode, theme colors, and icons.

- [ ] **Step 2: Generate PWA icons in `public/icons/`**
Provide high-resolution icons (192x192 and 512x512) with the Trip Builder compass/airplane brand motif.

- [ ] **Step 3: Update `src/app/layout.js` metadata**
Add `manifest: "/manifest.json"`, `themeColor: "#0d9488"`, and Apple touch icon meta tags.

- [ ] **Step 4: Verify Manifest in build**
Run: `npm run build`
Expected: Build passes without issues.

- [ ] **Step 5: Commit**
```bash
git add public/manifest.json public/icons/ src/app/layout.js
git commit -m "feat(pwa): add web app manifest and app icons for installable PWA"
```

---

### Task 5: Service Worker & Offline Cache Strategy

**Files:**
- Create: `public/sw.js`
- Modify: `src/app/page.js` (Register service worker & online/offline listener)
- Modify: `src/app/globals.css` (Add offline banner styles)

**Interfaces:**
- Consumes: Service Worker API, CacheStorage API, `window.navigator.onLine`
- Produces:
  - Cache-first strategy for static assets (icons, fonts, CSS)
  - Stale-while-revalidate for HTML pages
  - Cache storage for OpenStreetMap map tiles (`tile.openstreetmap.org`)
  - Real-time offline alert banner when connection drops

- [ ] **Step 1: Create `public/sw.js`**
Write service worker handling:
- `install` event: Pre-caches critical app shell assets.
- `activate` event: Cleans up old cache versions (`trip-builder-v1`).
- `fetch` event: Caches map tiles and handles offline fallback.

- [ ] **Step 2: Register Service Worker and add Offline Listener in `src/app/page.js`**
- Register `/sw.js` in a `useEffect`.
- Add `isOffline` state with `online` and `offline` event listeners.
- Render `.offline-banner` if `isOffline` is true.

- [ ] **Step 3: Add `.offline-banner` glassmorphic styling in `src/app/globals.css`**

- [ ] **Step 4: Verify with Build & Test**
Run: `npm run build`
Expected: Successful Turbopack build.

- [ ] **Step 5: Commit**
```bash
git add public/sw.js src/app/page.js src/app/globals.css
git commit -m "feat(pwa): implement service worker caching and offline status banner"
```

---

### Task 6: Version Bump to v1.11.0 & Final Verification

**Files:**
- Modify: `package.json:3`
- Modify: `src/app/page.js:23`

- [ ] **Step 1: Bump version in `package.json` to `1.11.0`**
- [ ] **Step 2: Bump version in `src/app/page.js` (`APP_VERSION = 'v1.11.0'`)**
- [ ] **Step 3: Run Linting and Full Production Build**
Run: `npm run lint`
Run: `npm run build`
Expected: 0 lint errors, build succeeds in Turbopack.

- [ ] **Step 4: Final Git Commit**
```bash
git add package.json src/app/page.js
git commit -m "chore(release): bump version to v1.11.0 with Budget Tracker and Offline PWA"
```
