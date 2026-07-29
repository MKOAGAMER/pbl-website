# ตั้งค่า Discord Notification สำหรับ PBAL

ระบบรับ event จาก Supabase Database Webhooks แล้วส่งประกาศไปยัง Discord เมื่อ:

- `news_posts` เปลี่ยนสถานะเป็น `published`
- `games` เปลี่ยนสถานะเป็น `final`

## 1. Environment variables

เพิ่มค่าต่อไปนี้ทั้ง local และระบบ deploy โดยเก็บเป็น server secret เท่านั้น:

```dotenv
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
SUPABASE_WEBHOOK_SECRET=สร้างข้อความสุ่มที่ยาวและเดายาก
```

## 2. สร้าง Database Webhooks ใน Supabase

ใน Supabase Dashboard ไปที่ **Database → Webhooks** และสร้าง 2 รายการ โดยใช้ URL เดียวกัน:

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

ตัวรับจะกรอง event ซ้ำอีกชั้น จึงส่ง Discord เฉพาะตอนข่าวถูก publish ครั้งแรกหรือเกมเปลี่ยนเป็น final เท่านั้น และปิด Discord mentions จากข้อความที่ผู้ใช้กรอก

