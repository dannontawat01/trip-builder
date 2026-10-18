# Language Preference
- Always communicate, explain, and respond in Thai.

# Version Management & Release Rules
- ทุกครั้งที่มีการแก้ไขโค้ด, เพิ่มฟีเจอร์ หรือ Deploy อัปเดตขึ้นสู่ Production จะต้องปรับเปลี่ยน/เพิ่มเลขเวอร์ชัน (Version Bump) เสมอ ทั้งใน `package.json` และตัวแปร `APP_VERSION` ใน `src/app/page.js` เพื่อให้ผู้ใช้สามารถตรวจสอบเวอร์ชันล่าสุดบนหน้าเว็บได้ทันที
