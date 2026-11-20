package com.officerunner.web.dto;

import com.officerunner.domain.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record OrderResponse(
        Long id,
        UUID userId,
        UUID runnerId,
        ServiceType serviceType,
        Long menuId,
        String menuName,
        int quantity,
        Temperature temperature,
        Integer sweetnessLevel,
        GeneralCategory generalCategory,
        String customDetails,
        String attachmentUrl,
        String deskLocation,
        String locationNote,
        OrderStatus status,
        boolean priority,
        Long queueAhead,
        BigDecimal subtotal,
        BigDecimal discountAmount,
        BigDecimal totalPrice,
        BigDecimal tipAmount,
        boolean canTip,
        PaymentMethod paymentMethod,
        PaymentStatus paymentStatus,
        String paymentSlipUrl,
        String cancelReason,
        Instant createdAt,
        Instant acceptedAt,
        Instant startedAt,
        Instant completedAt,
        Instant cancelledAt) {

    public static OrderResponse from(ServiceOrder o, Long queueAhead) {
        CoffeeMenu m = o.getMenu();
        boolean canTip = o.getStatus() == OrderStatus.COMPLETED && o.getTipAmount().signum() == 0 && o.getRunnerId() != null;
        return new OrderResponse(o.getId(), o.getUserId(), o.getRunnerId(), o.getServiceType(),
                m == null ? null : m.getId(), m == null ? null : m.getName(), o.getQuantity(), o.getTemperature(),
                o.getSweetnessLevel(), o.getGeneralCategory(), o.getCustomDetails(), o.getAttachmentUrl(),
                o.getDeskLocation(), o.getLocationNote(), o.getStatus(), o.isPriority(), queueAhead,
                o.getSubtotal(), o.getDiscountAmount(), o.getTotalPrice(), o.getTipAmount(), canTip,
                o.getPaymentMethod(), o.getPaymentStatus(), o.getPaymentSlipUrl(), o.getCancelReason(),
                o.getCreatedAt(), o.getAcceptedAt(), o.getStartedAt(), o.getCompletedAt(), o.getCancelledAt());
    }
}
