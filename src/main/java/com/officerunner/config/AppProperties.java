package com.officerunner.config;

import java.math.BigDecimal;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public record AppProperties(
        Supabase supabase,
        List<String> corsAllowedOrigins,
        BigDecimal maxTip,
        BigDecimal maxTopup) {

    public record Supabase(String url, String jwtSecret) {
        public String issuer() {
            return url.replaceAll("/+$", "") + "/auth/v1";
        }

        public String jwksUri() {
            return issuer() + "/.well-known/jwks.json";
        }
    }
}
