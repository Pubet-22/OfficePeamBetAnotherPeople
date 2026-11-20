package com.officerunner.repository;

import com.officerunner.domain.SystemSettings;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SystemSettingsRepository extends JpaRepository<SystemSettings, Short> {
}
