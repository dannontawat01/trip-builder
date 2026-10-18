# Google Sheets Cache & SWR Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement client-side localStorage caching with Stale-While-Revalidate (SWR) logic for landmarks and cloud itineraries to eliminate page load and tab-switching delays.

**Architecture:**
1. Retrieve cached plans and landmarks from `localStorage` immediately upon user access or city tab switches.
2. Trigger asynchronous background fetches to sync latest data, compare JSON representations, and update UI state only when data drifts.
3. Automatically update `localStorage` caches on write operations (Save, Create, Delete) to keep local states responsive and synced.

**Tech Stack:** Next.js, React, LocalStorage.

## Global Constraints
- Keep lines short and concise.
- Preserve all unrelated comments and docstrings.
- Ensure unique IDs for interactive elements.
- Verify each task has a corresponding test run.

---

### Task 1: Landmarks SWR Caching
Enable landmarks to load instantly on tab/city switch by utilizing localStorage caches.

**Files:**
- Modify: [src/app/page.js](file:///d:/AI/trip-builder/src/app/page.js)

- [ ] **Step 1: Check and load from cache instantly**
  Inside the `fetchLandmarks` function, before fetching from `googleSheets.getLandmarks`, read from `localStorage` with key `tb_cache_landmarks_${activeCity}_${email}`.
  If cached data exists:
  - Parse and load it immediately into `landmarks` state.
  - Set `setIsLoading(false)` to hide the loading spinner instantly.
- [ ] **Step 2: Compare and update on fetch completion**
  Once `googleSheets.getLandmarks` background fetch completes:
  - Map the retrieved landmarks.
  - If the mapped data is different from the cached data (using stringified JSON comparison) or if there was no cache:
    - Update `landmarks` state with fresh records.
    - Write the fresh data back to `localStorage` under `tb_cache_landmarks_${activeCity}_${email}`.
- [ ] **Step 3: Run build to verify**
  Run: `npm run build`
- [ ] **Step 4: Commit Task 1**
  ```bash
  git add src/app/page.js
  git commit -m "feat(cache): implement stale-while-revalidate caching for landmarks"
  ```

---

### Task 2: Cloud Plans SWR Caching
Enable itineraries list and active plan layout to render immediately upon page mount or login using cached plans.

**Files:**
- Modify: [src/app/page.js](file:///d:/AI/trip-builder/src/app/page.js)

- [ ] **Step 1: Read and populate from plans cache on start**
  Inside `loadCloudPlans`, before triggering `googleSheets.getItineraries`:
  - Read from `localStorage` using key `tb_cache_cloud_plans_${email}`.
  - If cached plans array exists:
    - Parse it and set `setPlansList(cachedPlans)`.
    - Find the active plan based on `tb_active_plan_${email}` or fallback to the first cached plan.
    - If active plan found, call states: `setActivePlanId`, `setItin`, `setNDays`, `setStartDate`, `setStartTime`, `setHotel`, `setChecklist`.
- [ ] **Step 2: Sync and overwrite on fetch completion**
  Once `googleSheets.getItineraries` completes:
  - If the fresh plans array is different from the cached plans array:
    - Update `plansList` state.
    - Write fresh plans to cache `tb_cache_cloud_plans_${email}`.
    - If the active plan ID is still valid, update current states (`itin`, `nDays`, `startDate`, `startTime`, `hotel`, `checklist`) with the fresh active plan data to ensure the UI updates if edited elsewhere.
  - If there was no cached data, populate the cache and load the active plan as usual.
- [ ] **Step 3: Run build to verify**
  Run: `npm run build`
- [ ] **Step 4: Commit Task 2**
  ```bash
  git add src/app/page.js
  git commit -m "feat(cache): implement stale-while-revalidate caching for cloud itineraries list"
  ```

---

### Task 3: Cache Write-Through Synchronization
Ensure write actions (Save, Create, Delete) immediately write updates into the `localStorage` cache.

**Files:**
- Modify: [src/app/page.js](file:///d:/AI/trip-builder/src/app/page.js)

- [ ] **Step 1: Sync cache on auto-saves**
  Inside `saveItinData` (lines 1602-1615), after updating the local `plansList` state, write the updated plans list to `tb_cache_cloud_plans_${user.email}` in `localStorage`.
- [ ] **Step 2: Sync cache on plan creation**
  Inside `handleCreatePlanCloud` (line 1136), after updating `plansList` with `newPlan`, write `[newPlan, ...plansList]` to `tb_cache_cloud_plans_${email}` in `localStorage`.
- [ ] **Step 3: Sync cache on plan deletion**
  Inside the delete itinerary success block (line 1215), after filtering the plan, write the filtered `updatedPlans` list to `tb_cache_cloud_plans_${user.email}` in `localStorage`.
- [ ] **Step 4: Run build to verify**
  Run: `npm run build`
- [ ] **Step 5: Commit Task 3**
  ```bash
  git add src/app/page.js
  git commit -m "feat(cache): implement cache write-through synchronization for plan mutations"
  ```

---

## Verification Plan

### Automated Tests
- Run Next.js build verification:
  ```bash
  npm run build
  ```

### Manual Verification
1. Log in. Check that plans and itinerary headers display instantly without spinner.
2. Toggle active city tabs (e.g. Bangkok to Tokyo) and check that landmarks appear instantly.
3. Edit the itinerary (drag/drop places, change hotel name) and reload the page. Confirm the edited plan loads instantly from cache.
4. Delete a plan, reload, and confirm it is immediately gone from the initial render.
