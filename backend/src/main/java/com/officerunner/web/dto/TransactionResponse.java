package com.officerunner.web.dto;

import com.officerunner.domain.TransactionType;
import com.officerunner.domain.WalletTransaction;
import java.math.BigDecimal;
import java.time.Instant;

public record TransactionResponse(Long id, TransactionType type, BigDecimal amount, BigDecimal balanceAfter,
                                  Long orderId, Long topupId, String note, Instant createdAt) {
    public static TransactionResponse from(WalletTransaction t) {
        return new TransactionResponse(t.getId(), t.getType(), t.getAmount(), t.getBalanceAfter(),
                t.getOrderId(), t.getTopupId(), t.getNote(), t.getCreatedAt());
    }
}
