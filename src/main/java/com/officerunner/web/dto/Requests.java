package com.officerunner.web.dto;

import com.officerunner.domain.OrderStatus;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

/** request body เล็กๆ รวมไว้ที่เดียว */
public final class Requests {
    private Requests() {}

    public record UpdateOrderStatus(@NotNull OrderStatus status, @Size(max = 500) String reason) {}

    public record Cancel(@Size(max = 500) String reason) {}

    public record Tip(@NotNull @DecimalMin("1") @Digits(integer = 8, fraction = 2) BigDecimal amount) {}

    public record RejectTopup(@Size(max = 500) String reason) {}
}
