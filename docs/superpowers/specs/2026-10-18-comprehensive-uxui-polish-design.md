# Comprehensive UX/UI Polish & Workflow Enhancement Specification

**Date:** 2026-10-18  
**Topic:** Comprehensive UX/UI Polish, Visual Elegance, and Planning Flow Enhancement  
**Status:** In Review  
**Target Version:** v1.10.8  

---

## 1. Executive Summary & Goals
ยกระดับประสบการณ์ผู้ใช้งาน (UX) และความสวยงามทันสมัย (UI) ของ **Trip Builder** อย่างรอบด้าน โดยมุ่งเน้น 4 เสาหลัก:
1. **Trip Control Bar & KPI Deck:** ปรับแถบตั้งค่าทริป (`.trip-bar`) และสถิติภาพรวม (`.summary-bar`) ให้เป็น Trip Control Deck แบบ Glassmorphism ที่สะอาดตา ทันสมัย และอ่านค่าง่าย
2. **Attraction Cards & Search Experience:** ปรับการค้นหาสถานที่ใน Sidebar ให้มีปุ่มเคลียร์ `✕`, ตัวนับจำนวนสถานที่, Empty State ที่เป็นมิตรพร้อม Action ชัดเจน และปรับการ์ดสถานที่ (`.lm-card`) ให้คลิกดูรายละเอียดได้สะดวก พร้อมปุ่มด่วน "+ เพิ่มลงวัน" และระบุชัดเจนว่าสถานที่นี้อยู่ใน "วันไหน" ของแผนแล้ว
3. **Itinerary Timeline & Reordering Flow:** ยกเครื่องไทม์ไลน์ในแต่ละวัน (`.day-col`, `.itin-item`, `.it-conn`) ให้แสดงผลการเดินทางเชื่อมต่อแบบ Visual Timeline Node ที่ดูน่าดึงดูด, ปรับปุ่มย้าย/เลื่อนลำดับ (`▲` `▼`) ให้สัมผัสง่ายบนมือถือ, และปรับ Empty Day State ให้มีปุ่มชวนเพิ่มสถานที่
4. **Consistency & Accessibility:** ปรับแต่ง Micro-interactions, Touch Target (>= 40px), และสี Contrast ให้เข้ากันได้ทั้งธีม Clean, Dark, และ Colorful

---

## 2. Core Functional & UI Specifications

### 2.1 Trip Control Deck & Summary KPI Bar
* **Trip Control Bar (`.trip-bar`):**
  - เปลี่ยนจาก Input เรียบๆ เป็น Card Control Groups ที่มีไอคอนสื่อความหมายชัดเจน:
    - 📅 **วันเดินทาง:** กรุ๊ปคู่ `[ วันที่เริ่ม ]` → `[ วันที่สิ้นสุด ]`
    - ⏰ **เวลาออกเดินทาง:** `[ เวลา เช่น 09:00 ]`
    - 🏨 **โรงแรม/ที่พัก:** `[ ช่องกรอกชื่อโรงแรม ]` พร้อมไอคอนหมุดที่พัก
    - 🔢 **ระยะเวลา:** `[ X วัน ]` Dropdown
  - ปุ่ม **AI Auto-Plan (`.ai-plan-btn`):** เพิ่ม Shimmer Gradient Effect และ Icon Sparkle `✦` ให้สะดุดตา
* **Summary KPI Bar (`.summary-bar`):**
  - ปรับการแสดงผลเป็น 4 KPI Chips/Cards ขนาดกะทัดรัด พร้อมไอคอนและสีระบุบริบท:
    - 📍 `X สถานที่` (Total Places)
    - ⏱ `Y ชม.` (Estimated Total Duration)
    - 🗓 `Z วัน` (Active Days)
    - 🏙 `เมือง: ...` (Covered Cities)

