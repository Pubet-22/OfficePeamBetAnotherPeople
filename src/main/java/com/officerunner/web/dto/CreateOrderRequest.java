package com.officerunner.web.dto;

import com.officerunner.domain.GeneralCategory;
import com.officerunner.domain.PaymentMethod;
import com.officerunner.domain.ServiceType;
import com.officerunner.domain.Temperature;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Single-page checkout.
 * COFFEE : menuId, temperature, sweetnessLevel, quantity (customDetails = หมายเหตุ)
 * GENERAL: generalCategory, customDetails (บังคับ), attachmentUrl (ไฟล์ปริ้นที่อัปโหลดไว้ใน Supabase Storage)
 */
public record CreateOrderRequest(
        @NotNull ServiceType serviceType,
        Long menuId,
        @Min(1) @Max(20) Integer quantity,
        Temperature temperature,
        Integer sweetnessLevel,
        GeneralCategory generalCategory,
        @Size(max = 2000) String customDetails,
        @Size(max = 1000) String attachmentUrl,
        @NotBlank @Size(max = 100) String deskLocation,
        @Size(max = 500) String locationNote,
        @NotNull PaymentMethod paymentMethod,
        @Size(max = 1000) String paymentSlipUrl,
        Boolean qrTransferConfirmed) {}
