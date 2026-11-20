package com.officerunner.service;

import com.officerunner.domain.SystemSettings;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ShopStatusService {

    private final SettingsService settingsService;
    private final Clock clock;

    public record ShopStatus(
            boolean open,            // แอดมินเปิดสวิตช์รับคิว
            boolean withinHours,     // อยู่ในเวลาทำการ
            boolean rushHour,        // อยู่ในช่วงเร่งด่วน (Premium เท่านั้น)
            boolean canOrder,        // ผู้ใช้คนนี้กดสั่งได้ไหม
            String reasonCode,       // null ถ้าสั่งได้
            String message,
            LocalTime openTime,
            LocalTime closeTime,
            LocalTime rushStart,
            LocalTime rushEnd,
            String serverTime,
            String qrImageUrl,
            BigDecimal generalServiceFee,
            BigDecimal premiumDiscountPercent,
            BigDecimal premiumPrice,
            BigDecimal premiumBonusCoins) {}

    public ShopStatus statusFor(boolean premium) {
        return evaluate(settingsService.get(), premium);
    }

    ShopStatus evaluate(SystemSettings s, boolean premium) {
        ZonedDateTime now = ZonedDateTime.now(clock).withZoneSameInstant(ZoneId.of(s.getTimezone()));
        LocalTime t = now.toLocalTime();
        boolean withinHours = within(t, s.getOpenTime(), s.getCloseTime());
        boolean rush = s.getRushStart() != null && s.getRushEnd() != null && within(t, s.getRushStart(), s.getRushEnd());

        String code = null;
        String msg = "พร้อมรับออเดอร์";
        if (!s.isOpen()) {
            code = "SHOP_CLOSED";
            msg = "ขณะนี้ปิดรับคิวชั่วคราว";
        } else if (!withinHours) {
            code = "OUTSIDE_HOURS";
            msg = "เปิดรับออเดอร์เวลา " + s.getOpenTime() + " - " + s.getCloseTime() + " น.";
        } else if (rush && !premium) {
            code = "RUSH_HOUR_PREMIUM_ONLY";
            msg = "ช่วงเร่งด่วน " + s.getRushStart() + " - " + s.getRushEnd() + " น. สั่งได้เฉพาะสมาชิก Premium";
        }
        return new ShopStatus(s.isOpen(), withinHours, rush, code == null, code, msg,
                s.getOpenTime(), s.getCloseTime(), s.getRushStart(), s.getRushEnd(),
                now.toOffsetDateTime().toString(), s.getQrImageUrl(), s.getGeneralServiceFee(),
                s.getPremiumDiscountPercent(), s.getPremiumPrice(), s.getPremiumBonusCoins());
    }

    private static boolean within(LocalTime t, LocalTime start, LocalTime end) {
        return !t.isBefore(start) && t.isBefore(end);
    }
}
