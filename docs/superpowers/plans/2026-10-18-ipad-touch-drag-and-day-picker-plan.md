# Touch Drag & Drop and Day Switching for iPad & Mobile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable seamless touch drag-and-drop on iPad/mobile devices and add intuitive Day-Picker and Move-to-Day popovers so users can easily move places between days on touchscreens and desktop.

**Architecture:** 
1. Implement a lightweight, zero-dependency Touch Drag Controller in React that detects touch-and-hold gestures, displays a floating ghost preview, detects drop targets via `document.elementFromPoint`, and executes drop actions.
2. Add a `📅` "Move to Day" popover button to itinerary items allowing users to jump any place to any day in one tap.
3. Add a quick Day-Picker popover when tapping attraction cards in the sidebar so users choose their target day directly instead of auto-dumping into Day 1.
4. Add CSS styles for touch previews, popovers, and mobile touch target optimizations.

**Tech Stack:** Next.js 16, React 19, Vanilla CSS (Tailwind v4 theme variables)

## Global Constraints
- Preserve existing desktop HTML5 drag-and-drop functionality (`draggable`, `handleDragStart`, `handleDragOver`, `handleDrop`).
- Keep maximum 5 places per day constraint.
- Next.js 16 / React 19 compatibility (no unsafe DOM mutations or unsupported React 19 patterns).
- Support bilingual UI (Thai `th` and English `en`).

---

### Task 1: Data State & Itinerary Item Move to Day (`moveItinItemToDay` and Popover)

**Files:**
- Modify: `src/app/page.js:1890-1940` (Add `moveItinItemToDay` handler)
- Modify: `src/app/page.js:3160-3220` (Add Move-to-Day `📅` button and contextual popover in `.it-actions`)

**Interfaces:**
- Produces: `moveItinItemToDay(fromDay: number, fromIdx: number, toDay: number) => void`
- Produces: State `moveDayPopover: { itinId: string, fromDay: number, idx: number, item: object } | null`

- [ ] **Step 1: Add `moveItinItemToDay` function to `src/app/page.js`**
  Validate destination capacity (`< 5`), splice from `fromDay`, push to `toDay`, update `lastId`/`lastDay`, call `saveItinData`, and show confirmation toast.

- [ ] **Step 2: Add `moveDayPopover` state and click-outside listener in `src/app/page.js`**
  Manage which itinerary card currently has its move popover open. Add document click listener to close on click outside.

- [ ] **Step 3: Render Move-to-Day button (`📅`) and popover in each `.it-item`**
  Add the button in `.it-actions`. When open, render `.move-day-popover` listing buttons for Day 1..nDays with status indicators (`full`, `current`, available).

- [ ] **Step 4: Verify syntax and functionality**
  Run `npm run build` or test compile to ensure no syntax errors.

- [ ] **Step 5: Commit changes**
  `git add src/app/page.js && git commit -m "feat: add moveItinItemToDay and itinerary move-day popover"`

---

### Task 2: Sidebar Landmark Tap Day-Picker Popover

**Files:**
- Modify: `src/app/page.js:2835-2880` (Update `.lm-card` click behavior to open Day Picker popover)

**Interfaces:**
- Produces: State `addPlacePopover: { landmarkId: string, place: object } | null`
- Consumes: `addToDay(place: object, day: number)`

- [ ] **Step 1: Add `addPlacePopover` state in `src/app/page.js`**
  Track the landmark whose day picker popover is currently active.

- [ ] **Step 2: Update `.lm-card` onClick to toggle `addPlacePopover`**
  Prevent default auto-adding to Day 1. Instead, set `addPlacePopover({ landmarkId: l.id, place: l })`.

- [ ] **Step 3: Render `.lm-day-picker-popover` on the landmark card**
  Display title "เพิ่มลงแผน (เลือกวัน)" / "Add to Plan (Select Day)" with buttons for Day 1..nDays showing current item count (`x/5`). On day click, call `addToDay(l, day)` and close popover.

- [ ] **Step 4: Verify build**
  Run `npm run build` to verify no errors.

- [ ] **Step 5: Commit changes**
  `git add src/app/page.js && git commit -m "feat: add quick day picker popover for sidebar attractions"`

