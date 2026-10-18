# Client-side Cache & Stale-While-Revalidate (SWR) for Google Sheets

## Goal
Implement a robust client-side caching layer using local storage to eliminate latency when fetching landmarks database and cloud plans list. This changes the application's perceived speed from "waiting on Google Apps Script APIs" (2 to 8 seconds) to "instantaneous" (10 to 50 milliseconds) by serving cached content immediately, while revalidating data in the background.

## Caching Strategy

### 1. Cloud Plans Caching
- **Key:** `tb_cache_cloud_plans_${email}`
- **Cache Hits (Stale):** Served instantly on page mount or login, updating `plansList` and loading the active itinerary in milliseconds.
- **Revalidation:** An asynchronous background fetch triggers to retrieve fresh plans from Google Sheets. If the retrieved data differs from the cached value:
  - Update `plansList` state.
  - Update the currently active plan details (`itin`, `nDays`, `startDate`, etc.) if the active plan's content was updated on the server.
  - Write fresh data to cache.
- **Cache Synchronization (Write-Through):**
  - Updated on local debounced auto-saves (`saveItinData`).
  - Updated on plan creation (`handleCreatePlanCloud`).
  - Updated on plan deletion.

### 2. Landmarks Caching
- **Key:** `tb_cache_landmarks_${cityId}_${email}`
- **Cache Hits (Stale):** Served instantly on tab switch or page mount, mapping the landmarks array, updating state, and hiding the loading indicator.
- **Revalidation:** Trigger background fetch to read from Google Sheets. If different:
  - Update `landmarks` state.
  - Write fresh data to cache.

## UI/UX Enhancements
- Turn off global blocking loaders (`isLoading = true`) when cached records are present, replacing them with a subtle background syncing indicator if helpful, or simply updating values inline once resolved.

## Verification
- Reload the app under poor network conditions (or offline throttling) and confirm the itineraries and landmarks populate instantly.
