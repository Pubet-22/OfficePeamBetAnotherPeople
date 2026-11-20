# Office Runner Backend (Spring Boot + Supabase)

Backend ระบบสั่งกาแฟ / งานจิปาถะในออฟฟิศ พร้อมกระเป๋าเหรียญ, Premium, คิว และทิป

| ส่วน | ใช้อะไร |
|---|---|
| Database | Supabase Postgres (Spring Boot ต่อผ่าน JDBC) |
| Login | Supabase Auth: frontend login ด้วย `supabase-js` แล้วส่ง `Authorization: Bearer <access_token>` มาที่ backend |
| Real-time | Supabase Realtime: frontend subscribe ตาราง `orders` เอง (RLS ให้เห็นเฉพาะออเดอร์ตัวเอง) |
| ไฟล์ (สลิป, ไฟล์ปริ้น) | Supabase Storage: frontend อัปโหลดเอง แล้วส่ง URL มาให้ backend |
| Business logic + การเขียนข้อมูลทั้งหมด | Spring Boot (Java 21, Spring Boot 3.5) |

## ติดตั้ง

1. สร้างโปรเจกต์ใน Supabase
2. เปิด **SQL Editor** แล้วรันไฟล์ [supabase/schema.sql](supabase/schema.sql) (สร้างตาราง, RLS, trigger, Realtime, ข้อมูลเริ่มต้น)
   - ถ้าเคยรัน `schema.sql` เวอร์ชันก่อนไปแล้ว ให้รัน [supabase/migrations/002_free_drinks_menu.sql](supabase/migrations/002_free_drinks_menu.sql) แทน (เพิ่ม `coffee_service_fee` และเปลี่ยนเมนูเป็นเครื่องดื่มจากตู้)
3. คัดลอก `.env.example` เป็น `.env` แล้วกรอกค่า:
   - `SUPABASE_URL`: Project Settings > API > Project URL
   - `SUPABASE_DB_URL` / `USER` / `PASSWORD`: ปุ่ม **Connect** > **Session pooler** (แปลงเป็นรูปแบบ `jdbc:postgresql://HOST:5432/postgres?sslmode=require`)
   - `SUPABASE_JWT_SECRET`: เว้นว่างไว้ถ้าโปรเจกต์ใช้ JWT Signing Keys แบบใหม่ (ระบบจะตรวจผ่าน JWKS). ใส่ก็ต่อเมื่อโปรเจกต์ยังใช้ Legacy JWT secret
4. รัน
   ```powershell
   .\mvnw.cmd spring-boot:run
   ```
5. สมัครผู้ใช้คนแรกผ่าน frontend แล้วตั้งให้เป็นแอดมินใน SQL Editor:
   ```sql
   update public.users set role = 'ADMIN' where email = 'runner@company.com';
   ```
6. สร้าง Storage bucket (เช่น `slips`, `attachments`) ใน Supabase Dashboard ให้ frontend อัปโหลดไฟล์

รันเทสต์: `.\mvnw.cmd test`

## กติกาทางธุรกิจ

- **สั่งได้เมื่อ**: แอดมินเปิดสวิตช์ `is_open` และเวลาอยู่ใน 10:00-16:00 (Asia/Bangkok, แก้ได้) ถ้าอยู่ใน**ช่วงเร่งด่วน** (`rush_start`-`rush_end`, ค่าเริ่มต้น 12:00-13:00) จะสั่งได้เฉพาะ Premium
- **ราคา**: เครื่องดื่มจากตู้กาแฟฟรี (`price = 0`) ลูกค้าจ่ายแค่ค่าวิ่ง `coffee_service_fee` (20 เหรียญต่อออเดอร์ ไม่ว่าจะกี่แก้ว). สูตรคือ ราคาเมนู × จำนวน + `coffee_service_fee` ถ้าวันหน้ามีเมนูที่ไม่ฟรีก็ใช้ได้เลย. งานจิปาถะ = `general_service_fee` (20 เหรียญ). Premium ได้ส่วนลด `premium_discount_percent` (10%)
- **Premium**: `POST /api/me/premium` หัก `premium_price` (199) จาก wallet แล้วแจก `premium_bonus_coins` (100) ทันที ออเดอร์ของ Premium ติดธง `priority` และขึ้นหน้าคิวแอดมินก่อน
- **การจ่ายเงิน**
  - `WALLET`: หักเหรียญทันที, `paymentStatus = PAID`
  - `QR_MOCK`: ลูกค้าต้องส่ง `qrTransferConfirmed: true` (แนบ `paymentSlipUrl` ได้) ได้ `AWAITING_VERIFICATION` และเมื่อแอดมินกด **Accepted** ถือว่าตรวจยอดแล้ว เปลี่ยนเป็น `PAID`
