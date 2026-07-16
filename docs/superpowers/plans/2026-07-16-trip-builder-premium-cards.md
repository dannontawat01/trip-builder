# Trip Builder Premium Cards Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul the landmark and itinerary card styling, introducing soft shadows, custom hover transitions, and cleaner title icons, while eliminating center image icons.

**Architecture:** Update `globals.css` with shadow specs, hovered/selected transformations, and hides centered emoji elements. Edit `page.js` to strip emojis from card headers and append them as prefix elements to the landmark names.

**Tech Stack:** React 19, Next.js 16.2 (App Router), Tailwind CSS v4

## Global Constraints
- Do not use Tailwind class utilities for ad-hoc styles; use CSS variables and class rules in `globals.css`.
- Ensure all translations and values match existing code patterns.
- Verify the build with `npm run build` after each task.

---

### Task 1: CSS Premium Shadow Upgrades

**Files:**
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: None
- Produces: Updated CSS class rules (`.lm-card`, `.lm-card:hover`, `.lm-card.selected`, `.it-item`, `.lm-cover-icon`, `.it-cover-icon`) that styling elements in Task 2 will inherit.

- [ ] **Step 1: Edit globals.css to declare premium card shadows and hover/selected transformations**

Update `.lm-card` styling in [globals.css](file:///d:/AI/trip-builder/src/app/globals.css) (around line 360):

```css
.lm-card {
  background: var(--card-glass);
  border: 1px solid var(--border-glass);
  border-radius: var(--r-lg);
  padding: 0; /* Clear padding to align image edge */
  cursor: grab;
  /* Premium Soft Shadow */
  box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05), 0 8px 16px -8px rgba(0,0,0,0.05);
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease, border-color 0.3s;
  user-select: none;
  position: relative;
  overflow: hidden;
}
.lm-card:hover {
  transform: translateY(-4px) scale(1.02);
  border-color: var(--teal);
  box-shadow: 0 20px 35px -10px rgba(0,0,0,0.1), 0 12px 24px -12px rgba(0,0,0,0.1);
}
.lm-card.selected {
  border-color: transparent;
  box-shadow: 0 0 0 2.5px var(--teal-m), 0 10px 30px -5px rgba(29, 158, 117, 0.2);
}
.lm-card.highlight {
  border-color: var(--teal);
  background: var(--teal-l);
  box-shadow: 0 0 0 2px var(--teal-m), 0 10px 30px -5px rgba(29, 158, 117, 0.15);
}
```

- [ ] **Step 2: Hide centered emojis and style the count badge in globals.css**

Update `.lm-cover-icon`, `.it-cover-icon`, and `.lm-count-badge` in [globals.css](file:///d:/AI/trip-builder/src/app/globals.css):

```css
.lm-cover-icon, .it-cover-icon {
  display: none !important; /* Hide emoji from photo center */
}
.lm-count-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  background: rgba(29, 158, 117, 0.85);
  backdrop-filter: blur(4px);
  color: #ffffff;
  font-size: 9px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 20px;
  z-index: 2;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}
```

- [ ] **Step 3: Update itinerary item shadows in globals.css**

Update `.it-item` in [globals.css](file:///d:/AI/trip-builder/src/app/globals.css) (around line 2420 or in it-item styles):

```css
.it-item {
  background: var(--card-glass);
  border: 1px solid var(--border-glass);
  border-radius: var(--r-lg);
  box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05), 0 8px 16px -8px rgba(0,0,0,0.05);
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease;
  overflow: hidden;
}
.it-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 15px 30px -10px rgba(0,0,0,0.08), 0 10px 20px -12px rgba(0,0,0,0.08);
}
```

- [ ] **Step 4: Run build to verify compilation**

Run: `npm run build`
Expected output: SUCCESS.

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css
git commit -m "style: implement premium soft shadows and hover transitions for cards"
```

---

### Task 2: DOM Restructuring in page.js

**Files:**
- Modify: `src/app/page.js`

**Interfaces:**
- Consumes: Shadow card selectors from Task 1.
- Produces: Correct DOM layout containing emojis next to landmark names.

- [ ] **Step 1: Restructure landmark name in page.js sidebar list**

In [page.js](file:///d:/AI/trip-builder/src/app/page.js), locate the `lm-name` rendering inside `filteredLandmarks` map (around line 2209):

```javascript
// TARGET CODE
                    <div style={{ padding: '6px 8px' }}>
                      <div className="lm-name">{(l.names && l.names[activeLang]) || l.name}</div>
```

Change it to prepend the emoji and increase card padding to `8px 10px`:

```javascript
                    <div style={{ padding: '8px 10px' }}>
                      <div className="lm-name">
                        <span style={{ marginRight: '6px' }}>{l.icon}</span>
                        {(l.names && l.names[activeLang]) || l.name}
                      </div>
```

- [ ] **Step 2: Restructure itinerary item name in page.js day builder list**

In [page.js](file:///d:/AI/trip-builder/src/app/page.js), locate the `it-name` rendering inside itinerary items loop (around line 2435):

```javascript
// TARGET CODE
                                    <div className="it-name" onClick={() => handleOpenDetail(actualLandmark)}>
                                      {(actualLandmark.names && actualLandmark.names[activeLang]) || actualLandmark.name}
                                      {item.rating && <span style={{ color: '#EF9F27', fontSize: '9px', fontWeight: 'bold', marginLeft: '5px', whiteSpace: 'nowrap' }}>⭐ {item.rating}</span>}
                                    </div>
```

Change it to prepend the emoji:

```javascript
                                    <div className="it-name" onClick={() => handleOpenDetail(actualLandmark)}>
                                      <span style={{ marginRight: '6px' }}>{actualLandmark.icon}</span>
                                      {(actualLandmark.names && actualLandmark.names[activeLang]) || actualLandmark.name}
                                      {item.rating && <span style={{ color: '#EF9F27', fontSize: '9px', fontWeight: 'bold', marginLeft: '5px', whiteSpace: 'nowrap' }}>⭐ {item.rating}</span>}
                                    </div>
```

- [ ] **Step 3: Run build to verify compilation**

Run: `npm run build`
Expected output: SUCCESS.

- [ ] **Step 4: Commit**

```bash
git add src/app/page.js
git commit -m "feat: move emojis from cover images to card titles"
```
