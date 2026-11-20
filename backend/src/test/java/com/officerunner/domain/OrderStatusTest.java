package com.officerunner.domain;

import static com.officerunner.domain.OrderStatus.*;
import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class OrderStatusTest {

    @Test
    void happyPathIsAllowed() {
        assertThat(PENDING.canTransitionTo(ACCEPTED)).isTrue();
        assertThat(ACCEPTED.canTransitionTo(IN_PROGRESS)).isTrue();
        assertThat(IN_PROGRESS.canTransitionTo(COMPLETED)).isTrue();
    }

    @Test
    void cancelAllowedUntilCompleted() {
        assertThat(PENDING.canTransitionTo(CANCELLED)).isTrue();
        assertThat(ACCEPTED.canTransitionTo(CANCELLED)).isTrue();
        assertThat(IN_PROGRESS.canTransitionTo(CANCELLED)).isTrue();
        assertThat(COMPLETED.canTransitionTo(CANCELLED)).isFalse();
    }

    @Test
    void cannotSkipOrGoBack() {
        assertThat(PENDING.canTransitionTo(COMPLETED)).isFalse();
        assertThat(PENDING.canTransitionTo(IN_PROGRESS)).isFalse();
        assertThat(IN_PROGRESS.canTransitionTo(ACCEPTED)).isFalse();
        assertThat(CANCELLED.canTransitionTo(PENDING)).isFalse();
    }
}
