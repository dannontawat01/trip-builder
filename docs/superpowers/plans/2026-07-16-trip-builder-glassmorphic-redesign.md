# Trip Builder Glassmorphic & Immersive UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Trip Builder UI into an immersive Glassmorphic interface and resolve UI bugs including topbar button disappearance, suggestion category translations, and fullscreen map stack order.

**Architecture:** Inject glassmorphic CSS custom tokens, utilities, and layout styles into `globals.css`. Refactor `page.js` to structure topbar button layouts, group controller sections into a unified HUD panel, translate recommendations, and linkLeaflet map sizes to resize events.

**Tech Stack:** React 19, Next.js 16.2 (App Router), Tailwind CSS v4, Leaflet.js

## Global Constraints
- Do not use Tailwind class utilities for ad-hoc styles; use CSS variables and class rules in `globals.css` to maintain theme consistency.
- Ensure all translations use `LANG_STRINGS[activeLang]` or the helper translation function `t(key)`.
- Never hide primary action elements (Clear, Export) on standard desktop screens (under 1300px).
- Verify the build with `npm run build` and `npm run lint` after each task.

---

### Task 1: CSS Design Tokens & Glassmorphic Utilities

**Files:**
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: None
- Produces: CSS variables (`--card-glass`, `--border-glass`, `--shadow-premium`) and classes (`.glass-panel`) used by React components in Task 2 and 3.

- [ ] **Step 1: Edit globals.css to inject glassmorphic variables and utility classes**

