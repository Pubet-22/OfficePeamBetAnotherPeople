package com.officerunner.web.dto;

import com.officerunner.domain.CoffeeMenu;
import java.math.BigDecimal;

public record MenuResponse(Long id, String name, String description, BigDecimal price, boolean allowHot,
                           boolean allowIced, String imageUrl, boolean available, int sortOrder) {
    public static MenuResponse from(CoffeeMenu m) {
        return new MenuResponse(m.getId(), m.getName(), m.getDescription(), m.getPrice(), m.isAllowHot(),
                m.isAllowIced(), m.getImageUrl(), m.isAvailable(), m.getSortOrder());
    }
}
