package com.officerunner.web.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalTime;

/** PATCH: ส่งเฉพาะฟิลด์ที่ต้องการแก้ (null = ไม่เปลี่ยน). เวลาใช้รูปแบบ "HH:mm" */
public record SettingsUpdateRequest(
        Boolean isOpen,
        LocalTime openTime,
        LocalTime closeTime,
        @Size(max = 64) String timezone,
        LocalTime rushStart,
        LocalTime rushEnd,
        Boolean clearRushHour,
        @DecimalMin("0") BigDecimal generalServiceFee,
        @DecimalMin("0") BigDecimal premiumPrice,
        @DecimalMin("0") BigDecimal premiumBonusCoins,
        @DecimalMin("0") @DecimalMax("100") BigDecimal premiumDiscountPercent,
        @Size(max = 1000) String qrImageUrl) {}
