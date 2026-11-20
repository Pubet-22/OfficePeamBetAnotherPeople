package com.officerunner.config;

import com.officerunner.repository.UserRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.InvalidBearerTokenException;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

/**
 * อ่าน role ปัจจุบันจากตาราง users (ไม่เชื่อ role ใน token) แล้วแปลงเป็น ROLE_USER / ROLE_ADMIN.
 * ถ้า token อ้างถึงผู้ใช้ที่ไม่มีในระบบ ตอบ 401.
 */
public class DbRoleJwtConverter implements Converter<Jwt, AbstractAuthenticationToken> {

    private final UserRepository userRepo;

    public DbRoleJwtConverter(UserRepository userRepo) {
        this.userRepo = userRepo;
    }

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        UUID id;
        try {
            id = UUID.fromString(jwt.getSubject());
        } catch (IllegalArgumentException | NullPointerException e) {
            throw new InvalidBearerTokenException("Invalid subject");
        }
        var user = userRepo.findById(id).orElseThrow(() -> new InvalidBearerTokenException("Unknown user"));
        var authorities = List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()));
        return new JwtAuthenticationToken(jwt, authorities, jwt.getSubject());
    }
}
