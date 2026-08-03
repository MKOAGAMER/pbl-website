# ตั้งค่า PBAL Discord Application Bot

ระบบรองรับทั้ง slash command ที่ Discord เรียกเว็บ PBAL โดยตรง และ REST API สำหรับบอทที่รันแยกอยู่แล้ว

## 1. รัน migration

รัน `supabase/migrations/202608030002_player_discipline_discord_bot.sql` หลัง migration ก่อนหน้าทั้งหมด ไฟล์นี้สร้างระบบบทลงโทษ ตัวบังคับ Blacklist ในระดับฐานข้อมูล และ audit log ของคำสั่งจากเว็บ/บอท

## 2. ตั้งค่า Discord Application

เพิ่ม environment ฝั่งเซิร์ฟเวอร์:

```dotenv
DISCORD_APPLICATION_ID=application-id
DISCORD_PUBLIC_KEY=public-key-hex
DISCORD_BOT_TOKEN=bot-token
DISCORD_GUILD_ID=guild-id-for-development
```

ตั้ง Interactions Endpoint URL ใน Discord Developer Portal เป็น:

```text
https://YOUR_DOMAIN/api/discord/interactions
```

ระบบตรวจลายเซ็น Ed25519 และปฏิเสธ timestamp ที่เกิน 5 นาที จากนั้นลงทะเบียนคำสั่งด้วย:

```bash
npm run discord:register
```

เมื่อมี `DISCORD_GUILD_ID` คำสั่งจะลงเฉพาะเซิร์ฟเวอร์ทดสอบและอัปเดตทันที เมื่อต้องการใช้ทั่วโลกให้ลบค่านี้แล้วรันคำสั่งเดิม

คำสั่งที่มีคือ `/pbal player`, `/pbal matches`, `/pbal standings`, `/pbal trade`, `/pbal punish`, `/pbal revoke` และ `/pbal match-update`

คำสั่งที่แก้ข้อมูลจะหา `users.discord_id` เพื่อใช้ role/permission จริงของเว็บ ผู้ใช้จึงต้องเชื่อม Discord ในหน้า Account ก่อน

## 3. Bot API สำหรับบอทที่รันแยก

สร้าง secret แบบสุ่มอย่างน้อย 32 ตัวอักษร:

```dotenv
PBAL_BOT_API_SECRET=replace-with-a-long-random-secret
```

ส่งทุกคำขอด้วย `Authorization: Bearer ...` และคำสั่งที่แก้ข้อมูลต้องส่ง `x-discord-user-id` ของผู้สั่งงานด้วย

Endpoints หลัก:

- `GET /api/bot/v1/snapshot` — season, teams, players, matches, tournaments, news และ active discipline
- `GET|POST /api/bot/v1/trades`
- `PATCH /api/bot/v1/trades/:id`
- `GET|POST /api/bot/v1/matches`
- `GET|PATCH /api/bot/v1/matches/:id`
- `GET|POST /api/bot/v1/punishments`
- `PATCH /api/bot/v1/punishments/:id`

POST/PATCH รองรับ `externalRequestId` เพื่อป้องกันคำสั่งซ้ำ และ mutation จะบันทึก actor/source ใน `league_operation_log`

## 4. พฤติกรรมบทลงโทษ

- `warning` — บันทึกคำเตือน
- `match_suspension` — บล็อกการเพิ่ม/แก้สถิติในแมตช์
- `trade_ban` — บล็อกการส่งและอนุมัติเทรด พร้อมยกเลิกคำขอ pending
- `account_ban` — ระงับ authenticated session และคำสั่ง Discord
- `blacklist` — รวม account/trade/match ban และบล็อกการเพิ่มกลับเข้า active roster

หน้า `/admin/discipline` ใช้จัดการเคส ส่วน `/blacklist` แสดงเฉพาะเคสที่ Staff เลือกให้เปิดเผยสาธารณะ

ห้ามใช้ prefix `NEXT_PUBLIC_` กับ Bot Token, Public Key หรือ Bot API Secret