### 2.2 Attraction Cards & Search Experience
* **Search Bar & Empty States:**
  - เพิ่มปุ่ม Clear `✕` เมื่อเริ่มพิมพ์คำค้นหา
  - แสดงสถานะจำนวนผลลัพธ์ เช่น `พบ 12 แห่ง` หรือ `ทั้งหมด 24 แห่ง`
  - หากค้นหาไม่พบ (0 results) แทนที่จะแสดงแค่ขีด `—` ให้แสดง Empty Search Card:
    - ไอคอน 🔍 พร้อมข้อความ `ไม่พบสถานที่ที่ตรงกับคำค้นหา`
    - ปุ่ม **"ล้างคำค้นหา"** (Clear Search)
    - ปุ่ม **"+ เพิ่มสถานที่ใหม่"** (เปิด Add Place Modal)
* **Landmark Card Interactions (`.lm-card`):**
  - **คลิกการ์ดเพื่อดูรายละเอียด:** แตะที่การ์ดเพื่อเปิด `DetailModal` (รูปใหญ่, คำอธิบาย, พิกัด, ลิงก์ Maps) ช่วยให้ผู้ใช้สำรวจสถานที่ได้ง่าย ไม่โดน Popover บัง
  - **ปุ่ม "+ เพิ่มลงแผน":** มีปุ่มเฉพาะบนการ์ดที่กดแล้วเปิด Day Picker Popover เพื่อเลือกวัน 1-7
  - **Day Badge ในแผน:** แทนที่จะแสดงแค่ `เลือกแล้ว 1 ครั้ง` ให้แสดงว่าสถานที่นี้อยู่ในวันไหน เช่น `📍 วันที่ 1` หรือ `📍 วันที่ 1, วันที่ 3` พร้อมสีประจำวัน (Day Color)

### 2.3 Itinerary Timeline & Reordering Flow
* **Visual Route Connector (`.it-conn`):**
  - ดีไซน์ให้เป็น Timeline Node ที่มีเส้นประแนวตั้งสวยงาม
  - ชิปเวลาเดินทางตรงกลาง: เช่น `🚗 15 นาที` หรือ `🚶 10 นาที` พร้อมไอคอนคมชัด
* **Itinerary Place Card (`.itin-item`):**
  - แถบเวลาหัวการ์ด: `09:00 - 10:30` (90 นาที) พร้อมปุ่มปรับเวลาด่วน
  - ปุ่มเลื่อนลำดับ (`▲` `▼`): สัมผัสง่าย มีระยะห่างที่พอดี ป้องกันการกดผิด
  - ปุ่มย้ายวัน (`📅`): Popover สีสันประจำวัน ย้ายวันได้ในคลิกเดียว
* **Empty Day State (`.zone-empty`):**
  - ดีไซน์เส้นประขอบมน (Dashed Border) สไตล์ Onboarding
  - ข้อความ: `ยังไม่มีแผนสำหรับวันนี้`
  - ปุ่มด่วน 2 ปุ่ม:
    - `📍 เลือกสถานที่` (สลับไปแผงสถานที่)
    - `✦ AI ช่วยจัดวันนี้` (เปิด AI Plan)

---

## 3. Visual & Responsive Design
* **Mobile (< 768px):** แถบนำทาง 5 แท็บด้านล่างเข้าถึงง่าย, การ์ดสถานที่ในแผงซ้ายจัดเต็มความกว้างจอ, ปุ่มสัมผัสรองรับ Touch >= 40px
* **Tablet (768px - 1024px / 1280px):** รองรับระบบ Off-canvas Drawers และปุ่มควบคุมทริปแบบ 2x2 Grid สมดุล
* **Desktop (> 1024px):** จัดเรียง 3 คอลัมน์กว้างขวาง สบายตา พื้นหลัง Ambient และ Glassmorphism นุ่มนวล

---

## 4. Verification & Testing
1. ตรวจสอบการค้นหาและปุ่มล้างคำค้นหาใน Sidebar
2. ตรวจสอบการกดดูรายละเอียดสถานที่ และการกดปุ่มเพิ่มลงวัน
3. ตรวจสอบการแสดง Badge วันที่สถานที่นั้นถูกจัดลงแผน
4. ตรวจสอบการสลับลำดับสถานที่ (ขึ้น/ลง) และการย้ายวัน
5. ตรวจสอบความถูกต้องของการคำนวณเวลาและการเดินทางบนไทม์ไลน์
6. รันการทดสอบ Unit Tests (`tests/gmapsRoute.test.mjs`) และคำสั่ง `npm run build`
