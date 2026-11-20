# Office Runner (Full-Stack Monorepo)

ระบบสั่งกาแฟและงานจิปาถะในออฟฟิศ พร้อมระบบกระเป๋าเหรียญ, คิวออเดอร์, และสมาชิก Premium

## โครงสร้างโปรเจกต์

```
office-runner/
├── backend/            # Spring Boot 3.5 (Java 21) REST API
│   ├── src/
│   ├── pom.xml
│   ├── mvnw / mvnw.cmd
│   └── .env.example
├── frontend/           # Next.js 15 (React 19, TypeScript, Tailwind)
│   ├── src/
│   ├── package.json
│   └── .env.example
└── supabase/           # SQL scripts สำหรับฐานข้อมูล Supabase PostgreSQL
    ├── schema.sql      # สร้างตาราง, ฟังก์ชัน, RLS, และข้อมูลเริ่มต้น
    └── storage.sql     # สคริปต์สร้าง Storage bucket (slips, attachments)
```

---

## วิธีเริ่มต้นใช้งาน

### 1. ฐานข้อมูล (Supabase)
1. เปิด **SQL Editor** ใน Supabase Dashboard
2. รัน [supabase/schema.sql](supabase/schema.sql)
3. รัน [supabase/storage.sql](supabase/storage.sql)

### 2. ฝั่ง Backend (Spring Boot)
1. เข้าไปที่โฟลเดอร์ `backend/`:
   ```powershell
   cd backend
   ```
2. คัดลอก `.env.example` เป็น `.env` และตั้งค่าการเชื่อมต่อฐานข้อมูล
3. สั่งรัน Backend:
   ```powershell
   .\mvnw.cmd spring-boot:run
   ```
   Backend จะทำงานที่พอร์ต `http://localhost:8080`

### 3. ฝั่ง Frontend (Next.js)
1. เข้าไปที่โฟลเดอร์ `frontend/`:
   ```powershell
   cd frontend
   ```
2. คัดลอก `.env.example` เป็น `.env.local`
3. ติดตั้ง Dependencies และสั่งรัน:
   ```powershell
   npm install
   npm run dev
   ```
   Frontend จะเปิดที่ `http://localhost:3000`
