package com.officerunner.web;

import com.officerunner.service.AuthService;
import com.officerunner.web.dto.AuthRequests;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthRequests.AuthResponse register(@Valid @RequestBody AuthRequests.Register request) {
        return authService.register(request);
    }

    @PostMapping("/login")
    public AuthRequests.AuthResponse login(@Valid @RequestBody AuthRequests.Login request) {
        return authService.login(request);
    }
}
