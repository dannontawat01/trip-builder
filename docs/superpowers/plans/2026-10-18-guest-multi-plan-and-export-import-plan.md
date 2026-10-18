# Guest Multi-Plan Support & Backup/Restore Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users without an account (guests) to create and manage multiple itinerary plans locally, simplify user registration by removing the secret passcode '8486', and provide a JSON backup/restore feature to transfer all plans and custom landmarks across devices.

**Architecture:** Extend the existing `localStorage` data model with `tb_guest_plans` and `tb_guest_active_plan` while preserving backward compatibility with legacy `trip_builder_itin_v1` via auto-migration on boot. Enable the topbar plan selector for all users, remove the registration code gate, and implement client-side JSON serialization/deserialization for full backup and restore.

**Tech Stack:** Next.js (App Router, v16), React 19, Tailwind CSS v4, Lucide/Unicode icons, Web Storage API (localStorage), FileReader API.

## Global Constraints
- Do not break existing Google Sheets sync for logged-in users.
- Do not break existing public landmark caching or Google Maps walking routes.
- Preserve backward compatibility: existing itineraries in `trip_builder_itin_v1` must not be lost.
- All file reads and JSON operations with `localStorage` must be wrapped in `try...catch`.

---

### Task 1: Guest Multi-Plan State Management & Auto-Migration

**Files:**
- Modify: `src/app/page.js:906-1050` (session checking, plan loading, auto-migration)
- Modify: `src/app/page.js:1270-1430` (`handleCreatePlan`, `handleRenamePlan`, `handleDeletePlan`, `handleSwitchPlan`)
- Modify: `src/app/page.js:1720-1760` (`savePlan` / local persistence)

**Interfaces:**
- Consumes: `localStorage` keys `trip_builder_itin_v1`, `checklist_guest`
- Produces: `tb_guest_plans`, `tb_guest_active_plan`, `loadGuestPlans()`, `saveGuestPlanLocally()`

- [ ] **Step 1: Implement `loadGuestPlans` with legacy auto-migration**
Add `loadGuestPlans()` in `src/app/page.js`:
```javascript
  const loadGuestPlans = () => {
    try {
      let rawPlans = localStorage.getItem('tb_guest_plans');
      let plans = rawPlans ? JSON.parse(rawPlans) : [];

      // Auto-migrate from legacy trip_builder_itin_v1 if tb_guest_plans is empty
      if (!plans || plans.length === 0) {
        const legacyItinRaw = localStorage.getItem('trip_builder_itin_v1');
        if (legacyItinRaw) {
          const parsedLegacy = JSON.parse(legacyItinRaw);
          let legacyChecklist = [];
          try {
            const localCheck = localStorage.getItem('checklist_guest') || localStorage.getItem('trip_builder_checklist_guest');
            if (localCheck) legacyChecklist = JSON.parse(localCheck);
          } catch (_) {}

          const migratedPlan = {
            id: 'guest_plan_1',
            name: activeLang === 'th' ? 'แผนการเดินทาง 1' : 'My Trip 1',
            city_id: activeCity || 'bkk',
            nDays: parsedLegacy.nDays || 3,
            start: parsedLegacy.start || new Date().toISOString().split('T')[0],
            time: parsedLegacy.time || '09:00',
            hotel: parsedLegacy.hotel || '',
            itin: parsedLegacy.itin || { 1: [], 2: [], 3: [] },
            checklist: parsedLegacy.checklist || legacyChecklist
          };
          plans = [migratedPlan];
          localStorage.setItem('tb_guest_plans', JSON.stringify(plans));
          localStorage.setItem('tb_guest_active_plan', 'guest_plan_1');
        }
      }

      // If still empty, create default first plan
      if (!plans || plans.length === 0) {
        const defaultPlan = {
          id: `guest_plan_${Date.now()}`,
          name: activeLang === 'th' ? 'แผนการเดินทาง 1' : 'My Trip 1',
          city_id: activeCity || 'bkk',
          nDays: 3,
          start: new Date().toISOString().split('T')[0],
          time: '09:00',
          hotel: '',
          itin: { 1: [], 2: [], 3: [] },
          checklist: []
        };
        plans = [defaultPlan];
        localStorage.setItem('tb_guest_plans', JSON.stringify(plans));
        localStorage.setItem('tb_guest_active_plan', defaultPlan.id);
      }

      setPlansList(plans);

      const activeId = localStorage.getItem('tb_guest_active_plan') || plans[0].id;
      const currentPlan = plans.find(p => p.id === activeId) || plans[0];

      setActivePlanId(currentPlan.id);
      setItin(currentPlan.itin || { 1: [], 2: [], 3: [] });
      setChecklist(currentPlan.checklist || []);
      setNDays(currentPlan.nDays || 3);
      setStartDate(currentPlan.start || new Date().toISOString().split('T')[0]);
      setStartTime(currentPlan.time || '09:00');
      setHotel(currentPlan.hotel || '');
      if (currentPlan.city_id) {
        setActiveCity(currentPlan.city_id);
        setActiveCountry(getCountryOfCity(currentPlan.city_id));
      }
    } catch (err) {
      console.error('[TripBuilder] loadGuestPlans error:', err);
    }
  };
```

