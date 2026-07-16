# Design Spec: Trip Builder Premium Cards UI Overhaul

- **Date:** 2026-07-16
- **Status:** APPROVED
- **Author:** Antigravity (AI Coding Assistant)
- **Topic:** Premium Cards Design & Drop Shadows Integration

---

## 1. Goal & Objectives

Redesign the landmark cards (`.lm-card`) and itinerary items (`.it-item`) to have a premium, tactile look by integrating soft, elegant drop shadows (`box-shadow`), removing visual noise (centered emoji icons overlaying images, thick colored borders), and polishing typography layout.

---

## 2. Card Design Enhancements

### 2.1 CSS Styling Upgrades in `globals.css`
Update card structures to use custom soft shadows instead of flat, solid borders:

```css
.lm-card {
  background: var(--card-glass);
  border: 1px solid var(--border-glass);
  border-radius: var(--r-lg);
  padding: 0;
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
  /* Soft teal glow on selected state */
  box-shadow: 0 0 0 2.5px var(--teal-m), 0 10px 30px -5px rgba(29, 158, 117, 0.2);
}

/* Cleanup cover icon center positioning */
.lm-cover-icon {
  display: none; /* Removed from image center overlay */
}

/* Translucent Glass Count Badge */
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

### 2.2 Itinerary Cards Upgrades in `globals.css`
Style the selected items in the main builder panel (`.it-item`) similarly:

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

.it-cover-icon {
  display: none; /* Removed from image center overlay */
}
```

---

## 3. Component DOM Restructure in `page.js`

### 3.1 Landmark Cards
Remove the centered icon overlay and put the emoji icon before the place name:
- **Change:** Remove `<span className="lm-cover-icon">{l.icon}</span>` inside `.lm-cover-strip`.
- **Change:** Render the landmark name as:
  ```javascript
  <div className="lm-name">
    <span style={{ marginRight: '6px' }}>{l.icon}</span>
    {(l.names && l.names[activeLang]) || l.name}
  </div>
  ```

### 3.2 Itinerary Items
Apply matching changes to day schedule cards:
- **Change:** Remove `<span className="it-cover-icon">{actualLandmark.icon}</span>` inside `.it-cover-strip`.
- **Change:** Render the itinerary item name as:
  ```javascript
  <div className="it-name" onClick={() => handleOpenDetail(actualLandmark)}>
    <span style={{ marginRight: '6px' }}>{actualLandmark.icon}</span>
    {(actualLandmark.names && actualLandmark.names[activeLang]) || actualLandmark.name}
    ...
  </div>
  ```

---

## 4. Verification Plan

- Run `npm run build` to verify Next.js production build compilation.
- Run `npm run lint` to verify coding syntax and suppression rules.
- Verify UI visually (ensure drop shadows appear softly on cards, card edges scale nicely on hover, and no emojis sit in the center of the images).
