package com.officerunner.web.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class AuthRequests {

    public record Register(
            @NotBlank(message = "กรุณาระบุอีเมล")
            @Email(message = "รูปแบบอีเมลไม่ถูกต้อง")
            String email,

            @NotBlank(message = "กรุณาระบุรหัสผ่าน")
            @Size(min = 6, message = "รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร")
            String password,

            @NotBlank(message = "กรุณาระบุชื่อ-นามสกุล")
            String fullName
    ) {}

    public record Login(
            @NotBlank(message = "กรุณาระบุอีเมล")
            @Email(message = "รูปแบบอีเมลไม่ถูกต้อง")
            String email,

            @NotBlank(message = "กรุณาระบุรหัสผ่าน")
            String password
    ) {}

    public record AuthResponse(
            String accessToken,
            String tokenType,
            MeResponse user
    ) {}
}
