# ตั้งค่า Supabase สำหรับ PBL Portal

Schema นี้ต่อยอดตารางเดิม `teams`, `players`, `games` และ `player_game_stats`
โดยไม่ลบข้อมูล แต่จะล้าง policy/grant เดิมของตารางที่แอปเป็นเจ้าของ แล้วสร้างสิทธิ์ชุดใหม่
เพื่อไม่ให้ permissive policy เก่าถูก OR รวมกับ RLS ใหม่

## 1. ตรวจสอบก่อนติดตั้ง

สำรองฐานข้อมูลก่อน และรันคำสั่ง read-only ต่อไปนี้ใน SQL Editor:

```sql
-- ตาราง compatibility ควรว่างก่อน initial migration
select 'teams' as table_name, count(*) from public.teams
union all select 'players', count(*) from public.players
union all select 'games', count(*) from public.games
union all select 'player_game_stats', count(*) from public.player_game_stats;

-- บันทึก policy และ grant เดิมไว้ตรวจย้อนหลัง
select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

select table_schema, table_name, grantee, privilege_type
from information_schema.table_privileges
where table_schema = 'public'
order by table_name, grantee, privilege_type;

select table_schema, table_name, column_name, grantee, privilege_type
from information_schema.column_privileges
where table_schema = 'public'
order by table_name, column_name, grantee;
```

Migration ตรวจว่า key/FK เดิมเป็น UUID และเพิ่มคอลัมน์ที่ขาดด้วย
`ADD COLUMN IF NOT EXISTS` รวมถึง `player_game_stats.created_at` หากตรวจพบข้อมูลจริง
ในตารางเดิม ให้ทดสอบ migration บนสำเนา Staging ก่อน Production

## 2. ลำดับการรัน SQL

1. รัน [migration หลัก](../supabase/migrations/202607280001_initial_league_schema.sql)
2. รัน [Storage setup](../supabase/storage.sql)
3. รัน [seed](../supabase/seed.sql) เฉพาะ Local/Preview/Staging

ใช้ **Supabase Dashboard → SQL Editor → New query** แล้วรันทีละไฟล์ทั้งไฟล์ตามลำดับ
หรือใช้ `supabase db push` สำหรับ migration ห้ามใช้ `supabase db reset` กับ Production

Seed เป็นข้อมูลสมมติ มีชื่อบุคคลและลิงก์ `example.com` ซึ่งต้องเปลี่ยนก่อนเปิดจริง

## 3. Auth และการปิดสมัครสมาชิกสาธารณะ

ที่ **Authentication → URL Configuration** ตั้งค่า:

- Site URL: `https://โดเมนจริงของคุณ`
- Redirect URLs:
  - `http://localhost:3000/**`
  - `https://โดเมนจริงของคุณ/**`
  - Vercel Preview pattern เฉพาะทีม เช่น `https://*-your-team.vercel.app/**`

Production ต้องปิดการสมัครสมาชิกแบบสาธารณะที่ **Authentication → Providers → Email**
โดยปิดตัวเลือกอนุญาต new-user signups จากนั้นสร้างหรือ Invite บัญชี staff ผ่าน
**Authentication → Users** ใน Dashboard เท่านั้น อย่าใช้หน้า signup สาธารณะสำหรับ bootstrap

Email confirmation ควรเปิดอยู่ และ callback/redirect ต้องชี้กลับโดเมนที่กำหนดไว้เท่านั้น

เมื่อ Dashboard สร้าง/Invite ผู้ใช้สำเร็จ trigger จะสร้าง `profiles` โดยไม่คัดลอกอีเมล
มาไว้ใน public schema

## 4. Environment variables และ Vercel

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxx
NEXT_PUBLIC_SITE_URL=https://โดเมนจริงของคุณ
```

เพิ่มทั้งสามค่าใน **Vercel → Project Settings → Environment Variables** สำหรับ Production,
Preview และ Development แล้ว Redeploy ห้ามนำ `SUPABASE_SERVICE_ROLE_KEY` ใส่ตัวแปร
`NEXT_PUBLIC_*`, ส่งลง browser หรือ commit ลง Git

## 5. สร้าง super admin คนแรก

1. Create/Invite ผู้ใช้ผ่าน Supabase Auth Dashboard และให้ผู้ใช้ยืนยันอีเมลก่อน
2. Bootstrap role ผ่าน SQL Editor ด้วยบัญชีเจ้าของโปรเจกต์:

```sql
update public.profiles
set role = 'super_admin',
    managed_team_id = null
