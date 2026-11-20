package com.officerunner.service;

import com.officerunner.common.ApiException;
import com.officerunner.domain.AppUser;
import com.officerunner.domain.Role;
import com.officerunner.repository.UserRepository;
import com.officerunner.web.dto.AuthRequests;
import com.officerunner.web.dto.MeResponse;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepo;
    private final PasswordEncoder passwordEncoder;
    private final JwtEncoder jwtEncoder;

    @Transactional
    public AuthRequests.AuthResponse register(AuthRequests.Register request) {
        String email = request.email().trim().toLowerCase();
        if (userRepo.existsByEmail(email)) {
            throw ApiException.conflict("EMAIL_ALREADY_EXISTS", "อีเมลนี้มีผู้ใช้งานในระบบแล้ว");
        }

        AppUser user = new AppUser();
        // id ให้ Hibernate สร้างเอง (@GeneratedValue UUID); ถ้า set เองก่อน save จะถูกมองเป็นแถวเดิมแล้วพัง
        user.setEmail(email);
        user.setFullName(request.fullName().trim());
        user.setPassword(passwordEncoder.encode(request.password()));
        user.setRole(Role.USER);
        user.setCoinBalance(BigDecimal.ZERO);
        user.setPremium(false);

        AppUser saved = userRepo.save(user);
        String token = generateToken(saved);
        return new AuthRequests.AuthResponse(token, "Bearer", MeResponse.from(saved));
    }

    @Transactional(readOnly = true)
    public AuthRequests.AuthResponse login(AuthRequests.Login request) {
        String email = request.email().trim().toLowerCase();
        AppUser user = userRepo.findByEmail(email)
                .orElseThrow(() -> ApiException.unauthorized("อีเมลหรือรหัสผ่านไม่ถูกต้อง"));

        if (!passwordEncoder.matches(request.password(), user.getPassword())) {
            throw ApiException.unauthorized("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
        }

        String token = generateToken(user);
        return new AuthRequests.AuthResponse(token, "Bearer", MeResponse.from(user));
    }

    private String generateToken(AppUser user) {
        Instant now = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer("office-runner-backend")
                .issuedAt(now)
                .expiresAt(now.plus(7, ChronoUnit.DAYS))
                .subject(user.getId().toString())
                .claim("email", user.getEmail())
                .claim("role", user.getRole().name())
                .build();

        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        return jwtEncoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
    }
}
