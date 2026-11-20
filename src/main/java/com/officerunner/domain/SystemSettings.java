package com.officerunner.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalTime;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "system_settings")
@Getter
@Setter
public class SystemSettings {
    public static final short SINGLETON_ID = 1;

    @Id
    private Short id = SINGLETON_ID;

    @Column(name = "is_open")
    private boolean open;

    @Column(name = "open_time")
    private LocalTime openTime = LocalTime.of(10, 0);

    @Column(name = "close_time")
    private LocalTime closeTime = LocalTime.of(16, 0);

    private String timezone = "Asia/Bangkok";

    /** ช่วงเร่งด่วน: สั่งได้เฉพาะสมาชิก Premium (null = ไม่มีช่วงเร่งด่วน) */
    @Column(name = "rush_start")
    private LocalTime rushStart;

    @Column(name = "rush_end")
    private LocalTime rushEnd;

    @Column(name = "general_service_fee")
    private BigDecimal generalServiceFee = new BigDecimal("20");

    @Column(name = "premium_price")
    private BigDecimal premiumPrice = new BigDecimal("199");

    @Column(name = "premium_bonus_coins")
    private BigDecimal premiumBonusCoins = new BigDecimal("100");

    @Column(name = "premium_discount_percent")
    private BigDecimal premiumDiscountPercent = new BigDecimal("10");

    @Column(name = "qr_image_url")
    private String qrImageUrl;
}
