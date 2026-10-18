# Google Maps Walking Route Sharing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** เพิ่มฟังก์ชันสร้างและแชร์ลิงก์เส้นทางเดินเท้า (Walking Directions) ใน Google Maps แบบแยกรายวัน พร้อมปุ่มกดเปิด/แชร์ที่หัวการ์ดแต่ละวัน และในหน้าต่าง Export Modal

**Architecture:** แยกตรรกะการสร้าง Google Maps Universal URL และ Web Share/Clipboard ออกเป็นโมดูลอิสระ `src/lib/gmapsRoute.js` เพื่อให้ทดสอบได้ง่าย (Unit Testable) แล้วนำไปเชื่อมต่อเข้ากับส่วนแสดงผลหัวการ์ดวัน (`day-hd`) และหน้าต่างส่งออกแผน (`Export Modal`) ใน `src/app/page.js`

**Tech Stack:** Next.js (App Router), React 19, Google Maps Universal URL API, Node.js Native Test Runner (`node:test`, `node:assert`)

## Global Constraints

- ใช้รูปแบบ Google Maps Universal URL Scheme: `https://www.google.com/maps/dir/?api=1&origin={lat},{lng}&destination={lat},{lng}&waypoints={waypoints}&travelmode=walking`
- รักษาความเข้ากันได้ทั้งบนมือถือ (iOS / Android Google Maps App) และเดสก์ท็อปบราวเซอร์
- ข้อความและปุ่มต้องรองรับทั้งภาษาไทย (`th`) และภาษาอังกฤษ (`en`) ใน `LANG_STRINGS`
- ทุกฟังก์ชันต้องมี Error handling และไม่ทำให้หน้าเว็บแครชเมื่อพิกัดหรือข้อมูลไม่สมบูรณ์

---

### Task 1: สร้าง Helper Module `src/lib/gmapsRoute.js` พร้อม Unit Tests

**Files:**
- Create: `src/lib/gmapsRoute.js`
- Create: `tests/gmapsRoute.test.mjs`

**Interfaces:**
- Produces:
  - `getGmapsWalkingRouteUrl(items: Array<{ lat: number|string, lng: number|string, name?: string }>): string | null`
  - `shareGmapsRoute({ url: string, title?: string, text?: string, onToast?: (msg: string) => void }): Promise<boolean>`

- [ ] **Step 1: เขียน Unit Test สำหรับการสร้าง URL เส้นทางเดิน**

สร้างไฟล์ `tests/gmapsRoute.test.mjs`:
```javascript
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { getGmapsWalkingRouteUrl } from '../src/lib/gmapsRoute.js';

describe('getGmapsWalkingRouteUrl', () => {
  test('returns null when items is empty or invalid', () => {
    assert.equal(getGmapsWalkingRouteUrl([]), null);
    assert.equal(getGmapsWalkingRouteUrl(null), null);
    assert.equal(getGmapsWalkingRouteUrl([{ name: 'No coords' }]), null);
  });

  test('returns single search URL when only 1 valid place exists', () => {
    const single = [{ name: 'วัดพระแก้ว', lat: 13.7516, lng: 100.4927 }];
    const url = getGmapsWalkingRouteUrl(single);
    assert.ok(url.startsWith('https://www.google.com/maps/search/?api=1'));
    assert.ok(url.includes('13.7516,100.4927'));
  });

  test('returns walking directions URL for 2 places', () => {
    const items = [
      { name: 'วัดพระแก้ว', lat: 13.7516, lng: 100.4927 },
      { name: 'วัดโพธิ์', lat: 13.7466, lng: 100.4933 }
    ];
    const url = getGmapsWalkingRouteUrl(items);
    assert.ok(url.startsWith('https://www.google.com/maps/dir/?api=1'));
    assert.ok(url.includes('origin=13.7516,100.4927'));
    assert.ok(url.includes('destination=13.7466,100.4933'));
    assert.ok(url.includes('travelmode=walking'));
    assert.ok(!url.includes('waypoints='));
  });

  test('returns walking directions URL with waypoints for 3+ places', () => {
    const items = [
      { name: 'Stop 1', lat: 13.75, lng: 100.49 },
      { name: 'Stop 2', lat: 13.74, lng: 100.50 },
      { name: 'Stop 3', lat: 13.73, lng: 100.51 }
    ];
    const url = getGmapsWalkingRouteUrl(items);
    assert.ok(url.includes('origin=13.75,100.49'));
    assert.ok(url.includes('waypoints=13.74,100.5'));
    assert.ok(url.includes('destination=13.73,100.51'));
    assert.ok(url.includes('travelmode=walking'));
  });
});
```

