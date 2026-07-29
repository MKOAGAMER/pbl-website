# PBAL Website Foundation

โครงพื้นฐานเว็บลีกบาสเกตบอล Roblox PBAL บน Next.js 16 + Supabase โดยรอบนี้เน้นระบบหลังบ้านก่อน ยังไม่รวม Trading UI หรือ AI stat entry

## สิ่งที่มีในโครงนี้

- Supabase schema สำหรับ `users`, `site_config`, `teams`, `players`, `games`, `player_game_stats`, view `stats`, `trades`, `media_assets` และ session
- Roblox OAuth 2.0 Authorization Code + PKCE โดยแลก token และอ่าน user info เฉพาะฝั่ง server
- ตรวจ membership ของ Roblox community MKOA (`9515965`) และจัด role เป็น Guest/Player
- Role หลัก Guest / Player / Staff / Admin และสิทธิ์หลังบ้าน Editor / Staff / Super Admin
- `/admin` สำหรับสี/ธีม, staff list, links, addons, Cloudinary media และจัดสิทธิ์ผู้ใช้
- `site_config` ผ่าน Supabase Realtime ทำให้หน้าเว็บที่เปิดอยู่รับสีใหม่ได้โดยไม่ deploy

## เริ่มพัฒนา

```bash
npm install
copy .env.example .env.local
npm run dev
```

เปิด `http://localhost:3000` และอ่าน [คู่มือติดตั้ง PBAL](docs/PBAL_FOUNDATION_SETUP_TH.md) ก่อนทดสอบ login

ตรวจคุณภาพก่อน deploy:

```bash
npm run lint
npm run typecheck
npm run build
```

## ไฟล์หลัก

- `supabase/migrations/202607280001_initial_league_schema.sql` — schema ลีกเดิม
- `supabase/migrations/202607290001_pbal_foundation.sql` — Roblox auth, users, config, trades, stats view และ media
- `supabase/migrations/202607290002_live_scoreboard.sql` — เปิด Supabase Realtime สำหรับตาราง `games`
- `app/api/auth/roblox/route.ts` — เริ่ม OAuth + PKCE
- `app/api/auth/roblox/callback/route.ts` — server-only token exchange
- `app/admin/page.tsx` — admin dashboard ขั้นต้น
- `app/playoffs/page.tsx`, `app/standings/page.tsx`, `app/search/page.tsx` — หน้าลีกหลักแบบ responsive
- `i18n/` และ `messages/` — next-intl พร้อมคำแปล TH/EN ที่เขียนเอง

ห้าม expose `SUPABASE_SERVICE_ROLE_KEY`, `ROBLOX_CLIENT_SECRET` หรือ `CLOUDINARY_API_SECRET` ด้วย prefix `NEXT_PUBLIC_`
