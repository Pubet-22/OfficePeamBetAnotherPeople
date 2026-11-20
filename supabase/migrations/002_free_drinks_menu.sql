-- =====================================================================
-- 002: เครื่องดื่มฟรี (จากตู้กาแฟ TeaTime) + ค่าบริการวิ่งไปเอากาแฟ
-- รันไฟล์นี้ใน SQL Editor ถ้าเคยรัน schema.sql เวอร์ชันก่อนหน้าไปแล้ว
-- (ถ้าติดตั้งใหม่ schema.sql มีทุกอย่างแล้ว ไม่ต้องรันไฟล์นี้)
-- =====================================================================

-- ค่าบริการต่อออเดอร์กาแฟ (ตัวเครื่องดื่มฟรี ลูกค้าจ่ายแค่ค่าวิ่ง)
alter table public.system_settings
    add column if not exists coffee_service_fee numeric(12, 2) not null default 20;

-- เมนูเดิม: ลบตัวที่ยังไม่เคยถูกสั่ง, ตัวที่มีออเดอร์อ้างอิงแล้วให้ปิดขาย
delete from public.coffee_menus m
where not exists (select 1 from public.orders o where o.menu_id = m.id);
update public.coffee_menus set is_available = false;

-- เมนูจากตู้ (แต่ละเมนูมีแบบร้อนหรือเย็นอย่างเดียว ตามตู้)
insert into public.coffee_menus (name, description, price, allow_hot, allow_iced, sort_order) values
    ('Americano',                'อเมริกาโน่ร้อน',                  0, true,  false, 1),
    ('Iced Americano',           'อเมริกาโน่เย็น',                  0, false, true,  2),
    ('Espresso',                 'เอสเปรสโซ่',                      0, true,  false, 3),
    ('Cappuccino',               'คาปูชิโน่ร้อน',                    0, true,  false, 4),
    ('Latte (Unsweetened)',      'ลาเต้ร้อน ไม่หวาน',               0, true,  false, 5),
    ('Latte (Sweet)',            'ลาเต้ร้อน หวาน',                  0, true,  false, 6),
    ('Iced Latte (Unsweetened)', 'ลาเต้เย็น ไม่หวาน',               0, false, true,  7),
    ('Hot Milk',                 'นมร้อน',                          0, true,  false, 8),
    ('Ice',                      'แก้วน้ำแข็ง',                      0, false, true,  9),
    ('Americano (ITA)',          'อเมริกาโน่ร้อน เมล็ดอิตาเลียน',     0, true,  false, 10),
    ('Iced Americano (ITA)',     'อเมริกาโน่เย็น เมล็ดอิตาเลียน',     0, false, true,  11),
    ('Espresso (ITA)',           'เอสเปรสโซ่ เมล็ดอิตาเลียน',         0, true,  false, 12),
    ('Unsweetened Latte (ITA)',  'ลาเต้ร้อน ไม่หวาน เมล็ดอิตาเลียน',  0, true,  false, 13),
    ('Iced Latte (ITA)',         'ลาเต้เย็น เมล็ดอิตาเลียน',          0, false, true,  14),
    ('Latte (ITA)',              'ลาเต้ร้อน เมล็ดอิตาเลียน',          0, true,  false, 15);
