package com.officerunner.domain;

import java.util.EnumSet;
import java.util.Set;

public enum OrderStatus {
    PENDING, ACCEPTED, IN_PROGRESS, COMPLETED, CANCELLED;

    public static final Set<OrderStatus> ACTIVE = EnumSet.of(PENDING, ACCEPTED, IN_PROGRESS);

    /** Pending -> Accepted -> In Progress -> Completed; ยกเลิกได้ทุกขั้นก่อน Completed */
    public boolean canTransitionTo(OrderStatus next) {
        return switch (this) {
            case PENDING -> next == ACCEPTED || next == CANCELLED;
            case ACCEPTED -> next == IN_PROGRESS || next == CANCELLED;
            case IN_PROGRESS -> next == COMPLETED || next == CANCELLED;
            case COMPLETED, CANCELLED -> false;
        };
    }
}
