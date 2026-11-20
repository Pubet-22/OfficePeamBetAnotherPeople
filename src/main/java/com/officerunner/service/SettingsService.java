package com.officerunner.service;

import com.officerunner.common.ApiException;
import com.officerunner.domain.SystemSettings;
import com.officerunner.repository.SystemSettingsRepository;
import com.officerunner.web.dto.SettingsUpdateRequest;
import java.time.DateTimeException;
import java.time.ZoneId;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SettingsService {

    private final SystemSettingsRepository repo;

    @Transactional
    public SystemSettings get() {
        return repo.findById(SystemSettings.SINGLETON_ID).orElseGet(() -> repo.save(new SystemSettings()));
    }

    @Transactional
    public SystemSettings update(SettingsUpdateRequest r) {
        SystemSettings s = get();
        if (r.isOpen() != null) s.setOpen(r.isOpen());
        if (r.openTime() != null) s.setOpenTime(r.openTime());
        if (r.closeTime() != null) s.setCloseTime(r.closeTime());
        if (r.timezone() != null) {
            try {
                ZoneId.of(r.timezone());
            } catch (DateTimeException e) {
                throw ApiException.badRequest("INVALID_TIMEZONE", "Unknown timezone " + r.timezone());
            }
            s.setTimezone(r.timezone());
        }
        if (Boolean.TRUE.equals(r.clearRushHour())) {
            s.setRushStart(null);
            s.setRushEnd(null);
        } else {
            if (r.rushStart() != null) s.setRushStart(r.rushStart());
            if (r.rushEnd() != null) s.setRushEnd(r.rushEnd());
        }
        if (r.generalServiceFee() != null) s.setGeneralServiceFee(r.generalServiceFee());
        if (r.premiumPrice() != null) s.setPremiumPrice(r.premiumPrice());
        if (r.premiumBonusCoins() != null) s.setPremiumBonusCoins(r.premiumBonusCoins());
        if (r.premiumDiscountPercent() != null) s.setPremiumDiscountPercent(r.premiumDiscountPercent());
        if (r.qrImageUrl() != null) s.setQrImageUrl(r.qrImageUrl().isBlank() ? null : r.qrImageUrl());

        if (!s.getOpenTime().isBefore(s.getCloseTime())) {
            throw ApiException.badRequest("INVALID_HOURS", "openTime must be before closeTime");
        }
        if ((s.getRushStart() == null) != (s.getRushEnd() == null)
                || (s.getRushStart() != null && !s.getRushStart().isBefore(s.getRushEnd()))) {
            throw ApiException.badRequest("INVALID_RUSH_HOUR", "rushStart and rushEnd must both be set and rushStart < rushEnd");
        }
        return s;
    }
}
