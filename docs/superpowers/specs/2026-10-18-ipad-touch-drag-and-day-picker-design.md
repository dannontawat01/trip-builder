# Touch Drag & Drop and Day Switching for iPad & Mobile

**Date:** 2026-10-18  
**Topic:** iPad & Mobile Touch Drag-and-Drop + Day Selection & Moving Controls  
**Status:** Approved  

---

## 1. Background & Problem Statement

Users accessing Trip Builder on iPad (Safari / Chrome) and mobile devices experience difficulties interacting with place cards:
1. **No Drag-and-Drop on Touch:** The HTML5 Drag and Drop API (`draggable`, `ondragstart`, `ondragover`, `ondrop`) is not natively supported via touch events on iOS Safari or mobile browsers. Touching and dragging place cards is interpreted by the browser as scrolling, so places cannot be dragged from the attractions list to an itinerary day, or between itinerary days.
2. **Cannot Move Places Across Days via Buttons:** In the itinerary, places only have `↑` (move up) and `↓` (move down) buttons, allowing reordering only within the same day. There is no button to move a place from Day 1 to Day 2 or any other day.
3. **Sidebar Attraction Tap Forced Day 1:** Tapping a card in the attractions list automatically pushes it to the first available day (`Day 1`), preventing users on touch devices from choosing their desired day directly on tap.

---

## 2. Goals & Success Criteria

- **Touch Drag & Drop:** Users can drag attractions from the sidebar directly into any day column, and drag itinerary cards between different days using fingers or Apple Pencil on iPad and smartphones.
- **Visual Feedback:** A floating ghost card tracks touch movement, and hovered day zones highlight clearly.
- **Move to Day Action (Popover):** Every itinerary card includes a dedicated `📅` / `⇄` action button that opens a compact day selection popover, allowing instant moving across days in a single tap without dragging.
- **Quick Day Picker on Attraction Tap:** Tapping an attraction card in the sidebar opens a mini-popover allowing the user to select which day (Day 1, Day 2, Day 3...) to add it to, while preserving the `ℹ` button for viewing full place details.
- **Desktop Parity:** Existing desktop mouse drag-and-drop behavior remains 100% intact and unaffected.
- **Responsiveness & Touch Targets:** Touch targets meet minimum comfortable sizes (≥ 36–40px) and page scrolling remains smooth without accidental drags.

---

## 3. Architecture & Technical Design

### 3.1 Touch Drag Controller

A zero-dependency touch controller implemented directly within the React component lifecycle:
1. **Touch Gesture Recognition:**
   - Attached to draggable elements (sidebar `.lm-card` and itinerary `.it-item`).
   - Hooks into `onTouchStart`, `onTouchMove`, `onTouchEnd`, and `onTouchCancel`.
   - **Hold & Move Threshold:** Initiates dragging after a brief hold or movement threshold (~150ms hold or 8–10px move after press) to distinguish vertical scrolling from dragging.
2. **Floating Ghost Element:**
   - Dynamically creates a clone element rendered at root/body level (`position: fixed`, `pointer-events: none`, `z-index: 9999`, subtle drop shadow, reduced opacity).
   - Follows `touch.clientX` and `touch.clientY` at 60fps.
3. **Drop Target Detection:**
   - During `touchmove`, calls `document.elementFromPoint(clientX, clientY)` to find the closest `.day-zone[data-day]`.
   - Applies an active drop target CSS class (e.g., `.touch-drag-over`) to the hovered day zone.
4. **Drop Execution:**
   - On `touchend`: if over a valid `.day-zone`, identifies `targetDay` from `data-day`.
   - Triggers `handleDrop(e, targetDay)` with the active dragged item.
   - Smoothly cleans up ghost element and resets touch state.
   - If released outside any day zone or canceled, removes the ghost element without altering state.

### 3.2 UI/UX Components

#### Itinerary Card "Move to Day" Button & Popover
- Location: Added to `.it-actions` alongside `↑`, `↓`, `✕`.
- Icon: `📅` or `⇄` with label "ย้ายวัน" (Move to Day).
- Popover content:
  - Displays day pills: `วันที่ 1`, `วันที่ 2`, etc.
  - Highlights the current day as active/disabled.
  - Displays places count per day (e.g. `(3/5)`), disabling full days (`5/5`).
  - Tapping a day executes `moveItinItemToDay(fromDay, idx, toDay)` and closes popover.
  - Dismisses on click outside.

#### Sidebar Attraction Tap Day Picker Popover
- Trigger: Tapping the landmark card (outside the `ℹ` info button).
- Popover content:
  - Title: "เพิ่มลงแผน (เลือกวัน)"
  - Day pills for Day 1..nDays with status indicators (`full` vs available).
  - Tapping a day executes `addToDay(place, day)` and closes the popover.
  - Info button `ℹ` continues to open the full place detail modal.

### 3.3 State Management & Data Flow

- New function `moveItinItemToDay(fromDay, fromIdx, toDay)`:
  - Validates `(itin[toDay] || []).length < 5`. If full, displays a toast alert (`"วันที่ X เต็มแล้ว (สูงสุด 5 ที่/วัน)"`).
  - Slices item from `itin[fromDay]`, pushes to `itin[toDay]`.
  - Updates `lastId` and `lastDay`.
  - Invokes `saveItinData(newItin, nDays)` to sync with `localStorage` and Supabase.
  - Dispatches toast notification (`"✅ ย้าย [ชื่อสถานที่] ไป วันที่ [toDay] แล้ว"`).

---

## 4. Edge Cases & Error Handling

- **Multi-Touch:** Only tracks the primary touch identifier (`identifier = e.changedTouches[0].identifier`). Secondary fingers are ignored.
- **Accidental Drags During Fast Scroll:** Threshold check ensures scrolling is never blocked during normal swipes.
- **Maximum Day Capacity (5 places):** Both drag-and-drop and tap-to-move enforce the 5-item limit per day.
- **Modal/Popover Conflict:** Opening a new popover closes any existing open popovers. Clicking outside closes open popovers.
- **Orientation Changes (Portrait / Landscape on iPad):** Layout and coordinates adjust dynamically with fluid percentages and flex/grid.

---

## 5. Verification Plan

1. **Automated Verification:**
   - Run Next.js linter (`npm run lint`).
   - Run production build (`npm run build`) to ensure zero syntax or SSR issues.
2. **Manual Touch & Responsiveness Testing:**
   - Test on iPad/Tablet viewport (768px - 1024px) in Safari and Chrome.
   - Test touch drag from Sidebar to Day 1, 2, 3.
   - Test touch drag between Day 1 and Day 2 inside the Itinerary.
   - Test "Move to Day" popover on Itinerary cards.
   - Test Tap-to-Add day picker popover on Attractions in the Sidebar.
   - Verify page scrolling remains smooth and unobstructed.
   - Test on Desktop with mouse to verify existing HTML5 drag-and-drop is 100% functioning.
