package com.officerunner.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "coffee_menus")
@Getter
@Setter
public class CoffeeMenu {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String description;
    private BigDecimal price;

    @Column(name = "allow_hot")
    private boolean allowHot = true;

    @Column(name = "allow_iced")
    private boolean allowIced = true;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(name = "is_available")
    private boolean available = true;

    @Column(name = "sort_order")
    private int sortOrder;

    public boolean allows(Temperature t) {
        return t == Temperature.HOT ? allowHot : allowIced;
    }
}