- **สถานะ**: `PENDING → ACCEPTED → IN_PROGRESS → COMPLETED` และยกเลิก (`CANCELLED`) ได้ทุกขั้นก่อน Completed (ลูกค้ายกเลิกเองได้เฉพาะตอน `PENDING`)
- **ยกเลิก**: ถ้าจ่ายแล้ว (`PAID`) ระบบคืนเหรียญเข้ากระเป๋าอัตโนมัติ (`REFUNDED`). ถ้าเป็น QR ที่ยังไม่ได้ตรวจยอด จะเป็น `VOIDED` และไม่คืนเหรียญ (กันการกดยืนยันโอนปลอมแล้วยกเลิกเพื่อรับเหรียญ)
- **ทิป**: ให้ได้ครั้งเดียวต่อออเดอร์ หลัง `COMPLETED` หักจากลูกค้าแล้วบวกเข้า `coin_balance` ของแอดมินที่รับงาน (`runner_id`)
- **เติมเงิน**: ลูกค้าส่งคำขอพร้อมสลิป แล้วแอดมิน approve เหรียญจึงเข้ากระเป๋า
- ทุกการเปลี่ยนยอดเหรียญผ่าน `WalletService` ซึ่งล็อกแถว (`SELECT … FOR UPDATE`) และบันทึกลง `transactions` พร้อม `balance_after`

## API

ทุก endpoint (ยกเว้นที่ระบุว่า public) ต้องมี `Authorization: Bearer <supabase access token>`
ส่วน `/api/admin/**` ต้องเป็น role `ADMIN`

### Public
| Method | Path | หมายเหตุ |
|---|---|---|
| GET | `/api/health` | |
| GET | `/api/menus` | เมนูที่พร้อมขาย |
| GET | `/api/shop/status` | `canOrder`, `reasonCode` (`SHOP_CLOSED` / `OUTSIDE_HOURS` / `RUSH_HOUR_PREMIUM_ONLY`), `qrImageUrl`, ค่าบริการ. ถ้าส่ง token มาจะคิดสิทธิ์ Premium ให้ |

### ลูกค้า
| Method | Path | Body |
|---|---|---|
| GET | `/api/me` | |
| POST | `/api/me/premium` | |
| GET | `/api/wallet/transactions?limit=50` | |
| POST | `/api/wallet/topups` | `{ "amount": 200, "slipUrl": "https://..." }` |
| GET | `/api/wallet/topups` | |
| POST | `/api/orders` | ดูตัวอย่างด้านล่าง |
| GET | `/api/orders` | ออเดอร์ของฉัน (มี `queueAhead` = จำนวนคิวก่อนหน้า, `canTip`) |
| GET | `/api/orders/{id}` | |
| POST | `/api/orders/{id}/cancel` | `{ "reason": "..." }` (ไม่บังคับ) |
| POST | `/api/orders/{id}/tip` | `{ "amount": 10 }` |