where id = (
  select id from auth.users
  where lower(email) = lower('owner@example.com')
);
```

3. ตรวจผล:

```sql
select p.id, p.display_name, p.role
from public.profiles p
join auth.users u on u.id = p.id
where lower(u.email) = lower('owner@example.com');
```

การ bootstrap `super_admin` คนแรกเป็นงาน SQL-only หลังจากนั้นหน้า Admin รองรับการเปลี่ยน
role แล้ว: admin จัดการ role ทั่วไปได้ แต่เฉพาะ super admin ที่ให้หรือถอน role
`super_admin` ได้ Trigger จะห้ามลดสิทธิ์หรือลบ `super_admin` คนสุดท้าย แม้สั่งจาก SQL Editor

บทบาทคือ `member`, `team_manager`, `statistician`, `editor`, `admin`, `super_admin`
โดย statistician แก้คะแนน/สถิติเฉพาะเกม live ส่วน editor/admin เปิดเกม final กลับเป็น live
เพื่อแก้สถิติและ finalize ใหม่ได้ และเฉพาะ super admin ที่ให้หรือถอน role `super_admin` ได้
ฐานข้อมูลบังคับให้ `team_manager` มี `managed_team_id` เสมอ และ role อื่นต้องไม่มีค่านี้
หาก migration พบ manager เก่าที่ไม่มีทีม จะลดเป็น `member` แบบ least privilege เพื่อให้ admin
ตรวจแล้วมอบหมายใหม่ ส่วน team manager จะอ่าน season private ได้เฉพาะ season ที่ทีมของตนมี
แถว `season_teams` แบบ active เท่านั้น ก่อนลบทีมที่มี manager ต้องย้าย manager ไปทีมอื่นหรือ
เปลี่ยน role ก่อน มิฉะนั้น invariant จะปฏิเสธการลบ

## 6. Transactional RPC สำหรับหน้า Admin

มี active season ได้ไม่เกินหนึ่งรายการ เมื่อสร้างหรือเปลี่ยน season เป็น `active` trigger จะ lock
การ activate แบบ concurrent, เปลี่ยน active season เดิมเป็น `completed` และบังคับ season ใหม่ให้
public ภายใน transaction เดียว ดังนั้น action `createSeason`/`updateSeason` ใช้ workflow นี้ได้โดยตรง
ถ้าอัปเกรดจาก partial schema ที่มี active ซ้ำ migration จะเก็บ season ที่ `starts_on` ใหม่ที่สุด
(ใช้ `created_at` และ `id` ตัดสินเมื่อเท่ากัน) แล้วเปลี่ยนรายการเก่าเป็น `completed` ก่อนสร้าง unique index

ห้ามสร้างทีม/ผู้เล่นด้วย insert สองครั้งแยกกัน ให้ใช้ RPC ซึ่งอยู่ใน transaction เดียว:

```text
create_team_with_season(
  p_name text, p_slug text, p_abbreviation text, p_season_id uuid,
  p_conference text, p_city text, p_description text,
  p_primary_color text, p_secondary_color text
) -> uuid

create_player_with_roster(
  p_first_name text, p_last_name text, p_slug text,
  p_position basketball_position, p_team_id uuid, p_season_id uuid,
  p_jersey_number smallint, p_roblox_username text,
  p_avatar_url text, p_bio text
) -> uuid

