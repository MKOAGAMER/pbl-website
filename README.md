# Practical Basketball League Portal

เว็บลีกบาสเกตบอลด้วย Next.js 16, Supabase และ Vercel โดยยึดระบบหลักจากเว็บอ้างอิง EBA แต่ใช้ UI และโครงสร้างโค้ดของตัวเอง

## ระบบที่มีแล้ว

- หน้าแรก: เกมถัดไป, ผลล่าสุด, ตารางคะแนนย่อ, ผู้นำสถิติ และข่าว
- ตารางแข่งขันพร้อมตัวกรองฤดูกาล/ทีม/สัปดาห์/สถานะ
- Match center, standings แยก conference และ power rankings
- Team directory, roster, player directory/profile และ leaderboard สถิติ
- News, accolades/records, staff directory และ community links
- Supabase Auth สำหรับ staff
- Admin dashboard สำหรับฤดูกาล, ทีม/branding, ผู้เล่น/roster, ตารางแข่ง, live/final score, box score, ข่าว และสิทธิ์ทีมงาน
- Supabase RLS, roles, Storage policies, views สำหรับ standings/stats และ demo seed
- SEO metadata, sitemap, robots, loading/error/404, readiness endpoint และ security headers

ถ้ายังไม่ได้ติดตั้ง schema หน้า public จะขึ้นแถบ Preview และใช้ข้อมูลสมมติเพื่อให้พัฒนาได้ทันที เมื่อ migration พร้อมแล้วระบบจะอ่านข้อมูล Supabase อัตโนมัติ แม้ฐานข้อมูลจริงจะยังไม่มีทีมก็ตาม

## เริ่มพัฒนา

```bash
npm install
copy .env.example .env.local
npm run dev
```

เปิด `http://localhost:3000`

ตรวจคุณภาพก่อน deploy:

```bash
npm run lint
npm run typecheck
npm run build
```

ตรวจสถานะ data source ได้ที่ `GET /api/health` ค่า `databaseReady: true` หมายถึงอ่าน schema จาก Supabase ได้แล้ว หากยังใช้ demo endpoint จะตอบ HTTP 503 เพื่อให้ Vercel monitor ตรวจพบได้

## Environment variables

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-publishable-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

บน Vercel ให้ตั้ง `NEXT_PUBLIC_SITE_URL` เป็น production domain และเพิ่มทั้งสามค่าใน Production/Preview/Development ตามที่ใช้งาน
หากเปิด Vercel System Environment Variables ไว้ โค้ดจะ fallback ไปใช้ `VERCEL_PROJECT_PRODUCTION_URL` หรือ `VERCEL_URL` อัตโนมัติ แต่แนะนำให้กำหนด `NEXT_PUBLIC_SITE_URL` เองเมื่อใช้ custom domain

## ตั้งค่า Supabase

อ่าน [คู่มือตั้งค่า Supabase ภาษาไทย](docs/SUPABASE_SETUP_TH.md) ซึ่งครอบคลุม:

1. ลำดับรัน migration, Storage และ seed
2. Auth redirect URLs
3. การสร้าง super admin คนแรก
4. Roles และ RLS
5. Storage buckets
6. คำสั่งตรวจผลหลังติดตั้ง

ไฟล์หลัก:

- `supabase/migrations/202607280001_initial_league_schema.sql`
- `supabase/storage.sql`
- `supabase/seed.sql`

> `seed.sql` เป็นข้อมูลสมมติสำหรับ Preview/Staging ต้องเปลี่ยนชื่อและลิงก์ก่อนเปิด production

## Deploy บน Vercel

1. Push repository ขึ้น Git provider แล้ว Import เข้า Vercel
2. เพิ่ม environment variables
3. ตั้ง Supabase Auth Site URL/Redirect URLs ให้ตรงกับ production/preview domain และปิด public signup สำหรับเว็บ staff-only
4. Deploy แล้วเปิด `/api/health`
5. Login ที่ `/login` และเข้า `/admin`

ไม่ต้องเพิ่มฐานข้อมูลหรือ CMS อีกชุด ระบบหลักใช้ Supabase ครบแล้ว ส่วน Roblox API, Discord webhook, Sentry หรือ rate limiting เป็นส่วนเสริมระยะถัดไป ไม่ใช่ dependency ที่บังคับสำหรับ MVP นี้

## Dependency security

- `npm audit --omit=dev` ต้องได้ `0 vulnerabilities`
- โปรเจกต์ pin PostCSS/Sharp เวอร์ชันที่แก้ advisory ผ่าน `overrides` ชั่วคราวจนกว่า Next.js stable จะอัปเดต dependency เหล่านี้
- ห้ามใช้ `npm audit fix --force` เพราะขณะนี้เสนอการเปลี่ยน Next.js/ESLint แบบ breaking; รายการที่เหลือจาก full audit อยู่ใน toolchain สำหรับพัฒนา ไม่ถูกส่งไป production