- [ ] **Step 2: รัน Unit Test เพื่อยืนยันว่า fail (ยังไม่มีไฟล์ implementation)**

Run: `node --test tests/gmapsRoute.test.mjs`
Expected: Error: Cannot find module '../src/lib/gmapsRoute.js'

- [ ] **Step 3: สร้างโค้ด implementation ใน `src/lib/gmapsRoute.js`**

เขียนไฟล์ `src/lib/gmapsRoute.js`:
```javascript
/**
 * Helper to build Google Maps walking route URL
 * @param {Array<{ lat: number|string, lng: number|string, name?: string, names?: object }>} items
 * @param {string} [lang='th']
 * @returns {string|null}
 */
export function getGmapsWalkingRouteUrl(items, lang = 'th') {
  if (!Array.isArray(items) || items.length === 0) return null;

  // Filter items with valid numeric coordinates
  const valid = items.filter(item => {
    if (!item) return false;
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lng);
    return !isNaN(lat) && !isNaN(lng);
  });

  if (valid.length === 0) return null;

  if (valid.length === 1) {
    const place = valid[0];
    const placeName = (place.names && place.names[lang]) || place.name || '';
    const query = placeName ? `${placeName} ${place.lat},${place.lng}` : `${place.lat},${place.lng}`;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }

  const origin = `${valid[0].lat},${valid[0].lng}`;
  const destination = `${valid[valid.length - 1].lat},${valid[valid.length - 1].lng}`;

  // Intermediate stops (waypoints) - Google Maps Universal Directions URL supports up to 9 waypoints
  const intermediate = valid.slice(1, -1).slice(0, 9);
  const waypoints = intermediate.map(p => `${p.lat},${p.lng}`).join('|');

  let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;
  if (waypoints) {
    url += `&waypoints=${encodeURIComponent(waypoints)}`;
  }
  url += '&travelmode=walking';

  return url;
}

/**
 * Share or copy walking route URL
 * @param {{ url: string, title?: string, text?: string, onToast?: (msg: string) => void, copiedMsg?: string }} options
 */
export async function shareGmapsRoute({ url, title = 'Walking Route', text = 'เส้นทางเดิน Google Maps', onToast, copiedMsg = 'คัดลอกลิงก์เส้นทางแล้ว!' }) {
  if (!url) return false;

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title,
        text,
        url,
      });
      return true;
    } catch (err) {
      if (err.name === 'AbortError') return false;
      // Fallback to clipboard if share failed
    }
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(url);
      if (onToast) onToast(copiedMsg);
      return true;
    } catch (_) {
      return false;
    }
  }

  return false;
}
```

- [ ] **Step 4: รัน Unit Test เพื่อยืนยันว่าผ่าน (PASS)**

Run: `node --test tests/gmapsRoute.test.mjs`
Expected: Tests pass (4/4 pass)

- [ ] **Step 5: บันทึก Git Commit**

```bash
git add src/lib/gmapsRoute.js tests/gmapsRoute.test.mjs
git commit -m "feat: add Google Maps walking route helper and tests"
```

---

### Task 2: เพิ่มปุ่มเส้นทางเดินและแชร์บนหัวการ์ดของแต่ละวัน (Day Header)

**Files:**
- Modify: `src/app/page.js:13-115` (Add i18n translations)
- Modify: `src/app/page.js:3030-3070` (Add route action buttons in `day-hd`)

