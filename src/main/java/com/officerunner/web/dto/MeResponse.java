package com.officerunner.web.dto;

import com.officerunner.domain.AppUser;
import com.officerunner.domain.Role;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record MeResponse(UUID id, String email, String fullName, Role role, boolean premium,
                         Instant premiumSince, BigDecimal coinBalance) {
    public static MeResponse from(AppUser u) {
        return new MeResponse(u.getId(), u.getEmail(), u.getFullName(), u.getRole(), u.isPremium(),
                u.getPremiumSince(), u.getCoinBalance());
    }
}
