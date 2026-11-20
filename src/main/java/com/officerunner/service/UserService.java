package com.officerunner.service;

import com.officerunner.common.ApiException;
import com.officerunner.domain.AppUser;
import com.officerunner.domain.SystemSettings;
import com.officerunner.domain.TransactionType;
import com.officerunner.repository.TransactionRepository;
import com.officerunner.repository.UserRepository;
import com.officerunner.web.dto.MeResponse;
import com.officerunner.web.dto.TransactionResponse;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepo;
    private final TransactionRepository txRepo;
    private final WalletService wallet;
    private final SettingsService settingsService;
    private final Clock clock;

    /** เรียกทุก request ที่มี JWT: ถ้ายังไม่มีแถวใน public.users ให้สร้าง (กรณี trigger ไม่ได้ติดตั้ง) */
    @Transactional
    public AppUser syncFromJwt(Jwt jwt) {
        UUID id = UUID.fromString(jwt.getSubject());
        return userRepo.findById(id).orElseGet(() -> {
            userRepo.insertIfMissing(id, jwt.getClaimAsString("email"), fullNameOf(jwt));
            return userRepo.findById(id).orElseThrow();
        });
    }

    @Transactional(readOnly = true)
    public AppUser get(UUID id) {
        return userRepo.findById(id).orElseThrow(() -> ApiException.notFound("User"));
    }

    @Transactional(readOnly = true)
    public MeResponse me(UUID id) {
        return MeResponse.from(get(id));
    }

    /** อัปเกรดเป็น Premium: หักค่าสมัครจาก wallet (ถ้ามี) แล้วแจก Bonus Coins ทันที */
    @Transactional
    public MeResponse upgradeToPremium(UUID userId) {
        AppUser user = userRepo.findByIdForUpdate(userId).orElseThrow(() -> ApiException.notFound("User"));
        if (user.isPremium()) {
            throw ApiException.conflict("ALREADY_PREMIUM", "คุณเป็นสมาชิก Premium อยู่แล้ว");
        }
        SystemSettings s = settingsService.get();
        if (s.getPremiumPrice().signum() > 0) {
            wallet.debit(userId, s.getPremiumPrice(), TransactionType.PREMIUM_UPGRADE, null, null, "สมัครสมาชิก Premium");
        }
        user.setPremium(true);
        user.setPremiumSince(Instant.now(clock));
        if (s.getPremiumBonusCoins().signum() > 0) {
            wallet.credit(userId, s.getPremiumBonusCoins(), TransactionType.PREMIUM_BONUS, null, null, "โบนัสต้อนรับสมาชิก Premium");
        }
        return MeResponse.from(user);
    }

    @Transactional(readOnly = true)
    public List<TransactionResponse> transactions(UUID userId, int limit) {
        return txRepo.findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(0, clampLimit(limit)))
                .stream().map(TransactionResponse::from).toList();
    }

    static int clampLimit(int limit) {
        return Math.max(1, Math.min(limit, 200));
    }

    private static String fullNameOf(Jwt jwt) {
        Object meta = jwt.getClaims().get("user_metadata");
        if (meta instanceof Map<?, ?> m) {
            Object n = m.get("full_name");
            if (n == null) n = m.get("name");
            return n == null ? null : n.toString();
        }
        return null;
    }
}
