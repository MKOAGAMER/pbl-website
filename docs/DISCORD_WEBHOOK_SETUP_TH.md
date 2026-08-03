# ตั้งค่า Discord Notification สำหรับ PBAL

ระบบรับ event จาก Supabase Database Webhooks แล้วส่งประกาศไปยัง Discord เมื่อ:

- `news_posts` เปลี่ยนสถานะเป็น `published` → ช่องประกาศ
- `games` เปลี่ยนสถานะเป็น `final` → ช่อง Match Result พร้อมทีมที่ชนะและคะแนน
- `trades` เปลี่ยนสถานะเป็น `approved` → ช่อง Trade พร้อมผู้เล่น ทีมต้นทาง และทีมปลายทาง

## 1. Environment variables

เพิ่มค่าต่อไปนี้ทั้ง local และระบบ deploy โดยเก็บเป็น server secret เท่านั้น:

```dotenv
DISCORD_ANNOUNCEMENT_WEBHOOK_URL=https://discord.com/api/webhooks/...
DISCORD_MATCH_RESULT_WEBHOOK_URL=https://discord.com/api/webhooks/...
DISCORD_TRADE_WEBHOOK_URL=https://discord.com/api/webhooks/...
SUPABASE_WEBHOOK_SECRET=สร้างข้อความสุ่มที่ยาวและเดายาก
```

สร้าง Incoming Webhook แยกใน Discord ที่ **Edit Channel → Integrations → Webhooks** ของแต่ละช่อง แล้วนำ URL มาใส่ให้ตรงตัวแปร ระบบยังรองรับ `DISCORD_WEBHOOK_URL` เป็น fallback สำหรับการตั้งค่าเดิม แต่ event ที่ไม่มี URL แยกจะถูกรวมไปช่อง fallback เดียวกัน

## 2. สร้าง Database Webhooks ใน Supabase

ใน Supabase Dashboard ไปที่ **Database → Webhooks** และสร้าง 3 รายการ โดยใช้ URL ปลายทางเดียวกัน:

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

ตัวรับจะกรอง event ซ้ำอีกชั้น จึงส่ง Discord เฉพาะตอนข่าวถูก publish, เกมเปลี่ยนเป็น final หรือ trade ได้รับอนุมัติเท่านั้น การแก้ข้อมูลทั่วไปและคำขอ trade ที่ยัง pending/ถูกปฏิเสธจะไม่ส่งข้อความ ระบบบันทึก event ที่ส่งแล้วใน `discord_notification_log` เพื่อป้องกันข้อความซ้ำ และปิด Discord mentions จากข้อความที่ผู้ใช้กรอก

## 3. ทดสอบ

1. Publish ข่าวหนึ่งรายการ แล้วตรวจช่องประกาศ
2. เปลี่ยนเกมจาก `live` เป็น `final` แล้วตรวจช่อง Match Result
3. อนุมัติคำขอใน `/admin/trades` แล้วตรวจช่อง Trade
4. หากส่งไม่สำเร็จ ให้ตรวจ `discord_notification_log.last_error` และ log ของ route `/api/integrations/supabase`
