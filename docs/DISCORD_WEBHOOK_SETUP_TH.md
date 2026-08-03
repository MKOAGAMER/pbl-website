# ตั้งค่า Discord Notification สำหรับ PBAL

ระบบรับ event จาก Supabase Database Webhooks แล้วส่งประกาศไปยัง Discord เมื่อ:

- `news_posts` เปลี่ยนสถานะเป็น `published` → ช่องประกาศ
- `games` เปลี่ยนสถานะเป็น `final` → ช่อง Match Result พร้อมทีมที่ชนะและคะแนน
- `trades` เปลี่ยนสถานะเป็น `approved` → ช่อง Trade พร้อมผู้เล่น ทีมต้นทาง และทีมปลายทาง
- `player_disciplinary_actions` ถูกประกาศเป็น public หรือถูกยกเลิกโทษ → ช่อง Discipline

## 1. Environment variables

เพิ่มค่าต่อไปนี้ทั้ง local และระบบ deploy โดยเก็บเป็น server secret เท่านั้น:

```dotenv
DISCORD_ANNOUNCEMENT_WEBHOOK_URL=https://discord.com/api/webhooks/...
DISCORD_MATCH_RESULT_WEBHOOK_URL=https://discord.com/api/webhooks/...
DISCORD_TRADE_WEBHOOK_URL=https://discord.com/api/webhooks/...
DISCORD_DISCIPLINE_WEBHOOK_URL=https://discord.com/api/webhooks/...
SUPABASE_WEBHOOK_SECRET=สร้างข้อความสุ่มที่ยาวและเดายาก
```

สร้าง Incoming Webhook แยกใน Discord ที่ **Edit Channel → Integrations → Webhooks** ของแต่ละช่อง แล้วนำ URL มาใส่ให้ตรงตัวแปร ระบบยังรองรับ `DISCORD_WEBHOOK_URL` เป็น fallback สำหรับการตั้งค่าเดิม แต่ event ที่ไม่มี URL แยกจะถูกรวมไปช่อง fallback เดียวกัน

## 2. สร้าง Database Webhooks ใน Supabase

ใน Supabase Dashboard ไปที่ **Database → Webhooks** และสร้าง 4 รายการ โดยใช้ URL ปลายทางเดียวกัน:

```text
https://YOUR_DOMAIN/api/integrations/supabase
```

ตั้ง header เพิ่ม:

```text
x-pbal-webhook-secret: ค่าเดียวกับ SUPABASE_WEBHOOK_SECRET
```

รายการแรก:

- Table: `news_posts`
- Events: `INSERT`, `UPDATE`

รายการที่สอง:

- Table: `games`
- Events: `INSERT`, `UPDATE`

รายการที่สาม:

- Table: `trades`
- Events: `INSERT`, `UPDATE`

รายการที่สี่:

- Table: `player_disciplinary_actions`
- Events: `INSERT`, `UPDATE`

ตัวรับจะกรอง event ซ้ำอีกชั้น จึงส่ง Discord เฉพาะตอนข่าวถูก publish, เกมเปลี่ยนเป็น final หรือ trade ได้รับอนุมัติเท่านั้น การแก้ข้อมูลทั่วไปและคำขอ trade ที่ยัง pending/ถูกปฏิเสธจะไม่ส่งข้อความ ระบบบันทึก event ที่ส่งแล้วใน `discord_notification_log` เพื่อป้องกันข้อความซ้ำ และปิด Discord mentions จากข้อความที่ผู้ใช้กรอก

## 3. ทดสอบ

1. Publish ข่าวหนึ่งรายการ แล้วตรวจช่องประกาศ
2. เปลี่ยนเกมจาก `live` เป็น `final` แล้วตรวจช่อง Match Result
3. อนุมัติคำขอใน `/admin/trades` แล้วตรวจช่อง Trade
4. สร้างบทลงโทษแบบ `is_public = true` แล้วตรวจช่อง Discipline
5. หากส่งไม่สำเร็จ ให้ตรวจ `discord_notification_log.last_error` และ log ของ route `/api/integrations/supabase`

## 4. ติดตั้งผ่าน migration (ทางเลือก)

ถ้าต้องการให้ Supabase ยิง event ของ `trades` เองโดยไม่ต้องสร้าง Database Webhook ใน Dashboard ให้รัน migration ล่าสุด แล้วบันทึก secret ในตาราง config:

```sql
insert into public.pbal_discord_webhook_config (webhook_secret)
values ('ค่าเดียวกับ SUPABASE_WEBHOOK_SECRET')
on conflict (id) do update
set webhook_secret = excluded.webhook_secret,
    enabled = true,
    updated_at = now();
```

Migration จะยิงเฉพาะตอน `trades.status` เปลี่ยนเป็น `approved` และใช้ `pg_net` แบบ asynchronous จึงไม่ทำให้ transaction การอนุมัติเทรดล้มเหลว หากใช้วิธีนี้ไม่ควรสร้าง Database Webhook ของ `trades` ซ้ำใน Dashboard (ระบบ log ยังช่วยกัน duplicate ได้ แต่จะมี request ซ้ำหนึ่งครั้ง)
