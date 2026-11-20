package com.officerunner.web;

import com.officerunner.service.MenuService;
import com.officerunner.service.ShopStatusService;
import com.officerunner.service.UserService;
import com.officerunner.web.dto.MenuResponse;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class PublicController {

    private final MenuService menuService;
    private final ShopStatusService shopStatusService;
    private final UserService userService;

    @GetMapping("/health")
    Map<String, String> health() {
        return Map.of("status", "ok");
    }

    @GetMapping("/menus")
    List<MenuResponse> menus() {
        return menuService.list(false);
    }

    /** ไม่ต้อง login ก็เรียกได้; ถ้าส่ง token มาจะคำนวณ canOrder ตามสิทธิ์ Premium ของผู้ใช้ */
    @GetMapping("/shop/status")
    ShopStatusService.ShopStatus shopStatus(@AuthenticationPrincipal Jwt jwt) {
        boolean premium = jwt != null && userService.get(UUID.fromString(jwt.getSubject())).isPremium();
        return shopStatusService.statusFor(premium);
    }
}
