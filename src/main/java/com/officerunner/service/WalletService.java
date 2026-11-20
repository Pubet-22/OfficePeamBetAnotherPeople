package com.officerunner.service;

import com.officerunner.common.ApiException;
import com.officerunner.domain.AppUser;
import com.officerunner.domain.TransactionType;
import com.officerunner.domain.WalletTransaction;
import com.officerunner.repository.TransactionRepository;
import com.officerunner.repository.UserRepository;
import java.math.BigDecimal;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * จุดเดียวที่แก้ coin_balance: ล็อกแถวผู้ใช้ (SELECT ... FOR UPDATE), แก้ยอด แล้วบันทึก transactions
 * ต้องถูกเรียกภายใน transaction ของ service ที่เรียกใช้เสมอ.
 */
@Service
@RequiredArgsConstructor
public class WalletService {

    private final UserRepository userRepo;
    private final TransactionRepository txRepo;

    @Transactional(propagation = Propagation.MANDATORY)
    public WalletTransaction credit(UUID userId, BigDecimal amount, TransactionType type, Long orderId, Long topupId, String note) {
        requirePositive(amount);
        AppUser user = lock(userId);
        user.setCoinBalance(user.getCoinBalance().add(amount));
        return record(user, amount, type, orderId, topupId, note);
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public WalletTransaction debit(UUID userId, BigDecimal amount, TransactionType type, Long orderId, Long topupId, String note) {
        requirePositive(amount);
        AppUser user = lock(userId);
        if (user.getCoinBalance().compareTo(amount) < 0) {
            throw new ApiException(HttpStatus.PAYMENT_REQUIRED, "INSUFFICIENT_COINS",
                    "เหรียญไม่พอ (คงเหลือ " + user.getCoinBalance() + ", ต้องใช้ " + amount + ")");
        }
        user.setCoinBalance(user.getCoinBalance().subtract(amount));
        return record(user, amount.negate(), type, orderId, topupId, note);
    }

    private AppUser lock(UUID userId) {
        return userRepo.findByIdForUpdate(userId).orElseThrow(() -> ApiException.notFound("User"));
    }

    private WalletTransaction record(AppUser user, BigDecimal signedAmount, TransactionType type, Long orderId, Long topupId, String note) {
        WalletTransaction tx = new WalletTransaction();
        tx.setUserId(user.getId());
        tx.setType(type);
        tx.setAmount(signedAmount);
        tx.setBalanceAfter(user.getCoinBalance());
        tx.setOrderId(orderId);
        tx.setTopupId(topupId);
        tx.setNote(note);
        return txRepo.save(tx);
    }

    private static void requirePositive(BigDecimal amount) {
        if (amount == null || amount.signum() <= 0) {
            throw ApiException.badRequest("INVALID_AMOUNT", "Amount must be greater than 0");
        }
    }
}
