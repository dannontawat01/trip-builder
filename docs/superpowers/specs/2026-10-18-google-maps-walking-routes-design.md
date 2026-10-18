# Design Spec: Google Maps Walking Route Sharing & Export

- **Date:** 2026-10-18
- **Topic:** Google Maps Walking Route Sharing & Navigation
- **Status:** Approved by User

---

## 1. Goal & Overview

เพิ่มความสามารถในการแปลงแผนการเดินทางในแต่ละวัน (Itinerary by Day) ให้เป็นลิงก์นำทางเดินเท้า (Walking Directions) ผ่าน **Google Maps Universal URL**
ช่วยให้นักท่องเที่ยวสามารถ:
1. กดเปิด Google Maps จากหัวการ์ดของแต่ละวัน (Day Column Header) เพื่อนำทางเดินเท้าจริง Stop-by-Stop ทันที
2. กดแชร์หรือคัดลอกลิงก์เส้นทางเดินของวันนั้นๆ เพื่อส่งต่อให้เพื่อนร่วมทริป (รองรับทั้ง Web Share API และ Clipboard Copy)
3. ดูและคัดลอกลิงก์เส้นทางเดินของทุกวันได้ในหน้าต่าง "ส่งออก / แชร์" (Export Modal)

---

## 2. Technical Architecture & URL Construction

### 2.1 Google Maps Universal URL Scheme
ใช้รูปแบบมาตรฐานทางการของ Google Maps:
```
https://www.google.com/maps/dir/?api=1&origin={lat},{lng}&destination={lat},{lng}&waypoints={waypoint1}|{waypoint2}&travelmode=walking
```

### 2.2 Helper Function: `getGmapsWalkingRouteUrl(items, activeLang = 'th')`
- **กรณี 0 สถานที่ (`items.length === 0`):**
  - คืนค่า `null`
- **กรณี 1 สถานที่ (`items.length === 1`):**
  - เปิดหมุดสถานที่เดี่ยว:
    ```
    https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeName)}+${lat},${lng}
    ```
- **กรณี 2 สถานที่ขึ้นไป (`items.length >= 2`):**
  - กรองเฉพาะสถานที่ที่มี `lat` และ `lng`
  - `origin`: `${firstPlace.lat},${firstPlace.lng}`
  - `destination`: `${lastPlace.lat},${lastPlace.lng}`
  - `waypoints`: สถานที่ระหว่างกลาง `items.slice(1, -1)` โดยเชื่อมด้วย `|`:
    ```
    const waypoints = intermediatePlaces.map(p => `${p.lat},${p.lng}`).join('|');
    ```
  - พารามิเตอร์: `travelmode=walking`
  - ผลลัพธ์:
    ```
    https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypoints ? `&waypoints=${waypoints}` : ''}&travelmode=walking
    ```

---

## 3. UI & User Interactions

### 3.1 หัวการ์ดของแต่ละวัน (Day Column Header)
- แสดงปุ่มกลุ่มนำทางเดินเท้า:
  1. **ปุ่ม "🚶 Maps":**
     - คลิกเพื่อเปิดลิงก์เส้นทางเดินในแท็บใหม่ (`target="_blank"`)
     - หากไม่มีสถานที่ในวันนั้น ปุ่มจะถูกปิดการใช้งาน (`disabled`) พร้อม tooltip แจ้งเตือน
  2. **ปุ่ม "แชร์ / คัดลอกลิงก์" (ไอคอน 🔗 / 📤):**
     - เมื่อคลิกบนอุปกรณ์ที่รองรับ `navigator.share` (เช่น สมาร์ตโฟน) จะเปิด Native Share Sheet ให้ส่งเข้าแอปแชตได้โดยตรง
     - หากไม่รองรับ จะคัดลอกลิงก์ลง Clipboard และแสดง Toast แจ้งเตือน (เช่น "คัดลอกลิงก์เส้นทางเดินวันที่ 1 แล้ว!")

### 3.2 หน้าต่าง "ส่งออก / แชร์" (Export Modal)
- เพิ่มส่วนใหม่ใน Modal: **"🗺️ เส้นทางเดิน Google Maps (Walking Routes)"**
- แสดงรายการแบบแยกแต่ละวัน (Day 1, Day 2, ...):
  - แสดงป้ายกำกับวัน, จำนวนสถานที่, และลำดับเส้นทางย่อ (เช่น "วัดพระแก้ว ➔ ท่าเตียน ➔ วัดอรุณ")
  - ปุ่ม **"เปิด Maps ↗"** เปิดเส้นทางเดินทันที
  - ปุ่ม **"คัดลอก"** คัดลอกเฉพาะลิงก์ Google Maps ของวันนั้น
- เพิ่มปุ่มคัดลอกลิงก์เส้นทางเดินทุกวันแบบสรุปเป็นข้อความ

---

## 4. Internationalization (i18n)

เพิ่มคำแปลใน `LANG_STRINGS`:
- `th`:
  - `walkMaps`: '🚶 เส้นทางเดิน'
  - `shareWalkRoute`: 'แชร์เส้นทางเดิน'
  - `walkRouteCopied`: 'คัดลอกลิงก์เส้นทางเดินแล้ว!'
  - `noPlacesForRoute`: 'กรุณาเพิ่มสถานที่ในวันก่อนเปิดเส้นทาง'
  - `exportWalkTitle`: '🗺️ เส้นทางเดิน Google Maps (แยกตามวัน)'
  - `stopsCount`: 'จุดแวะ'
- `en`:
  - `walkMaps`: '🚶 Walking Route'
  - `shareWalkRoute`: 'Share Route'
  - `walkRouteCopied`: 'Walking route link copied!'
  - `noPlacesForRoute`: 'Add places to this day first'
  - `exportWalkTitle`: '🗺️ Google Maps Walking Routes (By Day)'
  - `stopsCount`: 'stops'

---

## 5. Error Handling & Edge Cases

1. **สถานที่ไม่มีพิกัด lat/lng:**
   - ข้ามสถานที่ที่ไม่มีพิกัดที่ถูกต้อง หรือกรองเฉพาะจุดที่มีพิกัดตัวเลข
2. **วันที่มีสถานที่มากกว่า 10 แห่ง:**
   - Google Maps Universal Directions URL รองรับ waypoints ได้ประมาณ 9-10 จุด หากเกิน ระบบจะตัดรอบ waypoints ที่เกินออกเพื่อไม่ให้ URL พัง
3. **การเข้าถึง Clipboard หรือ Web Share:**
   - ใช้ `try...catch` ครอบการเรียก `navigator.share` และ `navigator.clipboard.writeText` เพื่อป้องกัน Permission denied