---

### Task 3: Zero-Dependency Touch Drag & Drop System

**Files:**
- Modify: `src/app/page.js` (Add Touch Drag state, touch event handlers on `.lm-card` and `.it-item`, and floating ghost component)

**Interfaces:**
- Produces: State `touchDrag: { active: boolean, item: object, source: string|number, index: number|null, x: number, y: number, name: string, icon: string } | null`
- Produces: State `touchOverDay: number | null`
- Consumes: `handleDrop(e, day: number)`

- [ ] **Step 1: Implement touch drag lifecycle handlers in `src/app/page.js`**
  - `handleTouchStart(e, item, source, index)`: records start coordinates and sets 150ms hold timer or drag threshold.
  - `handleTouchMove(e)`: if dragging initiated, calls `e.preventDefault()`, updates `touchDrag.x/y`, uses `document.elementFromPoint` to find hovered `.day-zone[data-day]`, and updates `touchOverDay`.
  - `handleTouchEnd(e)`: if active and `touchOverDay`, calls drop handler logic; cleans up ghost element and timers.
  - `handleTouchCancel(e)`: resets touch state cleanly.

- [ ] **Step 2: Bind touch event listeners to `.lm-card` and `.it-item`**
  Attach `onTouchStart`, `onTouchMove`, `onTouchEnd`, `onTouchCancel` to sidebar cards and itinerary items.

- [ ] **Step 3: Add `data-day={day}` and touch hover styling on `.day-zone`**
  Add `.touch-drag-over` visual highlight when `touchOverDay === day`.

- [ ] **Step 4: Render floating ghost element in root container**
  Render `.touch-drag-ghost` following `(touchDrag.x, touchDrag.y)` with place icon, name, and elevation shadow.

- [ ] **Step 5: Commit changes**
  `git add src/app/page.js && git commit -m "feat: implement touch drag and drop for iPad and mobile"`

---

### Task 4: Responsive Styles & Touch Target Polish

**Files:**
- Modify: `src/app/globals.css` (Add styling for `.move-day-popover`, `.lm-day-picker-popover`, `.touch-drag-ghost`, `.touch-drag-over`, and responsive touch target sizes)

- [ ] **Step 1: Add CSS for Popovers**
  Style `.move-day-popover` and `.lm-day-picker-popover` with animations, rounded borders, z-index, shadow, and day button grids.

- [ ] **Step 2: Add CSS for Ghost element and Dropzone highlights**
  Style `.touch-drag-ghost` (`position: fixed`, `pointer-events: none`, `z-index: 99999`, backdrop blur, shadow).
  Style `.day-zone.touch-drag-over` (`border: 2px dashed var(--teal)`, background tint).

- [ ] **Step 3: Polish mobile & iPad touch targets**
  Ensure `.xbtn`, `.mvbtn`, and day buttons have comfortable touch margins and sizes (minimum 36-40px).

- [ ] **Step 4: Commit changes**
  `git add src/app/globals.css && git commit -m "style: add styles for touch drag ghost, popovers and touch targets"`

---

### Task 5: Verification & Testing

**Files:**
- Review: `src/app/page.js`, `src/app/globals.css`

- [ ] **Step 1: Run linter and production build**
  Execute `npm run lint` and `npm run build` and ensure 0 errors.

- [ ] **Step 2: Verify in browser (Desktop & Responsive Emulation)**
  - Verify dragging from sidebar to day with mouse (Desktop HTML5 DnD).
  - Emulate iPad Air / iPad Pro / iPhone in Chrome DevTools Device Mode:
    - Tap place in sidebar -> opens Day Picker popover -> choose Day 2 -> added to Day 2!
    - Tap `📅` on Day 2 item -> opens Move popover -> choose Day 1 -> moved to Day 1!
    - Touch-and-drag place from sidebar to Day 3 -> ghost card follows touch -> drop on Day 3 -> added!
    - Touch-and-drag place from Day 3 to Day 1 -> moved!
    - Scrolling lists works smoothly without triggering drag unless held.

- [ ] **Step 3: Final commit and summary**
  `git commit -m "chore: complete iPad touch drag and day switching feature"`