- [ ] **Step 2: Update `checkSession` to call `loadGuestPlans()`**
In `checkSession()` in `src/app/page.js`: replace calls to `loadGuestPlan()` with `loadGuestPlans()`.

- [ ] **Step 3: Update `handleCreatePlan` for guests**
In `handleCreatePlan`: allow guests to create plans without auth blocking:
```javascript
  const handleCreatePlan = async () => {
    const planName = prompt(
      activeLang === 'th' ? 'กรุณากรอกชื่อแผนการเดินทางใหม่:' : 'Enter new itinerary plan name:',
      `${activeLang === 'th' ? 'ทริป' : 'Trip'} ${plansList.length + 1}`
    );
    if (!planName || !planName.trim()) return;

    if (user) {
      if (!googleSheets) {
        // mock user plan creation
        ...
      } else {
        await handleCreatePlanCloud(planName, user.email);
      }
    } else {
      // Guest multi-plan creation
      const newPlanId = `guest_plan_${Date.now()}`;
      const newPlan = {
        id: newPlanId,
        name: planName.trim(),
        city_id: activeCity,
        itin: { 1: [], 2: [], 3: [] },
        checklist: [],
        nDays: 3,
        start: new Date().toISOString().split('T')[0],
        time: '09:00',
        hotel: ''
      };
      const updatedPlans = [newPlan, ...plansList];
      setPlansList(updatedPlans);
      localStorage.setItem('tb_guest_plans', JSON.stringify(updatedPlans));
      localStorage.setItem('tb_guest_active_plan', newPlanId);

      setActivePlanId(newPlanId);
      setItin(newPlan.itin);
      setChecklist(newPlan.checklist);
      setNDays(newPlan.nDays);
      setStartDate(newPlan.start);
      setStartTime(newPlan.time);
      setHotel(newPlan.hotel);
      toast(activeLang === 'th' ? `สร้างแผน "${planName}" สำเร็จ!` : `Plan "${planName}" created!`);
    }
  };
```

- [ ] **Step 4: Update `savePlan` for guests**
In `savePlan` in `src/app/page.js`, update the guest plan in `tb_guest_plans`:
```javascript
  if (!user && activePlanId) {
    try {
      const updatedPlans = plansList.map(p => {
        if (p.id === activePlanId) {
          return {
            ...p,
            itin: newItin,
            nDays: newNDays,
            start: startDate,
            time: startTime,
            hotel: hotel,
            checklist: currentChecklist
          };
        }
        return p;
      });
      setPlansList(updatedPlans);
      localStorage.setItem('tb_guest_plans', JSON.stringify(updatedPlans));
      localStorage.setItem('tb_guest_active_plan', activePlanId);
    } catch (_) {}
  }
```

- [ ] **Step 5: Update `handleRenamePlan` and `handleDeletePlan` for guests**
Ensure both functions update `tb_guest_plans` and `tb_guest_active_plan` when `!user`.

- [ ] **Step 6: Test and Commit**
Run build test: `npm run build`
Commit:
```bash
git add src/app/page.js
git commit -m "feat(plans): add multi-plan support and auto-migration for guest users"
```

---

### Task 2: Topbar Plan Selector for Guests & Auth Button Polish