Update the root and theme variables in [globals.css](file:///d:/AI/trip-builder/src/app/globals.css) at the top of the file:

```css
:root {
  --teal: #1D9E75;
  --teal-l: #E1F5EE;
  --teal-d: #0F6E56;
  --teal-m: #5DCAA5;
  --bg: #F7F6F2;
  --card: #FFFFFF;
  --dark: #1C1C1A;
  --muted: #8A8880;
  --border: #E2E0D8;
  
  --red: #E24B4A;
  --red-l: #FCEBEB;
  --red-d: #A32D2D;
  
  --blue: #378ADD;
  --blue-l: #E6F1FB;
  --blue-d: #185FA5;
  
  --amber: #EF9F27;
  --amber-l: #FAEEDA;
  --amber-d: #854F0B;
  
  --green: #639922;
  --green-l: #EAF3DE;
  --green-d: #3B6D11;
  
  --pink: #D4537E;
  --pink-l: #FBEAF0;
  --pink-d: #993556;
  
  --purple: #7F77DD;
  --purple-l: #EEEDFE;
  --purple-d: #534AB7;
  
  --shadow: 0 1px 3px rgba(0,0,0,.06), 0 4px 16px rgba(0,0,0,.04);
  --shadow-lg: 0 8px 32px rgba(0,0,0,.10);
  --r: 10px;
  --r-lg: 16px;

  /* Translucent & Glass Tokens */
  --card-glass: rgba(255, 255, 255, 0.7);
  --border-glass: rgba(255, 255, 255, 0.3);
  --bg-gradient: linear-gradient(135deg, #F7F6F2 0%, #EFECE3 100%);
  --shadow-premium: 0 8px 32px 0 rgba(31, 38, 135, 0.06);
  --shadow-glass-inset: inset 0 1px 1px rgba(255, 255, 255, 0.4);
  --border-muted: rgba(0, 0, 0, 0.06);
}

body.theme-dark {
  --bg: #1A1A18;
  --card: #242422;
  --dark: #F0EFE9;
  --muted: #6B6963;
  --border: #333330;
  --teal-l: #0D3328;
  --teal-d: #5DCAA5;
  --blue-l: #0D1F35;
  --blue-d: #85B7EB;
  --red-l: #2D1515;
  --red-d: #F09595;
  --green-l: #1A2A10;
  --green-d: #97C459;
  --amber-l: #2A1E08;
  --amber-d: #EF9F27;
  --shadow: 0 1px 3px rgba(0,0,0,.3), 0 4px 16px rgba(0,0,0,.2);
  --shadow-lg: 0 8px 32px rgba(0,0,0,.4);

  /* Translucent & Glass Dark Tokens */
  --card-glass: rgba(36, 36, 34, 0.75);
  --border-glass: rgba(255, 255, 255, 0.08);
  --bg-gradient: linear-gradient(135deg, #1C1C1A 0%, #121211 100%);
  --shadow-premium: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
  --shadow-glass-inset: inset 0 1px 1px rgba(255, 255, 255, 0.05);
  --border-muted: rgba(255, 255, 255, 0.08);
}
```

Add the glass helper block right below the variable declarations:

```css
/* Glassmorphism Panel Helper */
.glass-panel {
  background: var(--card-glass) !important;
  backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
  border: 1px solid var(--border-glass) !important;
  box-shadow: var(--shadow-premium), var(--shadow-glass-inset) !important;
}
```

- [ ] **Step 2: Remove solid box styles and borders from container classes**

Update container layouts in [globals.css](file:///d:/AI/trip-builder/src/app/globals.css) to apply the `.glass-panel` properties to `.topbar`, `.sidebar`, and `.nearby`:

```css
.topbar {
  background: var(--card-glass);
  backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
  border-bottom: 1px solid var(--border-glass);
  padding: 0 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  height: 56px;
  flex-shrink: 0;
  z-index: 10;
  box-shadow: var(--shadow-premium);
}
.sidebar {
  border-right: 1px solid var(--border-muted);
  background: var(--card-glass);
  backdrop-filter: blur(12px) saturate(180%);
  -webkit-backdrop-filter: blur(12px) saturate(180%);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.nearby {
  border-left: 1px solid var(--border-muted);
  background: var(--card-glass);
  backdrop-filter: blur(12px) saturate(180%);
  -webkit-backdrop-filter: blur(12px) saturate(180%);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
```

- [ ] **Step 3: Run build to verify compilation**

Run: `npm run build`
Expected output: Success with no CSS syntax errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "style: implement glassmorphic variables and container backgrounds"
```

---

### Task 2: Topbar & Recommendations Bug Fixes & Translations

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/page.js`

**Interfaces:**
- Consumes: Glass tokens and styles defined in globals.css (Task 1).
- Produces: Correct translation tags inside Page layout and fully functioning Clear and Export actions.

- [ ] **Step 1: Fix disappearing Topbar buttons in globals.css**

In [globals.css](file:///d:/AI/trip-builder/src/app/globals.css), locate and delete the media query at line 2169 that hides topbar clear and export buttons:

```css
/* DELETE THIS BLOCK IN globals.css */
@media (max-width: 1300px) {
  .topbar-actions .topbar-clear-btn,
  .topbar-actions .topbar-export-btn {
    display: none !important;
  }
}
```

- [ ] **Step 2: Restructure Topbar actions in page.js to prevent overflow**

In [page.js](file:///d:/AI/trip-builder/src/app/page.js), ensure that on smaller desktop sizes, buttons do not overflow, by wrapping them in a flexible wrapper. Also, add the category translations call `translateCategory(n.cat, activeLang)` in the recommendations list inside the return block of `TripBuilderApp`.

Locate the `nearbySuggestions` rendering inside recommendations (around line 2532):
```javascript
// TARGET CODE TO EDIT
                      <div className="n-meta">
                        <span className="badge" style={{ background: getCityObj(n.city_id)?.light, color: getCityObj(n.city_id)?.dark }}>{n.cat}</span>
```

Replace it with translated category tag:
```javascript
                      <div className="n-meta">
                        <span className="badge" style={{ background: getCityObj(n.city_id)?.light, color: getCityObj(n.city_id)?.dark }}>
                          {translateCategory(n.cat, activeLang)}
                        </span>
```

- [ ] **Step 3: Redesign landmark cards with larger photos and hover effect**

Update `.lm-card` and `.lm-cover-strip` styles in [globals.css](file:///d:/AI/trip-builder/src/app/globals.css) to increase preview size and add transition:

```css
.lm-card {
  background: var(--card-glass);
  border: 1px solid var(--border-glass);
  border-radius: var(--r-lg);
  padding: 0; /* Clear padding to align image edge */
  cursor: grab;
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease, border-color 0.3s;
  user-select: none;
  position: relative;
  overflow: hidden;
}
.lm-card:hover {
  transform: translateY(-2px) scale(1.02);
  border-color: var(--teal);
  box-shadow: var(--shadow-lg);
}
.lm-cover-strip {
  height: 110px; /* INCREASED FROM 52px */
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--r-lg) var(--r-lg) 0 0;
  overflow: hidden;
  position: relative;
}
.lm-cover-strip img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  position: absolute;
  inset: 0;
  transition: transform 0.3s ease;
}
.lm-card:hover .lm-cover-strip img {
  transform: scale(1.05); /* Slight zoom on hover */
}
```

- [ ] **Step 4: Run build to verify compilation**

Run: `npm run build`
Expected output: SUCCESS.

- [ ] **Step 5: Commit**

```bash
git add src/app/page.js src/app/globals.css
git commit -m "feat: show topbar buttons on all desktop screens, translate categories, and upgrade landmark card preview size"
```

---

### Task 3: Leaflet Map Auto-Resizing, Fullscreen stack order, and Drag-and-Drop visuals

**Files:**
- Modify: `src/app/components/MapComponent.js`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: Leaflet CSS configuration and DOM structure.
- Produces: Correct stack ordering of fullscreen Leaflet maps and drag-hover states.

- [ ] **Step 1: Set z-index stack levels in globals.css**

Append or edit z-index classes in [globals.css](file:///d:/AI/trip-builder/src/app/globals.css) to guarantee correct stack hierarchy:

```css
/* Stacking Layer Settings */
.user-dropdown {
  z-index: 9999 !important;
}
.overlay {
  z-index: 9999 !important;
}
.map-component-wrapper.fullscreen {
  position: fixed !important;
  inset: 0 !important;
  z-index: 10000 !important; /* Keep below toast but above everything else */
  width: 100vw !important;
  height: 100vh !important;
  border-radius: 0 !important;
  box-shadow: none !important;
}
.map-sidebar-wrapper:has(.map-component-wrapper.fullscreen) {
  z-index: 10000 !important;
}
.toast {
  z-index: 10001 !important; /* Topmost alerts */
}
```

- [ ] **Step 2: Implement auto-resize logic using ResizeObserver in MapComponent.js**

Add a `ResizeObserver` inside the Leaflet map initialization hook of [MapComponent.js](file:///d:/AI/trip-builder/src/app/components/MapComponent.js) to trigger size invalidation on resize:

```javascript
  // Add this inside the map initialization useEffect in MapComponent.js (after line 78)
  const resizeObserver = new ResizeObserver(() => {
    if (map) {
      map.invalidateSize();
    }
  });
  if (mapContainerRef.current) {
    resizeObserver.observe(mapContainerRef.current);
  }

  // Ensure it gets cleaned up on unmount
  return () => {
    resizeObserver.disconnect();
    map.remove();
  };
```

- [ ] **Step 3: Style Drag-over glow on day-zones**

Update `.day-zone.over` style in [globals.css](file:///d:/AI/trip-builder/src/app/globals.css) to glow elegantly on drag-hover:

```css
.day-zone.over {
  border-color: var(--teal);
  background: rgba(29, 158, 117, 0.08);
  box-shadow: 0 0 16px rgba(29, 158, 117, 0.25);
  transform: scale(1.01);
  transition: all 0.2s ease;
}
```

- [ ] **Step 4: Run build & lint checks**

Run: `npm run lint`
Expected output: SUCCESS (no lint errors).
Run: `npm run build`
Expected output: SUCCESS.

- [ ] **Step 5: Commit**

```bash
git add src/app/components/MapComponent.js src/app/globals.css
git commit -m "fix: resolve fullscreen map stack order, automate Leaflet size invalidation, and style drag-over glows"
```
