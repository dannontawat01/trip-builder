# Language Preference
- Always communicate, explain, and respond in Thai.

# Version Management & Release Rules
- ทุกครั้งที่มีการแก้ไขโค้ด, เพิ่มฟีเจอร์ หรือ Deploy อัปเดตขึ้นสู่ Production จะต้องปรับเปลี่ยน/เพิ่มเลขเวอร์ชัน (Version Bump) เสมอ ทั้งใน `package.json` และตัวแปร `APP_VERSION` ใน `src/app/page.js` เพื่อให้ผู้ใช้สามารถตรวจสอบเวอร์ชันล่าสุดบนหน้าเว็บได้ทันที

# Development Commands
- `npm run dev` — start dev server (port 3000)
- `npm run build` — production build
- `npm run lint` — ESLint check
- ไม่มี test runner ในโปรเจกต์นี้ (ยังไม่ได้ setup)

# Environment Variables
- `GEMINI_API_KEY` — Google AI API key (server-side, ใน `.env.local`)
- `NEXT_PUBLIC_GOOGLE_SCRIPT_URL` — Google Apps Script URL สำหรับ Sheets integration
- `NEXT_PUBLIC_CARTO_API_KEY` — Optional: CARTO basemap key (ถ้าไม่มีใช้ OSM)
- **ห้าม** commit `.env.local` — ใส่ใน `.gitignore` แล้ว

# Skills Workflow
ทุก session ต้อง read `using-superpowers` skill ก่อน แล้วตัดสินใจว่า skill ไหน apply:
1. งาน creative/feature → `brainstorming` ก่อน
2. มี plan แล้ว → `writing-plans` → เลือก `subagent-driven-development` หรือ `executing-plans`
3. พบ bug → `systematic-debugging` ก่อน propose fix
4. ก่อน claim "เสร็จแล้ว" → `verification-before-completion`

# Architecture Notes
- `src/app/page.js` เป็น monolithic client component ขนาดใหญ่ (~5000 บรรทัด) — ถ้าต้องแก้ให้ search หา function/state ที่ต้องการก่อน
- State management ทำใน `page.js` ผ่าน React hooks — ไม่มี global state library
- Supabase auth ทำผ่าน `AuthModal` + Supabase client — session เก็บใน localStorage
- Route optimization ใช้ algorithm ใน `src/lib/routeOptimizer.js` (ไม่ใช่ Google Directions API)
- i18n: ข้อความทั้งหมดอยู่ใน `src/app/constants/translations.js` key `LANG_STRINGS`
