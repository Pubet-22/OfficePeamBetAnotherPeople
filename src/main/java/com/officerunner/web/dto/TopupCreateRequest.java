package com.officerunner.web.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

/** slipUrl = URL ของรูปสลิปที่ frontend อัปโหลดขึ้น Supabase Storage แล้ว */
public record TopupCreateRequest(
        @NotNull @DecimalMin("1") @Digits(integer = 8, fraction = 2) BigDecimal amount,
        @NotBlank @Size(max = 1000) String slipUrl) {}