**Files:**
- Modify: `src/app/page.js:2670-2720` (Topbar header section)

**Interfaces:**
- Consumes: `plansList`, `activePlanId`, `handleSwitchPlan`, `handleCreatePlan`
- Produces: Persistent Plan Selector Dropdown for all users; updated label on cloud sync button.

- [ ] **Step 1: Make Plan Selector Dropdown visible for Guests**
In `src/app/page.js` around line 2600-2700, locate where plan selector dropdown is rendered. Currently it is guarded inside `user ? ( ... ) : ( ... )`.
Refactor the Topbar so that:
- The Plan Selector Dropdown (`plansList`, `activePlanId`, `➕ สร้างแผนใหม่`) is ALWAYS rendered on the left/center of the topbar, regardless of `user`.
- On the right side:
  - If `user`: render avatar badge and user dropdown with "Sign Out".
  - If `!user`: render `[☁️ เข้าสู่ระบบ (ซิงค์ Cloud)]` / `[☁️ Sign In (Cloud Sync)]` button.

- [ ] **Step 2: Test UI rendering and responsive behavior**
Verify that switching cities, creating plans, and renaming plans from the dropdown work seamlessly as a guest.

- [ ] **Step 3: Test and Commit**
Run: `npm run build`
Commit:
```bash
git add src/app/page.js
git commit -m "feat(ui): display plan selector dropdown for guest users in topbar"
```

---

### Task 3: Remove Secret Code (8486) from User Registration

**Files:**
- Modify: `src/app/page.js:464-472` (state declarations)
- Modify: `src/app/page.js:1430-1485` (`handleSignUp` validation)
- Modify: `src/app/page.js:4330-4360` (Auth Modal registration fields)

**Interfaces:**
- Consumes: `authEmail`, `authPassword`
- Produces: Unrestricted email + password sign up

- [ ] **Step 1: Remove passcode validation from `handleSignUp`**
Remove:
```javascript
if (authRegisterCode.trim() !== '8486') {
  toast(activeLang === 'th' ? 'รหัสการสมัครไม่ถูกต้อง!' : 'Invalid registration code!');
  return;
}
```

- [ ] **Step 2: Remove registration passcode input field from Auth Modal**
In the Auth Modal UI (`authMode === 'register'`), delete the input group for `authRegisterCode` (label: "รหัสการสมัคร (Register Code) 8486").

- [ ] **Step 3: Remove `authRegisterCode` state references**
Clean up `authRegisterCode` state initialization and resets across `handleSignUp` and modal close.

- [ ] **Step 4: Test and Commit**
Run: `npm run build`
Commit:
```bash
git add src/app/page.js
git commit -m "feat(auth): remove secret passcode restriction from registration"
```

---

### Task 4: Full Backup & Restore (Export & Import JSON)

**Files:**
- Modify: `src/app/page.js:2420-2530` (Export/import handlers)
- Modify: `src/app/page.js:4090-4135` (Export modal UI)

**Interfaces:**
- Consumes: `plansList`, `customPlaces`, `activeCity`
- Produces: `handleExportBackup()`, `handleImportBackup(e)`

- [ ] **Step 1: Implement `handleExportBackup`**
```javascript
  const handleExportBackup = () => {
    try {
      const backupData = {
        app: 'trip-builder',
        version: 1,
        exportedAt: new Date().toISOString(),
        plans: plansList,
        customPlaces: customPlaces
      };
      const jsonString = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trip-builder-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast(activeLang === 'th' ? '✅ ดาวน์โหลดไฟล์สำรองข้อมูลสำเร็จ!' : '✅ Backup downloaded successfully!');
    } catch (err) {
      toast(activeLang === 'th' ? 'สำรองข้อมูลล้มเหลว' : 'Backup export failed');
    }
  };
```

