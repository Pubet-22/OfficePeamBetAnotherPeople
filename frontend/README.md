# Office Runner — Frontend (Next.js)

หน้าบ้านของระบบสั่งกาแฟ / งานจิปาถะในออฟฟิศ เชื่อมกับ Spring Boot backend ที่โฟลเดอร์ราก repo (`../`)

## เริ่มใช้งาน

```powershell
cd frontend
npm install
Copy-Item .env.example .env.local   # ครั้งแรกเท่านั้น
npm run dev                         # http://localhost:3000
```

## สองโหมด

| โหมด | ตั้งค่าใน `.env.local` | ใช้ทำอะไร |
|---|---|---|
| **Mock** | `NEXT_PUBLIC_API_BASE_URL=/mock-api` | ทำหน้าจอโดยไม่ต้องมี backend. API จำลองอยู่ที่ `src/mock` และเลียนแบบ backend จริง |
| **Backend จริง** | `NEXT_PUBLIC_API_BASE_URL=http://localhost:8080/api` | login ผ่าน `POST /api/auth/login` / `register` ของ backend (JWT เก็บใน localStorage) |

อัปโหลดสลิป/ไฟล์ปริ้นในโหมด backend ใช้ Supabase Storage: ใส่ `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` (ไม่ใส่ก็ใช้งานอื่นได้ แต่อัปโหลดไฟล์ไม่ได้)

แก้ `.env.local` แล้วต้องรีสตาร์ต `npm run dev`

### บัญชีทดสอบ (เฉพาะ mock)

| role | email | password |
|---|---|---|
| ลูกค้า (300 เหรียญ) | `user@office.test` | `user1234` |
| แอดมิน | `admin@office.test` | `admin1234` |

ข้อมูล mock อยู่ในหน่วยความจำ รีสตาร์ต dev server แล้วกลับเป็นค่าใน `src/mock/seed.json`

### เชื่อม backend จริง (ครั้งแรก)

1. backend: ทำตาม `../README.md` (รัน `supabase/schema.sql`, ตั้ง `.env`, `.\mvnw.cmd spring-boot:run`)
2. รัน `../supabase/storage.sql` ใน Supabase SQL Editor เพื่อสร้าง bucket `slips` / `attachments` ให้หน้าบ้านอัปโหลดได้
3. ใน `.env` ของ backend ให้ `CORS_ALLOWED_ORIGINS` มี `http://localhost:3000`
4. ตั้ง `frontend/.env.local` ตามตารางด้านบน (URL และ anon key จาก Supabase > Project Settings > API)
5. สมัครผู้ใช้ผ่านหน้า `/login` แล้วตั้งแอดมินใน SQL Editor: `update public.users set role = 'ADMIN' where email = '...';`
6. แอดมินกด **เปิดรับคิว** ที่ `/admin` (ค่าเริ่มต้นของ `system_settings.open` คือปิด)

## โครงสร้าง

```
src/
  app/
    page.tsx              สั่งงาน (ลูกค้า)
    login/                เข้าสู่ระบบ / สมัคร
    orders/               ออเดอร์ของฉัน
    orders/[id]/          ติดตามสถานะ, คิวก่อนหน้า, ยกเลิก, ให้ทิป
    wallet/               เติมเหรียญ (แนบสลิป), ประวัติ, สมัครพรีเมียม
    admin/                แดชบอร์ดแอดมิน: เปิด/ปิดร้าน, คิว, อนุมัติเติมเงิน, รายได้
    mock-api/[...path]/   route handler ของ mock
  lib/
    types.ts              type ตรงกับ DTO ของ backend (web/dto/*.java)
    api.ts                เรียก backend ทุก endpoint
    session.ts            login + อัปโหลดไฟล์ (Supabase หรือ mock)
    auth.tsx              ข้อมูลผู้ใช้ที่ล็อกอิน (GET /api/me)
    hooks.ts              useRequireAuth, usePolledData (โหลดซ้ำทุก 5 วิ)
  mock/
    handlers.ts           เลียนแบบ controller/service ของ backend
    seed.json             ข้อมูลเริ่มต้น
```

## ยังไม่ได้ทำ

- อัปเดตสถานะแบบ Supabase Realtime (ตอนนี้ใช้ดึงข้อมูลซ้ำทุก 5 วินาที ใช้ได้ทั้ง mock และของจริง)
- หน้าแอดมินจัดการเมนู (`/api/admin/menus`) และตั้งค่าร้าน (`/api/admin/settings`)
