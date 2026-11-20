package com.officerunner.service;

import com.officerunner.common.ApiException;
import com.officerunner.config.AppProperties;
import com.officerunner.domain.TopupRequest;
import com.officerunner.domain.TopupStatus;
import com.officerunner.domain.TransactionType;
import com.officerunner.repository.TopupRequestRepository;
import com.officerunner.web.dto.TopupCreateRequest;
import com.officerunner.web.dto.TopupResponse;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** ลูกค้าสแกน QR จำลอง + แนบสลิป -> แอดมินตรวจแล้วกด approve -> เหรียญเข้ากระเป๋า */
@Service
@RequiredArgsConstructor
public class TopupService {

    private final TopupRequestRepository repo;
    private final WalletService wallet;
    private final AppProperties props;
    private final Clock clock;

    @Transactional
    public TopupResponse create(UUID userId, TopupCreateRequest r) {
        if (r.amount().compareTo(props.maxTopup()) > 0) {
            throw ApiException.badRequest("TOPUP_TOO_LARGE", "เติมได้สูงสุดครั้งละ " + props.maxTopup() + " เหรียญ");
        }
        TopupRequest t = new TopupRequest();
        t.setUserId(userId);
        t.setAmount(r.amount());
        t.setSlipUrl(r.slipUrl());
        return TopupResponse.from(repo.save(t));
    }

    @Transactional(readOnly = true)
    public List<TopupResponse> mine(UUID userId, int limit) {
        return repo.findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(0, UserService.clampLimit(limit)))
                .stream().map(TopupResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<TopupResponse> byStatus(TopupStatus status) {
        return repo.findByStatusOrderByCreatedAtAsc(status).stream().map(TopupResponse::from).toList();
    }

    @Transactional
    public TopupResponse approve(UUID adminId, Long id) {
        TopupRequest t = lockPending(id);
        t.setStatus(TopupStatus.APPROVED);
        t.setReviewedBy(adminId);
        t.setReviewedAt(Instant.now(clock));
        wallet.credit(t.getUserId(), t.getAmount(), TransactionType.TOPUP, null, t.getId(), "เติมเหรียญ");
        return TopupResponse.from(t);
    }

    @Transactional
    public TopupResponse reject(UUID adminId, Long id, String reason) {
        TopupRequest t = lockPending(id);
        t.setStatus(TopupStatus.REJECTED);
        t.setReviewedBy(adminId);
        t.setReviewedAt(Instant.now(clock));
        t.setRejectReason(reason);
        return TopupResponse.from(t);
    }

    private TopupRequest lockPending(Long id) {
        TopupRequest t = repo.findByIdForUpdate(id).orElseThrow(() -> ApiException.notFound("Topup request"));
        if (t.getStatus() != TopupStatus.PENDING) {
            throw ApiException.conflict("TOPUP_ALREADY_REVIEWED", "คำขอนี้ถูกตรวจสอบไปแล้ว (" + t.getStatus() + ")");
        }
        return t;
    }
}
