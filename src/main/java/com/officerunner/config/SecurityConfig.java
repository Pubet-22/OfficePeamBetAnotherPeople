package com.officerunner.config;

import com.officerunner.service.UserService;
import java.nio.charset.StandardCharsets;
import java.util.List;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * ตรวจ access token ที่ออกโดย Supabase Auth (frontend login ด้วย supabase-js แล้วส่ง
 * {@code Authorization: Bearer <access_token>} มาที่ backend).
 * Role (USER/ADMIN) อ่านจากตาราง public.users ไม่ได้เชื่อจาก token.
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http, UserService userService) throws Exception {
        http.csrf(c -> c.disable())
                .cors(c -> {})
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(a -> a
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/health", "/api/menus", "/api/shop/status").permitAll()
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        .anyRequest().authenticated())
                .oauth2ResourceServer(o -> o.jwt(j -> j.jwtAuthenticationConverter(new SupabaseJwtConverter(userService))));
        return http.build();
    }

    @Bean
    JwtDecoder jwtDecoder(AppProperties props) {
        AppProperties.Supabase sb = props.supabase();
        NimbusJwtDecoder decoder;
        if (sb.jwtSecret() != null && !sb.jwtSecret().isBlank()) {
            var key = new SecretKeySpec(sb.jwtSecret().getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            decoder = NimbusJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build();
        } else {
            decoder = NimbusJwtDecoder.withJwkSetUri(sb.jwksUri())
                    .jwsAlgorithms(algs -> {
                        algs.add(SignatureAlgorithm.ES256);
                        algs.add(SignatureAlgorithm.RS256);
                    })
                    .build();
        }
        OAuth2TokenValidator<Jwt> audience = new JwtClaimValidator<List<String>>(
                "aud", aud -> aud != null && aud.contains("authenticated"));
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
                JwtValidators.createDefaultWithIssuer(sb.issuer()), audience));
        return decoder;
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource(AppProperties props) {
        CorsConfiguration cfg = new CorsConfiguration();
        cfg.setAllowedOrigins(props.corsAllowedOrigins());
        cfg.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        cfg.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", cfg);
        return source;
    }
}
