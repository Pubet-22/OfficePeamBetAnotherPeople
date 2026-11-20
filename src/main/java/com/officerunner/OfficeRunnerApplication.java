package com.officerunner;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class OfficeRunnerApplication {
    public static void main(String[] args) {
        SpringApplication.run(OfficeRunnerApplication.class, args);
    }
}
