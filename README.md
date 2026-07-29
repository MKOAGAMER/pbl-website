# PBAL — Practical Basketball Asia League

เว็บไซต์ลีกบาสเกตบอลบน Next.js 16 + Supabase พร้อม Roblox OAuth, ระบบทีม/ผู้เล่น/เกม/สถิติ, Trade Center, AI-assisted stat entry และ Discord notifications

## ระบบหลัก

- หน้า Public: โปรแกรมและผลแข่ง ตารางคะแนน ทีม ผู้เล่น สถิติ ข่าว เพลย์ออฟ รางวัล และ Trade Center
- Auth: Roblox OAuth 2.0 Authorization Code + PKCE และ session แบบ HttpOnly
- สิทธิ์: Guest / Player / Staff / Admin และ Editor / Staff / Super Admin
- Trading: ผู้ใช้ยื่นคำขอ, staff อนุมัติ/ปฏิเสธ, อัปเดต roster แบบ transaction และค้นประวัติตามทีม/ผู้เล่น/วันที่
- AI Stats: staff อัปโหลด screenshot, Claude Vision อ่านตาราง, staff ตรวจ/แก้ทุกแถวก่อนยืนยัน, เก็บภาพต้นฉบับแบบ private ใน Supabase Storage
- Discord: รับ Supabase Database Webhooks แล้วประกาศข่าวใหม่และผลแข่ง final ผ่าน Incoming Webhook

## เริ่มพัฒนา

```bash
npm install
copy .env.example .env.local
npm run dev
```

อ่าน [คู่มือติดตั้ง PBAL](docs/PBAL_FOUNDATION_SETUP_TH.md) และ [คู่มือตั้ง Discord](docs/DISCORD_WEBHOOK_SETUP_TH.md) ก่อนทดสอบ workflow ที่เชื่อมบริการจริง

## Supabase migrations

รันตามลำดับ:

1. `supabase/migrations/202607280001_initial_league_schema.sql`
2. `supabase/migrations/202607290001_pbal_foundation.sql`
3. `supabase/migrations/202607290002_live_scoreboard.sql`
4. `supabase/migrations/202607290003_trading_ai_stats.sql`
5. `supabase/storage.sql` สำหรับ public asset buckets เดิม

Migration ล่าสุดสร้าง workflow อนุมัติ trade, ตาราง audit `stat_imports`, private bucket `stat-screenshots` และ RPC สำหรับยืนยันสถิติเป็น transaction

## ตรวจคุณภาพ

```bash
npm run lint
npm run typecheck
npm run build
```

ห้าม expose `SUPABASE_SERVICE_ROLE_KEY`, `ROBLOX_CLIENT_SECRET`, `CLOUDINARY_API_SECRET`, `ANTHROPIC_API_KEY`, `DISCORD_WEBHOOK_URL` หรือ `SUPABASE_WEBHOOK_SECRET` ด้วย prefix `NEXT_PUBLIC_`
