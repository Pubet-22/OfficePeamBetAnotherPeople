package com.officerunner.config;

import java.math.BigDecimal;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public record AppProperties(
        List<String> corsAllowedOrigins,
        BigDecimal maxTip,
        BigDecimal maxTopup) {
}
