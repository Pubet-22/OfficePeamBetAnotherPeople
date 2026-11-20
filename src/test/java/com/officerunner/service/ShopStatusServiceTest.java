package com.officerunner.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import com.officerunner.domain.SystemSettings;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalTime;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

class ShopStatusServiceTest {

    /** Bangkok = UTC+7, so 03:30Z = 10:30 local */
    private ShopStatusService at(String utcInstant) {
        return new ShopStatusService(mock(SettingsService.class), Clock.fixed(Instant.parse(utcInstant), ZoneOffset.UTC));
    }

    private SystemSettings openShop() {
        SystemSettings s = new SystemSettings();
        s.setOpen(true);
        s.setRushStart(LocalTime.of(12, 0));
        s.setRushEnd(LocalTime.of(13, 0));
        return s;
    }

    @Test
    void openDuringBusinessHours() {
        var st = at("2026-11-20T03:30:00Z").evaluate(openShop(), false);
        assertThat(st.canOrder()).isTrue();
        assertThat(st.reasonCode()).isNull();
    }

    @Test
    void lockedWhenAdminSwitchIsOff() {
        SystemSettings s = openShop();
        s.setOpen(false);
        var st = at("2026-11-20T03:30:00Z").evaluate(s, true);
        assertThat(st.canOrder()).isFalse();
        assertThat(st.reasonCode()).isEqualTo("SHOP_CLOSED");
    }

    @Test
    void lockedOutsideHours() {
        // 16:00 local is closing time (exclusive)
        var st = at("2026-11-20T09:00:00Z").evaluate(openShop(), true);
        assertThat(st.canOrder()).isFalse();
        assertThat(st.reasonCode()).isEqualTo("OUTSIDE_HOURS");
        // 09:59 local
        assertThat(at("2026-11-20T02:59:00Z").evaluate(openShop(), true).canOrder()).isFalse();
    }

    @Test
    void rushHourOnlyPremium() {
        var svc = at("2026-11-20T05:15:00Z"); // 12:15 local
        assertThat(svc.evaluate(openShop(), false).reasonCode()).isEqualTo("RUSH_HOUR_PREMIUM_ONLY");
        assertThat(svc.evaluate(openShop(), true).canOrder()).isTrue();
    }
}
