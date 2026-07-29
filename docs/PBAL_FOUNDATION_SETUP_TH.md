# คู่มือติดตั้ง PBAL Foundation

## 1. Supabase

รัน migration ตามลำดับใน Supabase SQL Editor หรือ Supabase CLI:

1. `supabase/migrations/202607280001_initial_league_schema.sql`
2. `supabase/migrations/202607290001_pbal_foundation.sql`
3. `supabase/migrations/202607290002_live_scoreboard.sql` เพื่อให้ live scoreboard รับการเปลี่ยนแปลงของ `games` ได้ทันที
4. `supabase/storage.sql` เฉพาะกรณีที่ยังใช้ Supabase Storage จากระบบเดิม
5. `supabase/seed.sql` ใช้กับ Preview/Staging เท่านั้น

Migration ชุดที่สองจะเพิ่ม:

- `users` และ `auth_sessions` สำหรับ Roblox identity/session
- `site_config` singleton row ชื่อ `main` พร้อม Supabase Realtime
- `trades` (ยังไม่มี Trading UI)
- `media_assets` สำหรับ metadata ของ Cloudinary
- `ping_ms` ใน `player_game_stats`
- view `stats` ที่คืน Pts, Fgm/Fga/Fg%, 3pm/3pa/3p%, Ftm/Fta/Ft%, Ast, Stl, Bk, Orb, Drb, Reb, Tov, Fls, +/-, Ping

## 2. Environment variables

คัดลอก `.env.example` เป็น `.env.local` และใส่ค่าจริง:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_SITE_URL=http://localhost:3000

ROBLOX_CLIENT_ID=...
ROBLOX_CLIENT_SECRET=...
ROBLOX_REDIRECT_URI=http://localhost:3000/api/auth/roblox/callback

CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

ค่า service role และ secrets ทั้งหมดต้องอยู่ฝั่ง server เท่านั้น ห้ามใช้ prefix `NEXT_PUBLIC_`

## 3. Roblox OAuth 2.0

สร้าง OAuth 2.0 App ใน Roblox Creator Dashboard แล้วตั้งค่า:

- Grant: Authorization Code
- Scopes: `openid profile`
- Local redirect URI: `http://localhost:3000/api/auth/roblox/callback`
- Production redirect URI: `https://YOUR_DOMAIN/api/auth/roblox/callback`

Redirect URI ต้องตรงกับ `ROBLOX_REDIRECT_URI` ทุกตัวอักษร Flow นี้ใช้ PKCE, state, HttpOnly cookies และแลก authorization code ใน Route Handler ฝั่ง server เท่านั้น

หลัง login ระบบเรียก Roblox user info เพื่อเก็บ `roblox_id`, username และ avatar จากนั้นตรวจ community MKOA id `9515965` ผ่าน Roblox Groups API ผู้ที่เป็นสมาชิกจะได้ Player; ผู้ที่ไม่เป็นสมาชิกจะได้ Guest โดย Staff/Admin เดิมจะไม่ถูกลดสิทธิ์จากการเช็คกลุ่ม

## 4. ตั้ง Super Admin คนแรก

ให้บัญชีนั้น login ด้วย Roblox หนึ่งครั้งก่อน แล้วรัน SQL โดยเปลี่ยน Roblox ID:

```sql
update public.users
set role = 'admin', admin_permission = 'super_admin'
where roblox_id = 123456789;
```

จากนั้นเข้า `/admin` เพื่อจัด role และ permission ให้บัญชีอื่น ระบบฐานข้อมูลป้องกันการลบหรือลดสิทธิ์ Super Admin คนสุดท้าย

การแบ่งสิทธิ์:

- Editor: แก้ site config และจัดการ media
- Staff: รวมสิทธิ์ Editor และเตรียมไว้สำหรับงานลีก operational
- Super Admin: รวมทุกสิทธิ์และจัด role/permission ของผู้ใช้

## 5. Cloudinary

สร้าง Cloudinary account/environment แล้วใส่ cloud name, API key และ API secret หน้า `/admin` จะ upload รูปแบบ signed request ผ่าน server และลบทั้งไฟล์บน Cloudinary กับ metadata ใน Supabase

## 6. Deploy บน Vercel

เพิ่ม environment variables ชุดเดียวกันใน Vercel แยก Production/Preview/Development และเพิ่ม production callback URL ใน Roblox OAuth app ก่อน deploy

หลัง deploy ให้ทดสอบ:

1. `GET /api/health`
2. login ผ่าน `/login`
3. username/avatar และ MKOA status ถูกต้อง
4. Guest/Player เข้า `/admin` ไม่ได้
5. Editor/Staff/Super Admin บันทึก config ได้
6. browser ที่เปิดหน้าเว็บอยู่เปลี่ยนสีตาม Realtime โดยไม่ deploy
7. upload และ delete รูปใน `/admin`
