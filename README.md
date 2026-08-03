# PBAL — Practical Basketball Asia League

เว็บไซต์ลีกบาสเกตบอลบน Next.js 16 + Supabase พร้อม Roblox OAuth, ระบบทีม/ผู้เล่น/เกม/สถิติ, Trade Center, AI-assisted stat entry และ Discord notifications

## ระบบหลัก

- หน้า Public: โปรแกรมและผลแข่ง ตารางคะแนน ทีม ผู้เล่น สถิติ ข่าว เพลย์ออฟ รางวัล และ Trade Center
- Auth: Roblox OAuth 2.0 Authorization Code + PKCE, Discord Application account linking และ session แบบ HttpOnly
- สิทธิ์: ทุก Roblox login เริ่มเป็น Player/Free Agent; Staff/Admin จัดลีกผ่าน Editor / Staff / Super Admin
- Trading: ผู้ใช้ยื่นคำขอ, staff อนุมัติ/ปฏิเสธ, อัปเดต roster แบบ transaction และค้นประวัติตามทีม/ผู้เล่น/วันที่
- AI Stats: staff อัปโหลด screenshot, Gemini อ่านตารางแบบ structured output พร้อม fallback เมื่อ 2.5 Flash ไม่เปิดให้ API project, staff ตรวจ/แก้ทุกแถวก่อนยืนยัน
- Discord: รับ Database Webhooks, รองรับ slash commands ผ่าน Discord Interactions และมี Bot API v1 สำหรับบอทที่รันแยก
- Discipline: Warning, Match Suspension, Trade Ban, Account Ban และ Blacklist พร้อม enforcement ระดับฐานข้อมูล

## เริ่มพัฒนา

```bash
npm install
copy .env.example .env.local
npm run dev
```

อ่าน [คู่มือติดตั้ง PBAL](docs/PBAL_FOUNDATION_SETUP_TH.md), [คู่มือตั้ง Discord Webhook](docs/DISCORD_WEBHOOK_SETUP_TH.md) และ [คู่มือ Discord Bot](docs/DISCORD_BOT_SETUP_TH.md) ก่อนทดสอบ workflow ที่เชื่อมบริการจริง

## Supabase migrations

รันตามลำดับ:

1. `supabase/migrations/202607280001_initial_league_schema.sql`
2. `supabase/migrations/202607290001_pbal_foundation.sql`
3. `supabase/migrations/202607290002_live_scoreboard.sql`
4. `supabase/migrations/202607290003_trading_ai_stats.sql`
5. `supabase/migrations/202607290004_player_identity_discord.sql`
6. `supabase/migrations/202607290005_staff_control.sql`
7. `supabase/migrations/202607290006_franchise_profiles_tournaments.sql`
8. `supabase/migrations/202608030001_self_profile_tournament_stat_entry.sql`
9. `supabase/migrations/202608030002_player_discipline_discord_bot.sql`
10. `supabase/storage.sql` สำหรับ public asset buckets และระบบอัปโหลดรูปจากเครื่อง

Migration ล่าสุดเพิ่ม Franchise Owner, การซื้อ/ปล่อยผู้เล่นผ่านการอนุมัติของ Staff, About และหลายตำแหน่งของผู้เล่น รวมถึง Tournament Control ส่วนการอัปโหลดรูปจะใช้ Cloudinary เมื่อกำหนดค่าไว้ และ fallback ไป Supabase Storage อัตโนมัติ

## ตรวจคุณภาพ

```bash
npm run lint
npm run typecheck
npm run build
```

ห้าม expose `SUPABASE_SERVICE_ROLE_KEY`, `ROBLOX_CLIENT_SECRET`, `CLOUDINARY_API_SECRET`, `GEMINI_API_KEY`, `DISCORD_CLIENT_SECRET`, `DISCORD_BOT_TOKEN`, `PBAL_BOT_API_SECRET`, `DISCORD_WEBHOOK_URL` หรือ `SUPABASE_WEBHOOK_SECRET` ด้วย prefix `NEXT_PUBLIC_`
