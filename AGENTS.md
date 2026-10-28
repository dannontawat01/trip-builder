<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Version Management & Release Rules
- ทุกครั้งที่มีการแก้ไขโค้ด, เพิ่มฟีเจอร์ หรือ Deploy อัปเดตขึ้นสู่ Production จะต้องปรับเปลี่ยน/เพิ่มเลขเวอร์ชัน (Version Bump) เสมอ ทั้งใน `package.json` และตัวแปร `APP_VERSION` ใน `src/app/page.js` เพื่อให้ผู้ใช้สามารถตรวจสอบเวอร์ชันล่าสุดบนหน้าเว็บได้ทันที

# Project Overview
trip-builder เป็น Trip Planning Web App ที่ช่วยสร้าง itinerary ท่องเที่ยว ฟีเจอร์หลัก: วางแผนวัน/สถานที่, แผนที่ Leaflet, AI แนะนำสถานที่ (Gemini), export Google Sheets, real-time collaboration (Supabase), multi-language UI

# Tech Stack
- **Framework:** Next.js 16.2.10 (App Router) + React 19 — อ่าน `node_modules/next/dist/docs/` ก่อนเขียนโค้ดใดๆ
- **Styling:** Tailwind CSS v4 (PostCSS) — syntax v4 ต่างจาก v3 มาก (ใช้ `@import "tailwindcss"` แทน `@tailwind base/components/utilities`)
- **Map:** Leaflet 1.9.4 ผ่าน dynamic import (`ssr: false`) — ห้าม import Leaflet ใน SSR context
- **Database:** Supabase (PostgreSQL) ผ่าน `@supabase/supabase-js` — schema อยู่ที่ `schema.sql`
- **AI:** Google Gemini via `@google/generative-ai` — key ใน `GEMINI_API_KEY` (server-side)
- **Storage:** Google Sheets (legacy export) ผ่าน Google Apps Script URL
- **Image:** `sharp` สำหรับ server-side optimization, `OptimizedImage` component สำหรับ client

# File Structure Conventions
- `src/app/page.js` — Main page (Client Component, ~5000+ lines) ห้ามแยก component โดยไม่ได้ plan ก่อน
- `src/app/layout.js` — Root layout (Server Component)
- `src/app/api/*/route.js` — API Routes (Next.js App Router format)
- `src/app/components/` — Shared UI components
- `src/app/components/modals/` — Modal components (dynamic import ทั้งหมด)
- `src/app/constants/translations.js` — i18n strings, city data, constants ทั้งหมด
- `src/lib/` — Utility libraries (cityDetector, gmapsRoute, googleSheets, optimizedImage, routeOptimizer)

# Coding Conventions
- ใช้ JavaScript (ไม่ใช่ TypeScript) — `jsconfig.json` เปิด path alias `@/` → `src/`
- Modal ทุกตัว lazy-load ด้วย `next/dynamic` + `{ ssr: false }`
- API key สำหรับ Gemini: `process.env.GEMINI_API_KEY` (server-side); Google Script URL: `process.env.NEXT_PUBLIC_GOOGLE_SCRIPT_URL` (client-side)
- ห้ามเพิ่ม dependency โดยไม่ได้ถามผู้ใช้ก่อน
- TypeScript errors ถูก ignore ใน build (`ignoreBuildErrors: true` ใน `next.config.mjs`)

# Skills Available (ใน .agents/skills/)
ก่อนทำงานใดๆ ให้อ่าน `using-superpowers` skill ก่อน จากนั้นเลือก skill ที่เหมาะสม:
- `brainstorming` — ก่อน implement feature ใหม่หรือ creative work ทุกครั้ง
- `writing-plans` — หลัง brainstorm, ก่อนแตะโค้ด
- `systematic-debugging` — เมื่อพบ bug หรือ behavior ผิดปกติ
- `frontend-design` — เมื่อสร้าง UI ใหม่
- `test-driven-development` — เมื่อ implement feature/bugfix
- `verification-before-completion` — ก่อนประกาศว่างานเสร็จ
- `subagent-driven-development` — เมื่อมี tasks อิสระที่ทำพร้อมกันได้
- `dispatching-parallel-agents` — เมื่อมี 2+ tasks ที่ไม่ขึ้นต่อกัน
