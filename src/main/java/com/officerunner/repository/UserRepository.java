package com.officerunner.repository;

import com.officerunner.domain.AppUser;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

public interface UserRepository extends JpaRepository<AppUser, UUID> {

    /** ล็อกแถวผู้ใช้ไว้ระหว่างแก้ยอดเหรียญ กันยอดเพี้ยนเวลามีหลาย request พร้อมกัน */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from AppUser u where u.id = :id")
    Optional<AppUser> findByIdForUpdate(UUID id);

    Optional<AppUser> findByEmail(String email);

    boolean existsByEmail(String email);
}
