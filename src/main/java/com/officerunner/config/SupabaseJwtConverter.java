package com.officerunner.config;

import com.officerunner.domain.AppUser;
import com.officerunner.service.UserService;
import java.util.List;
import java.util.UUID;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

/** แปลง role ใน DB เป็น ROLE_USER / ROLE_ADMIN */
public class SupabaseJwtConverter implements Converter<Jwt, AbstractAuthenticationToken> {

    private final UserService userService;

    public SupabaseJwtConverter(UserService userService) {
        this.userService = userService;
    }

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        AppUser user;
        try {
            user = userService.get(UUID.fromString(jwt.getSubject()));
        } catch (Exception e) {
            user = userService.syncFromJwt(jwt);
        }
        var authorities = List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()));
        return new JwtAuthenticationToken(jwt, authorities, jwt.getSubject());
    }
}
