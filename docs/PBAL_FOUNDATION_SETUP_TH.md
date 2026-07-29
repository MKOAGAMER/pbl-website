# คู่มือติดตั้ง PBAL

## 1. Supabase

รัน migration ตามลำดับใน Supabase SQL Editor หรือ CLI:

1. `supabase/migrations/202607280001_initial_league_schema.sql`
2. `supabase/migrations/202607290001_pbal_foundation.sql`
3. `supabase/migrations/202607290002_live_scoreboard.sql`
4. `supabase/migrations/202607290003_trading_ai_stats.sql`
5. `supabase/migrations/202607290004_player_identity_discord.sql`
6. `supabase/storage.sql` สำหรับ bucket รูปสาธารณะของระบบเดิม
7. `supabase/seed.sql` เป็น empty seed และจะไม่สร้างข้อมูลสมมติ

Migration ลำดับที่ 4 เพิ่ม:

- workflow ตรวจและอนุมัติ `trades`
- RPC `approve_trade_request` ซึ่งอัปเดต roster และทีมปัจจุบันใน transaction เดียว
- `stat_imports` สำหรับเก็บสถานะ ผล AI และหลักฐานการตรวจ
- private Storage bucket `stat-screenshots`
- RPC `confirm_stat_import` สำหรับ upsert สถิติที่ staff ตรวจแล้ว

## 2. Environment variables

คัดลอก `.env.example` เป็น `.env.local` แล้วใส่ค่าจริง:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_SITE_URL=http://localhost:3000

ROBLOX_CLIENT_ID=...
ROBLOX_CLIENT_SECRET=...
ROBLOX_REDIRECT_URI=http://localhost:3000/api/auth/roblox/callback
ROBLOX_GROUP_ID=9515965

CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.5-flash
GEMINI_FALLBACK_MODEL=gemini-3.6-flash

DISCORD_CLIENT_ID=...
DISCORD_CLIENT_SECRET=...
DISCORD_REDIRECT_URI=http://localhost:3000/api/auth/discord/callback

DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
SUPABASE_WEBHOOK_SECRET=ข้อความสุ่มที่ยาวและเดายาก
```

ทุกค่าที่เป็น secret ต้องอยู่ฝั่ง server เท่านั้น

## 3. Roblox OAuth

สร้าง OAuth 2.0 App ใน Roblox Creator Dashboard:

- Grant: Authorization Code
- Scopes: `openid profile`
- Local redirect URI: `http://localhost:3000/api/auth/roblox/callback`
- Production redirect URI: `https://YOUR_DOMAIN/api/auth/roblox/callback`

Redirect URI ต้องตรงกับ `ROBLOX_REDIRECT_URI` ทุกตัวอักษร ระบบใช้ PKCE, state, HttpOnly cookies และแลก authorization code เฉพาะฝั่ง server

## 4. ตั้ง Super Admin คนแรก

ให้บัญชี login ด้วย Roblox ก่อนหนึ่งครั้ง แล้วเปลี่ยน Roblox ID ในคำสั่งนี้:

```sql
update public.users
set role = 'admin', admin_permission = 'super_admin'
where roblox_id = 123456789;
```

สิทธิ์ในระบบ:

- Editor: site config และ media
- Staff: รวมสิทธิ์ Editor พร้อมสร้างฤดูกาล/ทีม จัด roster ตรวจ trade และยืนยันสถิติ
- Super Admin: รวมทุกสิทธิ์และจัด role/permission ของผู้ใช้อื่น

## 5. ทดสอบ Trading

1. ผู้ใช้ที่ login เปิด `/trades` และส่งคำขอ
2. Staff เปิด `/admin/trades`
3. กดอนุมัติ แล้วตรวจว่า roster, player current team และประวัติ Trade Center เปลี่ยนพร้อมกัน
4. หาก jersey number ชนกับทีมปลายทาง ฐานข้อมูลจะไม่อนุมัติจนกว่าจะจัดหมายเลข roster ให้ไม่ซ้ำ

## 6. ทดสอบ AI Stat Entry

1. ใส่ `GEMINI_API_KEY` โดยระบบจะลอง `GEMINI_MODEL` ก่อน และใช้ `GEMINI_FALLBACK_MODEL` เมื่อ Google ไม่เปิดโมเดลเดิมให้ API project
2. ตรวจว่าเกมมีสถานะ `final`
3. Staff เปิด `/admin/stats` เลือกเกมและอัปโหลด screenshot
4. ตรวจการจับคู่ผู้เล่นและแก้ตัวเลขทุกแถว
5. ระบบจะไม่บันทึก `player_game_stats` จนกด **ยืนยันและบันทึก DB**
6. เปิด `/stats` และหน้าเกมเพื่อตรวจค่าล่าสุด
7. ใช้ปุ่ม **ภาพ** ใน audit trail เพื่อตรวจไฟล์ต้นฉบับผ่าน signed URL อายุสั้น

## 7. Discord

สร้าง Discord Application, เพิ่ม redirect URI `/api/auth/discord/callback` และใส่ `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_REDIRECT_URI` เพื่อให้ผู้เล่นเชื่อมบัญชีที่ `/account`

ทำตาม [คู่มือตั้ง Discord Webhook](DISCORD_WEBHOOK_SETUP_TH.md) เพิ่มเติม เพื่อเชื่อม event `news_posts` และ `games` จาก Supabase

## 8. Deploy

เพิ่ม environment variables ชุดเดียวกันในระบบ deploy แยกตาม Production/Preview/Development และเพิ่ม production callback URL ใน Roblox OAuth App จากนั้นทดสอบ:

1. `GET /api/health`
2. Login/logout และ role ทั้งหมด
3. Roblox login → Player/Free Agent → Staff จัด roster
4. เชื่อม Discord ที่ `/account`
5. Trade request → staff approval
6. Stat screenshot → review → confirm
7. Publish ข่าวและเปลี่ยนเกมเป็น final แล้วตรวจ Discord
