package com.officerunner.repository;

import com.officerunner.domain.TopupRequest;
import com.officerunner.domain.TopupStatus;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

public interface TopupRequestRepository extends JpaRepository<TopupRequest, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from TopupRequest t where t.id = :id")
    Optional<TopupRequest> findByIdForUpdate(Long id);

    List<TopupRequest> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    List<TopupRequest> findByStatusOrderByCreatedAtAsc(TopupStatus status);
}
