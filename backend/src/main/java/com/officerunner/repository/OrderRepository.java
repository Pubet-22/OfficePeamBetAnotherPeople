package com.officerunner.repository;

import com.officerunner.domain.OrderStatus;
import com.officerunner.domain.ServiceOrder;
import jakarta.persistence.LockModeType;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

public interface OrderRepository extends JpaRepository<ServiceOrder, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select o from ServiceOrder o where o.id = :id")
    Optional<ServiceOrder> findByIdForUpdate(Long id);

    @EntityGraph(attributePaths = "menu")
    List<ServiceOrder> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    /** คิวฝั่งแอดมิน: Premium (priority) มาก่อน แล้วเรียงตามเวลาสั่ง */
    @EntityGraph(attributePaths = "menu")
    List<ServiceOrder> findByStatusInOrderByPriorityDescCreatedAtAsc(Collection<OrderStatus> statuses);

    long countByStatusAndPriority(OrderStatus status, boolean priority);

    long countByStatusAndPriorityAndCreatedAtBefore(OrderStatus status, boolean priority, Instant createdAt);

    @Query("select coalesce(sum(o.tipAmount), 0) from ServiceOrder o where o.runnerId = :runnerId and o.status = com.officerunner.domain.OrderStatus.COMPLETED")
    BigDecimal sumTipsByRunner(UUID runnerId);

    @Query("select coalesce(sum(o.totalPrice), 0) from ServiceOrder o where o.runnerId = :runnerId and o.status = com.officerunner.domain.OrderStatus.COMPLETED")
    BigDecimal sumRevenueByRunner(UUID runnerId);

    long countByRunnerIdAndStatus(UUID runnerId, OrderStatus status);
}