finalize_game(
  p_game_id uuid, p_home_score integer, p_away_score integer,
  p_home_period_scores smallint[], p_away_period_scores smallint[],
  p_require_stat_totals boolean
) -> uuid
```

ทั้งสามเป็น `SECURITY INVOKER` และยังใช้ grants/RLS ของผู้เรียก `finalize_game` จะ lock
แถวเกม ตรวจผลรวม period และตรวจผลรวมคะแนนผู้เล่นเมื่อ `p_require_stat_totals=true`
statistician ไม่สามารถส่ง `false` เพื่อข้ามการตรวจได้

Workflow คะแนนที่รองรับ integrity:

1. เปลี่ยนเกม `scheduled → live`
2. บันทึก box score ขณะเกมเป็น `live`
3. เรียก `finalize_game(..., p_require_stat_totals: true)`
4. หลัง final ระบบจะปฏิเสธการ insert/update/delete สถิติจากผู้ใช้ authenticated ทุก role
   และปฏิเสธ direct update ที่เปลี่ยนฤดูกาล ทีม คะแนน หรือคะแนนราย period ขณะที่เกมยังเป็น `final`
5. หากต้องแก้ผลหรือสถิติ ให้ editor/admin เปิดเกม `final → live` แก้ box score แล้วเรียก
   `finalize_game(...)` ใหม่เพื่อให้ตรวจยอดคะแนนซ้ำ การเปลี่ยนแปลงถูกบันทึกใน
   `game_audit_log`

SQL Editor/service role ที่ทำงานโดยไม่มี session ผู้ใช้ยังเป็น trusted maintenance path
แต่ควรใช้เฉพาะงานดูแลระบบที่ตั้งใจเท่านั้น

## 7. Public API และข้อมูลส่วนตัว

ใช้ view เหล่านี้สำหรับหน้า public หรือเลือกเฉพาะคอลัมน์เดียวกันจาก base table:

- `public_players`
- `public_games`
- `public_news_posts`
- `public_player_game_stats`
- `standings`, `player_season_stats`, `stat_leaders`

`players.birth_date`, physical/location/school fields, `roblox_user_id`,
`news_posts.author_id`, finalization metadata และ audit JSON ไม่ได้ grant ให้ anon
RPC `get_public_site_data` เป็น `SECURITY INVOKER` และไม่คืนค่าเหล่านี้

เรียกข้อมูลหน้าแรกแบบ request เดียวได้ด้วย:

```ts
const { data, error } = await supabase.rpc('get_public_site_data', {
  p_season_id: null,
})
```

`teams.wins/losses` เป็น legacy compatibility เท่านั้น ตารางคะแนนจริงมาจากเกม `final`
ใน view `standings`

## 8. Storage preflight

ก่อนรัน `storage.sql` ตรวจ bucket และ policy เดิม:

```sql
select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
where id in ('team-logos', 'player-photos', 'news-images', 'staff-avatars');

select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'storage' and tablename = 'objects';
```

ไฟล์ setup จะไม่เปลี่ยน bucket private เดิมให้เป็น public อัตโนมัติ หากพบจะ rollback
พร้อม error เพื่อให้ผู้ดูแลตรวจไฟล์และตัดสินใจเอง จากนั้นจึงล้าง policy ที่อ้างถึง bucket
ทั้งสี่และสร้าง policy canonical ใหม่

- `team-logos`: path ต้องเริ่มด้วย UUID ทีม; manager แก้ได้เฉพาะทีมตนเอง
- `player-photos`, `news-images`: editor/admin/super_admin
- `staff-avatars`: admin/super_admin
- รับเฉพาะ PNG/JPEG/WebP; ขนาด 5 MB ยกเว้นข่าว 10 MB

## 9. ตรวจหลังติดตั้ง

```sql
select count(*) from public.seasons;
select count(*) from public.games;
select count(*) from public.player_game_stats;
select jsonb_pretty(public.get_public_site_data(null));

-- ต้องได้ 0 หรือ 1
select count(*) as active_season_count
from public.seasons
where status = 'active';

-- ต้องไม่คืนแถว
select id, role, managed_team_id
from public.profiles
where (role = 'team_manager' and managed_team_id is null)
   or (role <> 'team_manager' and managed_team_id is not null);

select tablename, policyname, roles, cmd
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

select table_name, grantee, privilege_type
from information_schema.table_privileges
where table_schema = 'public'
order by table_name, grantee, privilege_type;
```

หากใช้ seed ควรได้ 1 ฤดูกาล, 4 ทีม, 8 ผู้เล่น, 5 เกม และ 12 แถวสถิติ
โดย Phuket Waves มีสถิติ 2–0
