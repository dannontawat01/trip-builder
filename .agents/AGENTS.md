# Language Preference
- Always communicate, explain, and respond in Thai.

# Version Management & Release Rules
- ทุกครั้งที่มีการแก้ไขโค้ด, เพิ่มฟีเจอร์ หรือ Deploy อัปเดตขึ้นสู่ Production จะต้องปรับเปลี่ยน/เพิ่มเลขเวอร์ชัน (Version Bump) เสมอ ทั้งใน `package.json` และตัวแปร `APP_VERSION` ใน `src/app/page.js` เพื่อให้ผู้ใช้สามารถตรวจสอบเวอร์ชันล่าสุดบนหน้าเว็บได้ทันที

# Development Commands
- `npm run dev` — start dev server (port 3000)
- `npm run build` — production build
- `npm run lint` — ESLint check
- `node --test tests/` — unit tests (`node:test` + `node:assert/strict`, ไม่มี `npm test`) ทดสอบ pure modules ใน `src/lib/`

# Environment Variables
- `GEMINI_API_KEY` — Google AI API key (server-side, ใน `.env.local`)
- `NEXT_PUBLIC_GOOGLE_SCRIPT_URL` — Google Apps Script URL สำหรับ Sheets integration
- `NEXT_PUBLIC_CARTO_API_KEY` — Optional: CARTO basemap key (ถ้าไม่มีใช้ OSM)
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — ถ้าไม่มี `src/lib/supabase.js` จะ export `null` ต้อง null-check ก่อนใช้
- ถ้าไม่มี `GEMINI_API_KEY` AI routes (`ai-plan`, `ai-suggest`) จะ fallback เป็น mock data
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
- i18n: ข้อความทั้งหมดอยู่ใน `src/app/constants/translations.js` key `LANG_STRINGS` — เพิ่ม string ต้องมีทั้ง `th` และ `en`
- Theme มีแค่ `clean`/`dark` (`src/lib/theme.js`)
- `public/sw.js` มี `CACHE_NAME` แยกจาก `APP_VERSION` — bump เมื่อเปลี่ยน asset/caching behavior
- ดูภาพรวม tech stack และ conventions เพิ่มเติมที่ [AGENTS.md](../AGENTS.md); specs/plans อยู่ที่ [docs/superpowers/](../docs/superpowers/)
