package com.officerunner.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "orders")
@Getter
@Setter
public class ServiceOrder {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id")
    private UUID userId;

    /** แอดมิน/Runner ที่กดรับงาน (ใช้รับทิป) */
    @Column(name = "runner_id")
    private UUID runnerId;

    @Enumerated(EnumType.STRING)
    @Column(name = "service_type")
    private ServiceType serviceType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "menu_id")
    private CoffeeMenu menu;

    private int quantity = 1;

    @Enumerated(EnumType.STRING)
    private Temperature temperature;

    @Column(name = "sweetness_level")
    private Integer sweetnessLevel;

    @Enumerated(EnumType.STRING)
    @Column(name = "general_category")
    private GeneralCategory generalCategory;

    @Column(name = "custom_details")
    private String customDetails;

    @Column(name = "attachment_url")
    private String attachmentUrl;

    @Column(name = "desk_location")
    private String deskLocation;

    @Column(name = "location_note")
    private String locationNote;

    @Enumerated(EnumType.STRING)
    private OrderStatus status = OrderStatus.PENDING;

    @Column(name = "is_priority")
    private boolean priority;

    @Column(name = "cancel_reason")
    private String cancelReason;

    @Column(name = "cancelled_by")
    private UUID cancelledBy;

    @Column(name = "accepted_at")
    private Instant acceptedAt;

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "cancelled_at")
    private Instant cancelledAt;

    private BigDecimal subtotal;

    @Column(name = "discount_amount")
    private BigDecimal discountAmount = BigDecimal.ZERO;

    @Column(name = "total_price")
    private BigDecimal totalPrice;

    @Column(name = "tip_amount")
    private BigDecimal tipAmount = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method")
    private PaymentMethod paymentMethod;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_status")
    private PaymentStatus paymentStatus;

    @Column(name = "payment_slip_url")
    private String paymentSlipUrl;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;
}
