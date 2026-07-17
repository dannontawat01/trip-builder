# Glassmorphic Redesign & UI Bugs Rectification Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Trip Builder interface to feature immersive ambient backdrops and glassmorphic panels, improve card spacing and dimensions to reduce visual crowding, and rectify multiple UI bugs including translation gaps, disappearing hover text, and the checklist category selection text cutoff.

---

### Task 1: CSS Premium Design & Spacing Overrides

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Increase card spacing and reduce cover height in globals.css**

In [globals.css](file:///d:/AI/trip-builder/src/app/globals.css), locate `.lm-list` (around line 336) and increase the `gap` to `12px`:
```css
.lm-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 12px; /* Increased from 5px for breathing room */
  user-select: none;
}
```
Locate `.lm-cover-strip` (around line 431) and reduce the `height` to `85px`:
```css
.lm-cover-strip {
  height: 85px; /* Reduced from 110px to reduce visual bulk */
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--r) var(--r) 0 0;
  overflow: hidden;
  position: relative;
}
```

- [ ] **Step 2: Add dynamic ambient background styling in globals.css**

Add the `.ambient-background` class rules at the top of [globals.css](file:///d:/AI/trip-builder/src/app/globals.css):
```css
.ambient-background {
  position: fixed;
  inset: 0;
  z-index: -1;
  background-size: cover;
  background-position: center;
  filter: blur(60px) brightness(0.95);
  opacity: 0.15;
  transition: background-image 1.2s ease-in-out;
  pointer-events: none;
}
body.theme-dark .ambient-background {
  filter: blur(60px) brightness(0.35);
  opacity: 0.18;
}
```

- [ ] **Step 3: Update trip-bar, summary-bar, and modals to use glass-panel styling**

Update `.trip-bar`, `.summary-bar`, and `.modal` classes in [globals.css](file:///d:/AI/trip-builder/src/app/globals.css) to inherit glass-panel details:
```css
.trip-bar, .summary-bar {
  background: var(--card-glass) !important;
  backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
  border: 1px solid var(--border-glass) !important;
  box-shadow: var(--shadow-premium), var(--shadow-glass-inset) !important;
  border-radius: var(--r-lg);
}
.modal {
  background: var(--card-glass) !important;
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid var(--border-glass) !important;
  box-shadow: var(--shadow-premium), var(--shadow-glass-inset) !important;
}
.overlay {
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}
```
Update `.cfg input`, `.cfg select` inside the HUD:
```css
.cfg input, .cfg select {
  font-family: 'DM Sans', sans-serif;
  font-size: 12px;
  border: 1px solid var(--border-glass);
  border-radius: 7px;
  padding: 5px 8px;
  background: rgba(255, 255, 255, 0.4);
  color: var(--dark);
  outline: none;
  transition: all .15s;
}
body.theme-dark .cfg input, body.theme-dark .cfg select {
  background: rgba(0, 0, 0, 0.2);
}
```

- [ ] **Step 4: Fix category button hover style and checklist cutoff**

Update `.cat-btn:hover` in [globals.css](file:///d:/AI/trip-builder/src/app/globals.css):
```css
.cat-btn:hover {
  color: #fff;
  background: var(--teal) !important;
  border-color: transparent;
}
```
Update `.checklist-cat-select` in [globals.css](file:///d:/AI/trip-builder/src/app/globals.css):
```css
.checklist-cat-select {
  padding: 8px;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 12px;
  background: var(--card);
  color: var(--dark);
  cursor: pointer;
  min-width: 120px; /* Prevent text squishing */
  flex-shrink: 0;
}
```
Remove the duplicate checklist CSS block (lines 2469 to 2650 or similar) from the end of the file to clean up duplicate declarations.

- [ ] **Step 5: Run npm run build and commit**

Run: `npm run build`
If successful, commit:
```bash
git add src/app/globals.css
git commit -m "style: implement glassmorphic HUD, ambient backdrop variables, and spacing overrides"
```

---

### Task 2: React Component Overrides & Translation Bugs

**Files:**
- Modify: `src/app/page.js`

- [ ] **Step 1: Add dynamic ambient background layer in page.js**

In [page.js](file:///d:/AI/trip-builder/src/app/page.js), locate the start of the `return` block inside the main `Home` component:
```javascript
  return (
    <div className={`app-wrapper ${theme === 'dark' ? 'theme-dark' : 'theme-light'}`}>
```
Insert the ambient background element just inside the outer container:
```javascript
      <div 
        className="ambient-background" 
        style={{ backgroundImage: activeCity ? `url(${CITY_COVER_IMAGES[activeCity] || CITY_COVER_IMAGES.travel})` : 'none' }} 
      />
```

- [ ] **Step 2: Translate AI Planner Modal interest chips**

In [page.js](file:///d:/AI/trip-builder/src/app/page.js), find the interest button mapping around line 3934:
```javascript
                  {['🍜 อาหาร', '🛍 ช้อปปิ้ง', '🛕 วัด/ประวัติศาสตร์', '🌿 ธรรมชาติ', '🎨 ศิลปะ/วัฒนธรรม', '📸 ถ่ายรูป', '☕ คาเฟ่', '🏖 ชายหาด'].map(interest => {
```
Change it to map keys and translate dynamically using the `t()` helper:
```javascript
                  {['iFood', 'iShop', 'iTemple', 'iNature', 'iArt', 'iPhoto', 'iCafe', 'iBeach'].map(interestKey => {
                    const interestLabel = t(interestKey);
                    const isActive = selectedInterests.includes(interestLabel);
                    return (
                      <button
                        key={interestKey}
                        className={`interest-chip ${isActive ? 'active' : ''}`}
                        onClick={() => {
                          if (isActive) {
                            setSelectedInterests(selectedInterests.filter(i => i !== interestLabel));
                          } else {
                            setSelectedInterests([...selectedInterests, interestLabel]);
                          }
                        }}
                      >
                        {interestLabel}
                      </button>
                    );
                  })}
```

- [ ] **Step 3: Translate Export Share & Copy Buttons**

In [page.js](file:///d:/AI/trip-builder/src/app/page.js), translate the hardcoded "คัดลอก" button and toast notifications:
- Around line 3883, change:
  `className="btn btn-primary btn-sm" onClick={() => { navigator.clipboard.writeText(buildShareLink()); toast('คัดลอกลิงก์แชร์แล้ว!'); }}>คัดลอก</button>`
  to:
  `className="btn btn-primary btn-sm" onClick={() => { navigator.clipboard.writeText(buildShareLink()); toast(activeLang === 'th' ? 'คัดลอกลิงก์แชร์แล้ว!' : 'Share link copied!'); }}>{activeLang === 'th' ? 'คัดลอก' : 'Copy'}</button>`
- Around line 3896, change:
  `toast('คัดลอกข้อความแล้ว!')`
  to:
  `toast(activeLang === 'th' ? 'คัดลอกข้อความแล้ว!' : 'Itinerary text copied!')`

- [ ] **Step 4: Run npm run build and commit**

Run: `npm run build`
If successful, commit:
```bash
git add src/app/page.js
git commit -m "feat: translate AI interests and export buttons, and add dynamic ambient backdrop"
```
