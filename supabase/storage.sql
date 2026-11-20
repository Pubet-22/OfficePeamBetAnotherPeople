-- =====================================================================
-- Office Runner : Supabase Storage
-- รันใน Supabase Dashboard > SQL Editor (รันซ้ำได้ ไม่พัง)
--
-- สร้าง bucket ให้หน้าบ้าน (frontend/src/lib/session.ts) อัปโหลดไฟล์:
--   slips        สลิปโอนเงิน (เติมเหรียญ / จ่าย QR)   รูปภาพ ไม่เกิน 5 MB
--   attachments  ไฟล์งานปริ้น                        PDF / รูป / Office ไม่เกิน 20 MB
--
-- หมายเหตุ: ระบบ login ด้วย /api/auth ของ backend เอง (ไม่ใช่ Supabase Auth)
-- หน้าบ้านจึงอัปโหลดด้วย anon key -> ต้องอนุญาต role anon ให้อัปโหลดได้
-- และ bucket ต้องเป็น public เพราะโค้ดใช้ getPublicUrl() ส่ง URL ให้ backend
-- ข้อควรระวัง: ใครมี anon key ก็อัปโหลดได้ และใครมีลิงก์ก็เปิดดูสลิปได้
-- (พอสำหรับทดสอบ/ใช้ภายใน ถ้าใช้จริงควรย้ายการอัปโหลดไปทำที่ backend)
-- =====================================================================

-- ---------- buckets ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
    ('slips', 'slips', true, 5242880,
        array['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif']),
    ('attachments', 'attachments', true, 20971520,
        array['application/pdf',
              'image/png', 'image/jpeg', 'image/webp',
              'application/msword',
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              'application/vnd.ms-excel',
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              'application/vnd.ms-powerpoint',
              'application/vnd.openxmlformats-officedocument.presentationml.presentation'])
on conflict (id) do update
    set public             = excluded.public,
        file_size_limit    = excluded.file_size_limit,
        allowed_mime_types = excluded.allowed_mime_types;

-- ---------- policies ----------
-- อัปโหลดได้อย่างเดียว เฉพาะในโฟลเดอร์ uploads/ (ตรงกับ path ที่หน้าบ้านใช้)
-- ไม่มี policy update/delete => แก้หรือลบไฟล์คนอื่นไม่ได้
-- การเปิดดูไฟล์ใช้ public URL ของ bucket public จึงไม่ต้องมี policy select
drop policy if exists "office_runner_upload" on storage.objects;
create policy "office_runner_upload" on storage.objects
    for insert to anon, authenticated
    with check (
        bucket_id in ('slips', 'attachments')
        and (storage.foldername(name))[1] = 'uploads'
    );