ตัวอย่างสั่งกาแฟ:
```json
{
  "serviceType": "COFFEE",
  "menuId": 2, "quantity": 1, "temperature": "ICED",
  "deskLocation": "A-12", "locationNote": "โต๊ะริมหน้าต่าง ใกล้ห้องประชุม B",
  "paymentMethod": "WALLET"
}
```
ตัวอย่างงานจิปาถะ (จ่าย QR):
```json
{
  "serviceType": "GENERAL",
  "generalCategory": "PRINT",
  "customDetails": "ปริ้นขาวดำ 2 ชุด เย็บมุม",
  "attachmentUrl": "https://<ref>.supabase.co/storage/v1/object/public/attachments/report.pdf",
  "deskLocation": "B-3",
  "paymentMethod": "QR_MOCK", "qrTransferConfirmed": true,
  "paymentSlipUrl": "https://.../slip.jpg"
}
```
`generalCategory`: `WASH_GLASS`, `TRASH`, `PICKUP_FOOD`, `PRINT`, `OTHER`
`temperature`: ไม่ต้องส่งก็ได้ ระบบเลือกให้ตามเมนู (แต่ละเมนูจากตู้มีแบบร้อนหรือเย็นอย่างเดียว)
`sweetnessLevel` (ไม่บังคับ เพราะเมนูของตู้กำหนดความหวานมาแล้ว เช่น Latte (Sweet) / Latte (Unsweetened)): `0`, `25`, `50`, `75`, `100`

### แอดมิน
| Method | Path | Body |
|---|---|---|
| GET / PATCH | `/api/admin/settings` | PATCH ส่งเฉพาะฟิลด์ที่แก้ เช่น `{ "openTime": "10:00", "rushStart": "12:00", "rushEnd": "13:00", "qrImageUrl": "..." }`, `{ "clearRushHour": true }` |
| POST | `/api/admin/shop/open` / `/api/admin/shop/close` | สวิตช์เปิด-ปิดรับคิว |
| GET | `/api/admin/orders?status=PENDING&status=ACCEPTED` | ไม่ส่ง status = งานที่ยังไม่จบ, เรียง Premium ก่อน |
| PATCH | `/api/admin/orders/{id}/status` | `{ "status": "ACCEPTED" }`, `{ "status": "CANCELLED", "reason": "นมหมด" }` |
| GET | `/api/admin/earnings` | จำนวนงานสำเร็จ, รายได้, ทิป, เหรียญคงเหลือ |
| GET | `/api/admin/topups?status=PENDING` | |
| POST | `/api/admin/topups/{id}/approve` | |
| POST | `/api/admin/topups/{id}/reject` | `{ "reason": "สลิปไม่ถูกต้อง" }` |
| GET / POST | `/api/admin/menus` | `{ "name", "description", "price", "allowHot", "allowIced", "imageUrl", "available", "sortOrder" }` |
| PUT | `/api/admin/menus/{id}` | เหมือน POST (ปิดขายใช้ `available: false`) |

Error ทุกตัวคืนรูปแบบเดียวกัน: `{ "status": 409, "code": "SHOP_CLOSED", "message": "...", "fields": null }`
เช่น `INSUFFICIENT_COINS` (402), `INVALID_TRANSITION`, `ALREADY_TIPPED`, `VALIDATION_ERROR`

## ฝั่ง Frontend (ทำ Real-time และแจ้งเตือน "งานสำเร็จ")

```js
supabase.channel('my-orders')
  .on('postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'orders', filter: `user_id=eq.${user.id}` },
      ({ new: o }) => {
        if (o.status === 'COMPLETED') showTipPopup(o.id)   // แสดงปุ่ม Give a Tip
      })
  .subscribe()
```
ฝั่งแอดมิน subscribe `orders` แบบไม่ใส่ filter ได้ (RLS ให้แอดมินเห็นทุกแถว) และ subscribe `system_settings` เพื่ออัปเดตสถานะร้าน

## โครงสร้างโค้ด

```
src/main/java/com/officerunner
├── config/       SecurityConfig (ตรวจ JWT ของ Supabase), SupabaseJwtConverter (role จาก DB)
├── domain/       Entity + enum (OrderStatus มี state machine)
├── repository/   Spring Data JPA
├── service/      OrderService, WalletService, TopupService, UserService, ShopStatusService, ...
└── web/          Controllers + DTO
supabase/schema.sql   ตาราง, RLS, trigger, Realtime, seed
```