**Interfaces:**
- Consumes: `getGmapsWalkingRouteUrl`, `shareGmapsRoute` from `@/lib/gmapsRoute`

- [ ] **Step 1: เพิ่มคำแปลใน `LANG_STRINGS` (`th` และ `en`) ใน `src/app/page.js`**

```javascript
// ใน th:
walkMaps: '🚶 เส้นทางเดิน',
shareWalkRoute: 'แชร์เส้นทางเดิน',
walkRouteCopied: 'คัดลอกลิงก์เส้นทางเดินแล้ว!',
noPlacesForRoute: 'ยังไม่มีสถานที่ในวันนี้',
exportWalkTitle: '🗺️ เส้นทางเดิน Google Maps (แยกตามวัน)',
stopsCount: 'จุดแวะ',
openWalkMaps: 'เปิด Maps ↗',
copyWalkLink: 'คัดลอกลิงก์',

// ใน en:
walkMaps: '🚶 Walking Route',
shareWalkRoute: 'Share Route',
walkRouteCopied: 'Walking route link copied!',
noPlacesForRoute: 'No places in this day yet',
exportWalkTitle: '🗺️ Google Maps Walking Routes (By Day)',
stopsCount: 'stops',
openWalkMaps: 'Open Maps ↗',
copyWalkLink: 'Copy Link',
```

- [ ] **Step 2: เพิ่ม Import และ Component ปุ่มใน `day-hd` ของแต่ละวัน**

ใน `day-hd` เพิ่มปุ่มสำหรับเปิด Google Maps และปุ่มแชร์:
```jsx
{(() => {
  const walkUrl = getGmapsWalkingRouteUrl(items, activeLang);
  const hasItems = items.length > 0;
  return (
    <div className="day-route-actions" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginLeft: 'auto' }}>
      <button
        className="day-walk-btn"
        disabled={!hasItems}
        onClick={() => {
          if (!walkUrl) {
            toast(t('noPlacesForRoute'));
            return;
          }
          window.open(walkUrl, '_blank', 'noopener,noreferrer');
        }}
        title={hasItems ? (activeLang === 'th' ? `เปิดเส้นทางเดินวันที่ ${day} ใน Google Maps` : `Open Day ${day} walking route in Google Maps`) : t('noPlacesForRoute')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '11px',
          fontWeight: '600',
          background: hasItems ? 'var(--teal-light, #E1F5EE)' : 'rgba(0,0,0,0.05)',
          color: hasItems ? 'var(--teal, #0F6E56)' : 'var(--muted, #888)',
          border: '1px solid ' + (hasItems ? 'rgba(29, 158, 117, 0.3)' : 'transparent'),
          cursor: hasItems ? 'pointer' : 'not-allowed',
          transition: 'all 0.15s ease'
        }}
      >
        <span>🚶</span>
        <span>Maps</span>
      </button>
      <button
        className="day-share-btn"
        disabled={!hasItems}
        onClick={async () => {
          if (!walkUrl) {
            toast(t('noPlacesForRoute'));
            return;
          }
          await shareGmapsRoute({
            url: walkUrl,
            title: `${t('dayLabel')} ${day} - ${t('walkMaps')}`,
            text: `${t('dayLabel')} ${day}: ${items.map(p => (p.names && p.names[activeLang]) || p.name).join(' ➔ ')}`,
            onToast: toast,
            copiedMsg: t('walkRouteCopied')
          });
        }}
        title={t('shareWalkRoute')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '22px',
          height: '22px',
          borderRadius: '50%',
          fontSize: '11px',
          background: hasItems ? 'var(--surface, #ffffff)' : 'transparent',
          border: '1px solid ' + (hasItems ? 'var(--border, #e5e7eb)' : 'transparent'),
          color: hasItems ? 'var(--fg, #333)' : 'var(--muted, #aaa)',
          cursor: hasItems ? 'pointer' : 'not-allowed',
          boxShadow: hasItems ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
        }}
      >
        🔗
      </button>
    </div>
  );
})()}
```

