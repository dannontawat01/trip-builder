# Guest Multi-Plan Support & Full Data Backup/Restore (Export & Import)

**Date:** 2026-10-18  
**Topic:** Guest Multi-Plan Support, Simplified Registration, and JSON Backup/Restore  
**Status:** Approved  

---

## 1. Background & Problem Statement

In the current Trip Builder application:
1. **Unregistered Guests Blocked from Multiple Plans:** When a guest user attempts to create a new plan via the "➕ สร้างแผนใหม่" button, the application blocks the action with a toast alert (`"กรุณาเข้าสู่ระบบเพื่อบันทึกหลายแผน"`) and automatically opens the login modal. Guests are locked into a single plan stored in `trip_builder_itin_v1`.
2. **Registration Barrier (Secret Passcode):** The registration modal requires entering a hardcoded passcode (`authRegisterCode === '8486'`). General users attempting to register to sync plans are blocked because they do not know this secret code.
3. **No Cross-Device Portability for Guests:** All guest-created plans and custom landmarks reside strictly within the browser's `localStorage` (`trip_builder_itin_v1` and `trip_builder_custom_places_v1`). If users switch devices, use a different browser, or clear browser data, their itineraries and custom places cannot be transferred or recovered without manual link sharing (which only captures landmarks added to days, not unassigned sidebar landmarks).
4. **Topbar Friction:** Unregistered users see a prominent "เข้าสู่ระบบ (Sign In)" button in the topbar, implying that creating accounts is mandatory for regular usage.

---

## 2. Goals & Success Criteria

- **Full Guest Multi-Plan Capabilities:** Unregistered users can create, rename, switch, and delete multiple itineraries directly within `localStorage` without any login prompts or restrictions.
- **Backward Compatibility (Auto-Migration):** Existing guest itineraries stored in `trip_builder_itin_v1` and custom places in `trip_builder_custom_places_v1` are automatically migrated into the new multi-plan guest structure upon first load with zero data loss.
- **Cross-Device Backup & Restore (JSON Export/Import):** Users can export all their itineraries, custom landmarks, and checklist data into a standardized JSON file (`trip-builder-backup.json`) and restore it on any device/browser without an account.
- **Frictionless Optional Registration:** Remove the hardcoded registration code (`8486`) from the registration flow. Anyone wishing to sync itineraries across devices via Google Sheets can sign up freely with just email and password.
- **Preserved Cloud Sync for Logged-In Users:** Users who log in continue to sync plans and custom landmarks to Google Sheets as before.

---

## 3. Architecture & Technical Design

### 3.1 Data Storage & Guest Multi-Plan Model

#### LocalStorage Keys
- `tb_guest_plans`: Array of itinerary plan objects:
  ```json
  [
    {
      "id": "guest_plan_1729230000000",
      "name": "ทริปโตเกียว 3 วัน",
      "city_id": "tyo",
      "nDays": 3,
      "start": "2026-10-18",
      "time": "09:00",
      "hotel": "Shinjuku Granbell",
      "itin": { "1": [...], "2": [...], "3": [...] },
      "checklist": [...]
    }
  ]
  ```
- `tb_guest_active_plan`: String containing the active plan's `id`.
- `trip_builder_custom_places_v1`: Preserved for local custom landmarks by city.

#### Auto-Migration Flow
On application boot (`checkSession()`):
1. If no user is logged in, inspect `tb_guest_plans`.
2. If `tb_guest_plans` is empty but legacy `trip_builder_itin_v1` exists:
   - Construct an initial plan object:
     - `id`: `guest_plan_default`
     - `name`: `My Trip 1`
     - `city_id`: active city
     - `itin`, `checklist`, `nDays`, `start`, `time`, `hotel` copied from legacy storage.
   - Save to `tb_guest_plans` and set `tb_guest_active_plan` = `guest_plan_default`.
3. If neither exists, initialize with a default empty 3-day plan.

### 3.2 UI/UX Updates

