package com.officerunner.web;

import static com.officerunner.web.MeController.uid;

import com.officerunner.domain.OrderStatus;
import com.officerunner.domain.SystemSettings;
import com.officerunner.domain.TopupStatus;
import com.officerunner.service.MenuService;
import com.officerunner.service.OrderService;
import com.officerunner.service.SettingsService;
import com.officerunner.service.TopupService;
import com.officerunner.web.dto.*;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

/** ทุก endpoint ต้องเป็น ROLE_ADMIN (กำหนดใน SecurityConfig) */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final SettingsService settingsService;
    private final OrderService orderService;
    private final TopupService topupService;
    private final MenuService menuService;

    // ---------- shop settings / open-close switch ----------

    @GetMapping("/settings")
    SystemSettings settings() {
        return settingsService.get();
    }

    @PatchMapping("/settings")
    SystemSettings updateSettings(@Valid @RequestBody SettingsUpdateRequest body) {
        return settingsService.update(body);
    }

    /** ปุ่มลัด เปิด/ปิดรับคิว */
    @PostMapping("/shop/{state:open|close}")
    SystemSettings toggleShop(@PathVariable String state) {
        return settingsService.update(new SettingsUpdateRequest(state.equals("open"),
                null, null, null, null, null, null, null, null, null, null, null));
    }

    // ---------- queue ----------

    /** ?status=PENDING&status=ACCEPTED ... (ไม่ส่ง = งานที่ยังไม่จบทั้งหมด) เรียง Premium ก่อน */
    @GetMapping("/orders")
    List<OrderResponse> queue(@RequestParam(required = false) List<OrderStatus> status) {
        return orderService.queue(status);
    }

    @PatchMapping("/orders/{id}/status")
    OrderResponse updateStatus(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id,
                               @Valid @RequestBody Requests.UpdateOrderStatus body) {
        return orderService.updateStatus(uid(jwt), id, body.status(), body.reason());
    }

    @GetMapping("/earnings")
    Map<String, Object> earnings(@AuthenticationPrincipal Jwt jwt) {
        return orderService.earnings(uid(jwt));
    }

    // ---------- top-ups ----------

    @GetMapping("/topups")
    List<TopupResponse> topups(@RequestParam(defaultValue = "PENDING") TopupStatus status) {
        return topupService.byStatus(status);
    }

    @PostMapping("/topups/{id}/approve")
    TopupResponse approve(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) {
        return topupService.approve(uid(jwt), id);
    }

    @PostMapping("/topups/{id}/reject")
    TopupResponse reject(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id,
                         @Valid @RequestBody(required = false) Requests.RejectTopup body) {
        return topupService.reject(uid(jwt), id, body == null ? null : body.reason());
    }

    // ---------- coffee menus ----------

    @GetMapping("/menus")
    List<MenuResponse> allMenus() {
        return menuService.list(true);
    }

    @PostMapping("/menus")
    @ResponseStatus(HttpStatus.CREATED)
    MenuResponse createMenu(@Valid @RequestBody MenuRequest body) {
        return menuService.create(body);
    }

    @PutMapping("/menus/{id}")
    MenuResponse updateMenu(@PathVariable Long id, @Valid @RequestBody MenuRequest body) {
        return menuService.update(id, body);
    }
}