- [ ] **Step 2: Implement `handleImportBackup`**
```javascript
  const handleImportBackup = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        const data = JSON.parse(content);

        if (!data || (!data.plans && !data.customPlaces)) {
          toast(activeLang === 'th' ? '❌ ไฟล์สำรองข้อมูลไม่ถูกต้อง' : '❌ Invalid backup file');
          return;
        }

        let importedPlansCount = 0;
        let importedPlacesCount = 0;

        // 1. Merge or restore custom places
        if (data.customPlaces && typeof data.customPlaces === 'object') {
          const mergedCustom = { ...customPlaces };
          Object.keys(data.customPlaces).forEach(city => {
            if (!mergedCustom[city]) mergedCustom[city] = [];
            const existingIds = new Set(mergedCustom[city].map(p => String(p.id)));
            data.customPlaces[city].forEach(p => {
              if (!existingIds.has(String(p.id))) {
                mergedCustom[city].push(p);
                importedPlacesCount++;
              }
            });
          });
          setCustomPlaces(mergedCustom);
          localStorage.setItem('trip_builder_custom_places_v1', JSON.stringify({ custom: mergedCustom }));
        }

        // 2. Restore plans
        if (Array.isArray(data.plans) && data.plans.length > 0) {
          const existingIds = new Set(plansList.map(p => p.id));
          const newPlans = data.plans.map(p => {
            if (existingIds.has(p.id)) {
              return { ...p, id: `plan_imported_${Date.now()}_${Math.random().toString(36).substr(2, 4)}` };
            }
            return p;
          });
          const mergedPlans = [...newPlans, ...plansList];
          setPlansList(mergedPlans);
          importedPlansCount = newPlans.length;

          // Switch to first imported plan
          const firstPlan = newPlans[0];
          setActivePlanId(firstPlan.id);
          setItin(firstPlan.itin || { 1: [], 2: [], 3: [] });
          setChecklist(firstPlan.checklist || []);
          setNDays(firstPlan.nDays || 3);
          setStartDate(firstPlan.start || new Date().toISOString().split('T')[0]);
          setStartTime(firstPlan.time || '09:00');
          setHotel(firstPlan.hotel || '');
          if (firstPlan.city_id) {
            setActiveCity(firstPlan.city_id);
            setActiveCountry(getCountryOfCity(firstPlan.city_id));
          }

          if (!user) {
            localStorage.setItem('tb_guest_plans', JSON.stringify(mergedPlans));
            localStorage.setItem('tb_guest_active_plan', firstPlan.id);
          } else {
            localStorage.setItem(`tb_mock_plans_${user.email}`, JSON.stringify(mergedPlans));
            localStorage.setItem(`tb_mock_active_plan_${user.email}`, firstPlan.id);
          }
        }

        toast(
          activeLang === 'th'
            ? `✅ นำเข้าข้อมูลสำเร็จ! (${importedPlansCount} แผน, ${importedPlacesCount} สถานที่)`
            : `✅ Imported successfully! (${importedPlansCount} plans, ${importedPlacesCount} places)`
        );
      } catch (err) {
        console.error('[TripBuilder] Import failed:', err);
        toast(activeLang === 'th' ? '❌ ไม่สามารถอ่านไฟล์สำรองได้' : '❌ Failed to read backup file');
      } finally {
        event.target.value = '';
      }
    };
    reader.readAsText(file);
  };
```

- [ ] **Step 3: Add UI buttons in the Export Modal**
In the Export Modal (`exportModalOpen`):
- Add a new section **"💾 สำรองและกู้คืนข้อมูล (Backup & Restore)"**
- Add button `[📥 สำรองข้อมูลทริปและสถานที่ทั้งหมด (JSON)]` calling `handleExportBackup`
- Add button `[📤 นำเข้าข้อมูลจากไฟล์สำรอง]` triggering hidden `<input type="file" accept=".json" onChange={handleImportBackup} />`

- [ ] **Step 4: Test and Commit**
Run: `npm run build`
Commit:
```bash
git add src/app/page.js
git commit -m "feat(export): add full JSON backup export and restore functionality"
```

---

### Task 5: System Verification & Linting

**Files:**
- Entire codebase

- [ ] **Step 1: Run linter**
Execute: `npm run lint`
Expected: 0 errors.

- [ ] **Step 2: Run production build**
Execute: `npm run build`
Expected: Successful build with zero errors.

- [ ] **Step 3: Verification Checkpoints**
- Test guest plan creation and switching in local browser.
- Test JSON backup download and inspect payload.
- Test JSON restore in incognito/separate browser profile.
- Test registration modal without passcode 8486.
