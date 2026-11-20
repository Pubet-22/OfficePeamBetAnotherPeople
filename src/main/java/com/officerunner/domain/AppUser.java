package com.officerunner.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "users")
@Getter
@Setter
public class AppUser {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password;

    @Column(name = "full_name")
    private String fullName;

    @Enumerated(EnumType.STRING)
    private Role role = Role.USER;

    @Column(name = "is_premium")
    private boolean premium;

    @Column(name = "premium_since")
    private Instant premiumSince;

    @Column(name = "coin_balance")
    private BigDecimal coinBalance = BigDecimal.ZERO;

    @Column(name = "created_at", insertable = false, updatable = false)
    private Instant createdAt;
}
