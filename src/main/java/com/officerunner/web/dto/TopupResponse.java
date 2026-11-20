package com.officerunner.web.dto;

import com.officerunner.domain.TopupRequest;
import com.officerunner.domain.TopupStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record TopupResponse(Long id, UUID userId, BigDecimal amount, String slipUrl, TopupStatus status,
                            UUID reviewedBy, Instant reviewedAt, String rejectReason, Instant createdAt) {
    public static TopupResponse from(TopupRequest t) {
        return new TopupResponse(t.getId(), t.getUserId(), t.getAmount(), t.getSlipUrl(), t.getStatus(),
                t.getReviewedBy(), t.getReviewedAt(), t.getRejectReason(), t.getCreatedAt());
    }
}
