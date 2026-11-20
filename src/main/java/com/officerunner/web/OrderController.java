package com.officerunner.web;

import static com.officerunner.web.MeController.uid;

import com.officerunner.service.OrderService;
import com.officerunner.web.dto.CreateOrderRequest;
import com.officerunner.web.dto.OrderResponse;
import com.officerunner.web.dto.Requests;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    OrderResponse create(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody CreateOrderRequest body) {
        return orderService.create(uid(jwt), body);
    }

    @GetMapping
    List<OrderResponse> mine(@AuthenticationPrincipal Jwt jwt, @RequestParam(defaultValue = "50") int limit) {
        return orderService.myOrders(uid(jwt), limit);
    }

    @GetMapping("/{id}")
    OrderResponse get(@AuthenticationPrincipal Jwt jwt, Authentication auth, @PathVariable Long id) {
        boolean admin = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        return orderService.getForUser(uid(jwt), admin, id);
    }

    @PostMapping("/{id}/cancel")
    OrderResponse cancel(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id,
                         @Valid @RequestBody(required = false) Requests.Cancel body) {
        return orderService.cancelByUser(uid(jwt), id, body == null ? null : body.reason());
    }

    @PostMapping("/{id}/tip")
    OrderResponse tip(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id, @Valid @RequestBody Requests.Tip body) {
        return orderService.tip(uid(jwt), id, body.amount());
    }
}