- [ ] **Step 3: ทดสอบการทำงานเบื้องต้นด้วย lint และ build**

Run: `npm run lint`
Expected: PASS

- [ ] **Step 4: บันทึก Git Commit**

```bash
git add src/app/page.js
git commit -m "feat: add Google Maps walking route buttons to Day Header"
```

---

### Task 3: เพิ่มส่วนเส้นทางเดิน Google Maps ในหน้าต่าง Export Modal

**Files:**
- Modify: `src/app/page.js:4090-4125` (Inside Export Modal)

**Interfaces:**
- Consumes: `getGmapsWalkingRouteUrl`, `shareGmapsRoute`

- [ ] **Step 1: เพิ่ม UI Card แสดงเส้นทางเดินแยกแต่ละวันใน Export Modal**

ใน Modal Body ของ Export Modal (ก่อนหรือหลังส่วน Share Link) เพิ่มบล็อก:
```jsx
<div className="form-group" style={{ marginTop: '16px' }}>
  <div className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
    <span>{t('exportWalkTitle')}</span>
  </div>
  <div className="export-walk-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
    {Array(nDays).fill(0).map((_, i) => {
      const day = i + 1;
      const dayItems = itin[day] || [];
      const walkUrl = getGmapsWalkingRouteUrl(dayItems, activeLang);
      const hasPlaces = dayItems.length > 0;
      const routeSummary = dayItems.map(p => (p.names && p.names[activeLang]) || p.name).join(' ➔ ');

      return (
        <div
          key={day}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            borderRadius: '8px',
            background: 'var(--surface-alt, #f8f9fa)',
            border: '1px solid var(--border, #e5e7eb)',
            fontSize: '12px'
          }}
        >
          <div style={{ flex: 1, minWidth: 0, marginRight: '8px' }}>
            <div style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>{t('dayLabel')} {day}</span>
              <span style={{ fontSize: '11px', color: 'var(--muted, #666)', fontWeight: 'normal' }}>
                ({dayItems.length} {t('stopsCount')})
              </span>
            </div>
            {hasPlaces ? (
              <div style={{ fontSize: '11px', color: 'var(--muted, #777)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>
                {routeSummary}
              </div>
            ) : (
              <div style={{ fontSize: '11px', color: 'var(--muted, #999)', fontStyle: 'italic', marginTop: '2px' }}>
                {t('noPlacesForRoute')}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
            <button
              className="btn btn-ghost btn-xs"
              disabled={!hasPlaces}
              onClick={() => {
                if (walkUrl) window.open(walkUrl, '_blank', 'noopener,noreferrer');
              }}
              style={{ padding: '3px 8px', fontSize: '11px' }}
            >
              {t('openWalkMaps')}
            </button>
            <button
              className="btn btn-primary btn-xs"
              disabled={!hasPlaces}
              onClick={async () => {
                if (!walkUrl) return;
                await shareGmapsRoute({
                  url: walkUrl,
                  title: `${t('dayLabel')} ${day} - Walking Route`,
                  text: routeSummary,
                  onToast: toast,
                  copiedMsg: t('walkRouteCopied')
                });
              }}
              style={{ padding: '3px 8px', fontSize: '11px' }}
            >
              {t('copyWalkLink')}
            </button>
          </div>
        </div>
      );
    })}
  </div>
</div>
```

- [ ] **Step 2: บันทึก Git Commit**

```bash
git add src/app/page.js
git commit -m "feat: add walking routes section to Export Modal"
```

---

### Task 4: ตรวจสอบและทดสอบระบบทั้งหมด (Verification & Build)

**Files:**
- Test files and all touched source code

- [ ] **Step 1: รัน Unit Test**

Run: `node --test tests/gmapsRoute.test.mjs`
Expected: 4 tests pass

- [ ] **Step 2: รัน Lint**

Run: `npm run lint`
Expected: 0 errors

- [ ] **Step 3: รัน Next.js Build**

Run: `npm run build`
Expected: Build succeeds with 0 errors
