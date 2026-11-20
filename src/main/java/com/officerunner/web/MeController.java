package com.officerunner.web;

import com.officerunner.service.TopupService;
import com.officerunner.service.UserService;
import com.officerunner.web.dto.MeResponse;
import com.officerunner.web.dto.TopupCreateRequest;
import com.officerunner.web.dto.TopupResponse;
import com.officerunner.web.dto.TransactionResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class MeController {

    private final UserService userService;
    private final TopupService topupService;

    @GetMapping("/me")
    MeResponse me(@AuthenticationPrincipal Jwt jwt) {
        return userService.me(uid(jwt));
    }

    @PostMapping("/me/premium")
    MeResponse upgrade(@AuthenticationPrincipal Jwt jwt) {
        return userService.upgradeToPremium(uid(jwt));
    }

    @GetMapping("/wallet/transactions")
    List<TransactionResponse> transactions(@AuthenticationPrincipal Jwt jwt, @RequestParam(defaultValue = "50") int limit) {
        return userService.transactions(uid(jwt), limit);
    }

    @PostMapping("/wallet/topups")
    @ResponseStatus(HttpStatus.CREATED)
    TopupResponse topup(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody TopupCreateRequest body) {
        return topupService.create(uid(jwt), body);
    }

    @GetMapping("/wallet/topups")
    List<TopupResponse> myTopups(@AuthenticationPrincipal Jwt jwt, @RequestParam(defaultValue = "50") int limit) {
        return topupService.mine(uid(jwt), limit);
    }

    static UUID uid(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