#### 1. Topbar Plan Selector
- The plan selector dropdown is displayed for **both guests and logged-in users**.
- Guests can:
  - Open the dropdown and see all saved local plans.
  - Switch active plans seamlessly.
  - Click "➕ สร้างแผนใหม่" (Create New Plan):
    - Generates a new plan with `id: guest_plan_${Date.now()}`.
    - Prompts for name or defaults to `My Trip ${plans.length + 1}`.
    - Switches active plan without opening the auth modal.
  - Rename or delete plans locally.

#### 2. Topbar Auth Button
- Label updated from plain "เข้าสู่ระบบ" to `"☁️ เข้าสู่ระบบ (ซิงค์ Cloud)"` or similar clear indicator.
- Indicates to users that logging in is strictly optional for Google Sheets cloud backup.

#### 3. Auth Modal Registration
- Remove `authRegisterCode` state requirement (`if (authRegisterCode.trim() !== '8486')`).
- Remove the registration code input field from the Register UI.
- Allow straightforward email and password registration.

### 3.3 Backup & Restore (Export / Import JSON)

#### Export Functionality (`handleExportBackup`)
- Located in the Export/Share panel and/or Plan Management dropdown.
- Compiles payload:
  ```json
  {
    "app": "trip-builder",
    "version": 1,
    "exportedAt": "2026-10-18T13:50:00.000Z",
    "plans": [...],
    "customPlaces": {...}
  }
  ```
- Triggers browser download of `trip-builder-backup.json`.
- Displays toast: `"✅ ส่งออกข้อมูลสำรองสำเร็จ"`.

#### Import Functionality (`handleImportBackup`)
- User selects a `.json` backup file via hidden file input (`<input type="file" accept=".json" />`).
- Reads file via `FileReader` and validates:
  - Valid JSON syntax.
  - Presence of `plans` array or `customPlaces` object.
- **Import Strategy:**
  - Merges incoming `customPlaces` with existing local custom places (preventing duplicate IDs).
  - Merges incoming `plans` with existing plans (or prepends new plans).
  - Sets active plan to the first imported plan.
  - Persists to `localStorage` immediately.
  - Updates React state and switches view without full page reload.
  - Displays toast: `"✅ นำเข้าข้อมูลสำเร็จ ([N] แผน, [M] สถานที่)"`.

---

## 4. Edge Cases & Error Handling

- **Corrupted Backup File:** If JSON parsing fails or schema does not match, catch error and show toast: `"❌ ไฟล์ข้อมูลสำรองไม่ถูกต้องหรือไม่สมบูรณ์"`.
- **Duplicate Plan IDs:** On import, assign new unique IDs (`${p.id}_imported_${Date.now()}`) if an ID conflict occurs.
- **Empty Plans on Migration:** Safely fallback to a clean 3-day itinerary if legacy data contains unparseable JSON.
- **Cloud Account Switching:** If a guest subsequently logs in, existing guest plans remain safely preserved in `tb_guest_plans` and can be switched back when logging out.

---

## 5. Verification Plan

### Automated Verification
1. **Lint Check:** Run `npm run lint` to verify zero syntax or linting errors.
2. **Build Check:** Run `npm run build` to verify production bundling succeeds without SSR mismatches.

### Manual Verification
1. **Guest Multi-Plan Creation & Switching:**
   - Open app without logging in.
   - Click "➕ สร้างแผนใหม่", name it "ทริปโอซาก้า", verify it creates without auth prompt.
   - Add places to Day 1 and Day 2.
   - Switch back to the first plan, verify data isolation between plans.
2. **Registration Without Code:**
   - Click "เข้าสู่ระบบ (ซิงค์ Cloud)" -> switch to "สมัครสมาชิก".
   - Verify there is no registration code input.
   - Test sign-up with email and password.
3. **Backup Export & Import:**
   - Click "สำรองข้อมูลทริปทั้งหมด", verify `trip-builder-backup.json` downloads.
   - Inspect JSON contents to ensure all itineraries and custom places are present.
   - In a private/incognito window, open the app and click "นำเข้าข้อมูลทริป".
   - Select the downloaded file, verify all plans and custom places populate instantly.
