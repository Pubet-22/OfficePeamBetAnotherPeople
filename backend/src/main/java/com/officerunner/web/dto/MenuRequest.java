package com.officerunner.web.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record MenuRequest(
        @NotBlank @Size(max = 100) String name,
        @Size(max = 500) String description,
        @NotNull @DecimalMin("0") @Digits(integer = 8, fraction = 2) BigDecimal price,
        boolean allowHot,
        boolean allowIced,
        String imageUrl,
        boolean available,
        Integer sortOrder) {}
