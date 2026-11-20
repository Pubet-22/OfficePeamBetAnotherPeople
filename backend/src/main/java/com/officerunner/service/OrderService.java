package com.officerunner.service;

import com.officerunner.common.ApiException;
import com.officerunner.config.AppProperties;
import com.officerunner.domain.*;
import com.officerunner.repository.CoffeeMenuRepository;
import com.officerunner.repository.OrderRepository;
import com.officerunner.web.dto.CreateOrderRequest;
import com.officerunner.web.dto.OrderResponse;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class OrderService {

    static final Set<Integer> SWEETNESS_LEVELS = Set.of(0, 25, 50, 75, 100);
    private static final BigDecimal HUNDRED = new BigDecimal("100");

    private final OrderRepository orderRepo;
    private final CoffeeMenuRepository menuRepo;
    private final UserService userService;
    private final SettingsService settingsService;
    private final ShopStatusService shopStatusService;
    private final WalletService wallet;
    private final AppProperties props;
    private final Clock clock;

    // ------------------------------------------------------------------ customer

    @Transactional
    public OrderResponse create(UUID userId, CreateOrderRequest r) {
        AppUser user = userService.get(userId);

        // 1) ตรวจสถานะร้าน (เวลาทำการ + สวิตช์แอดมิน + ช่วงเร่งด่วน)
        var shop = shopStatusService.statusFor(user.isPremium());
        if (!shop.canOrder()) {
            throw new ApiException(HttpStatus.CONFLICT, shop.reasonCode(), shop.message());
        }

        SystemSettings settings = settingsService.get();
        ServiceOrder o = new ServiceOrder();
        o.setUserId(userId);
        o.setServiceType(r.serviceType());
        o.setDeskLocation(r.deskLocation().trim());
        o.setLocationNote(blankToNull(r.locationNote()));
        o.setPriority(user.isPremium());

        // 2) ประเภทบริการ + คำนวณราคา
        BigDecimal subtotal = switch (r.serviceType()) {
            case COFFEE -> fillCoffee(o, r, settings);
            case GENERAL -> fillGeneral(o, r, settings);
        };
        subtotal = subtotal.setScale(2, RoundingMode.HALF_UP);
        BigDecimal discount = user.isPremium()
                ? subtotal.multiply(settings.getPremiumDiscountPercent()).divide(HUNDRED, 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;
        o.setSubtotal(subtotal);
        o.setDiscountAmount(discount);
        o.setTotalPrice(subtotal.subtract(discount));

        // 3) ชำระเงิน
        o.setPaymentMethod(r.paymentMethod());
        if (r.paymentMethod() == PaymentMethod.WALLET) {
            o.setPaymentStatus(PaymentStatus.PAID);
            orderRepo.save(o);
            if (o.getTotalPrice().signum() > 0) {
                wallet.debit(userId, o.getTotalPrice(), TransactionType.ORDER_PAYMENT, o.getId(), null, "ค่าบริการออเดอร์ #" + o.getId());
            }
        } else {
            if (!Boolean.TRUE.equals(r.qrTransferConfirmed())) {
                throw ApiException.badRequest("QR_NOT_CONFIRMED", "กรุณากดยืนยันการโอนเงินผ่าน QR ก่อน");
            }
            o.setPaymentStatus(PaymentStatus.AWAITING_VERIFICATION);
            o.setPaymentSlipUrl(blankToNull(r.paymentSlipUrl()));
            orderRepo.save(o);
        }
        return toResponse(o);
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> myOrders(UUID userId, int limit) {
        return orderRepo.findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(0, UserService.clampLimit(limit)))
                .stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public OrderResponse getForUser(UUID userId, boolean isAdmin, Long orderId) {
        ServiceOrder o = orderRepo.findById(orderId).orElseThrow(() -> ApiException.notFound("Order"));
        if (!isAdmin && !o.getUserId().equals(userId)) {
            throw ApiException.notFound("Order");
        }
        return toResponse(o);
    }

    /** ลูกค้ายกเลิกเองได้เฉพาะตอนยัง Pending */
    @Transactional
    public OrderResponse cancelByUser(UUID userId, Long orderId, String reason) {
        ServiceOrder o = lockOwned(userId, orderId);
        if (o.getStatus() != OrderStatus.PENDING) {
            throw ApiException.conflict("CANNOT_CANCEL", "ยกเลิกได้เฉพาะออเดอร์ที่ยังไม่ถูกรับงาน");
        }
        cancel(o, userId, reason == null || reason.isBlank() ? "ลูกค้ายกเลิก" : reason);
        return toResponse(o);
    }

    /** ให้ทิปหลังงาน Completed: หักเหรียญลูกค้า -> บวกเข้ากระเป๋า Runner ที่รับงาน */
    @Transactional
    public OrderResponse tip(UUID userId, Long orderId, BigDecimal amount) {
        ServiceOrder o = lockOwned(userId, orderId);
        if (o.getStatus() != OrderStatus.COMPLETED) {
            throw ApiException.conflict("ORDER_NOT_COMPLETED", "ให้ทิปได้หลังงานเสร็จแล้วเท่านั้น");
        }
        if (o.getTipAmount().signum() > 0) {
            throw ApiException.conflict("ALREADY_TIPPED", "ออเดอร์นี้ให้ทิปไปแล้ว");
        }
        if (o.getRunnerId() == null) {
            throw ApiException.conflict("NO_RUNNER", "ไม่พบผู้รับงานของออเดอร์นี้");
        }
        if (amount.compareTo(props.maxTip()) > 0) {
            throw ApiException.badRequest("TIP_TOO_LARGE", "ทิปได้สูงสุด " + props.maxTip() + " เหรียญ");
        }
        BigDecimal tip = amount.setScale(2, RoundingMode.HALF_UP);
        wallet.debit(userId, tip, TransactionType.TIP_SENT, o.getId(), null, "ทิปออเดอร์ #" + o.getId());
        wallet.credit(o.getRunnerId(), tip, TransactionType.TIP_RECEIVED, o.getId(), null, "ได้รับทิปออเดอร์ #" + o.getId());
        o.setTipAmount(tip);
        return toResponse(o);
    }

    // ------------------------------------------------------------------ admin

    @Transactional(readOnly = true)
    public List<OrderResponse> queue(Collection<OrderStatus> statuses) {
        Collection<OrderStatus> s = statuses == null || statuses.isEmpty() ? OrderStatus.ACTIVE : statuses;
        return orderRepo.findByStatusInOrderByPriorityDescCreatedAtAsc(s).stream().map(this::toResponse).toList();
    }

    @Transactional
    public OrderResponse updateStatus(UUID adminId, Long orderId, OrderStatus next, String reason) {
        ServiceOrder o = orderRepo.findByIdForUpdate(orderId).orElseThrow(() -> ApiException.notFound("Order"));
        if (!o.getStatus().canTransitionTo(next)) {
            throw ApiException.conflict("INVALID_TRANSITION", "เปลี่ยนสถานะจาก " + o.getStatus() + " เป็น " + next + " ไม่ได้");
        }
        Instant now = Instant.now(clock);
        switch (next) {
            case ACCEPTED -> {
                o.setRunnerId(adminId);
                o.setAcceptedAt(now);
                // แอดมินรับงาน = ตรวจยอดโอน QR แล้ว
                if (o.getPaymentStatus() == PaymentStatus.AWAITING_VERIFICATION) {
                    o.setPaymentStatus(PaymentStatus.PAID);
                }
            }
            case IN_PROGRESS -> o.setStartedAt(now);
            case COMPLETED -> o.setCompletedAt(now);
            case CANCELLED -> cancel(o, adminId, reason == null || reason.isBlank() ? "ยกเลิกโดยผู้ให้บริการ" : reason);
            case PENDING -> throw new IllegalStateException("unreachable");
        }
        o.setStatus(next);
        return toResponse(o);
    }

    /** สรุปรายได้ของ Runner: ยอดออเดอร์ที่ส่งสำเร็จ + ทิป + ยอดเหรียญในกระเป๋า */
    @Transactional(readOnly = true)
    public Map<String, Object> earnings(UUID runnerId) {
        AppUser runner = userService.get(runnerId);
        return Map.of(
                "completedOrders", orderRepo.countByRunnerIdAndStatus(runnerId, OrderStatus.COMPLETED),
                "serviceRevenue", orderRepo.sumRevenueByRunner(runnerId),
                "tipsReceived", orderRepo.sumTipsByRunner(runnerId),
                "coinBalance", runner.getCoinBalance());
    }

    // ------------------------------------------------------------------ internals

    private BigDecimal fillCoffee(ServiceOrder o, CreateOrderRequest r, SystemSettings s) {
        if (r.menuId() == null) throw ApiException.badRequest("MENU_REQUIRED", "กรุณาเลือกเมนู");
        CoffeeMenu menu = menuRepo.findById(r.menuId()).orElseThrow(() -> ApiException.notFound("Menu"));
        if (!menu.isAvailable()) throw ApiException.conflict("MENU_UNAVAILABLE", menu.getName() + " หมดชั่วคราว");
        Temperature temp = r.temperature() == null ? (menu.isAllowIced() ? Temperature.ICED : Temperature.HOT) : r.temperature();
        if (!menu.allows(temp)) throw ApiException.badRequest("TEMPERATURE_NOT_ALLOWED", menu.getName() + " ไม่มีแบบ " + temp);
        Integer sweet = r.sweetnessLevel(); // ไม่บังคับ: ความหวานส่วนใหญ่กำหนดมาจากเมนูของตู้แล้ว
        if (sweet != null && !SWEETNESS_LEVELS.contains(sweet)) {
            throw ApiException.badRequest("INVALID_SWEETNESS", "ระดับความหวานต้องเป็น 0, 25, 50, 75 หรือ 100");
        }
        int qty = r.quantity() == null ? 1 : r.quantity();
        o.setMenu(menu);
        o.setTemperature(temp);
        o.setSweetnessLevel(sweet);
        o.setQuantity(qty);
        o.setCustomDetails(blankToNull(r.customDetails())); // หมายเหตุเพิ่มเติม เช่น "นมโอ๊ต"
        // ราคาเครื่องดื่ม (ปัจจุบันฟรี = 0) + ค่าวิ่งต่อออเดอร์
        return menu.getPrice().multiply(BigDecimal.valueOf(qty)).add(s.getCoffeeServiceFee());
    }

    private BigDecimal fillGeneral(ServiceOrder o, CreateOrderRequest r, SystemSettings s) {
        if (r.customDetails() == null || r.customDetails().isBlank()) {
            throw ApiException.badRequest("DETAILS_REQUIRED", "กรุณาระบุรายละเอียดงาน");
        }
        o.setGeneralCategory(r.generalCategory() == null ? GeneralCategory.OTHER : r.generalCategory());
        o.setCustomDetails(r.customDetails().trim());
        o.setAttachmentUrl(blankToNull(r.attachmentUrl()));
        o.setQuantity(1);
        return s.getGeneralServiceFee();
    }

    /** ยกเลิก + คืนเหรียญเข้ากระเป๋าอัตโนมัติ (ถ้าชำระแล้ว) */
    private void cancel(ServiceOrder o, UUID by, String reason) {
        o.setStatus(OrderStatus.CANCELLED);
        o.setCancelledBy(by);
        o.setCancelReason(reason);
        o.setCancelledAt(Instant.now(clock));
        if (o.getPaymentStatus() == PaymentStatus.PAID) {
            if (o.getTotalPrice().signum() > 0) {
                wallet.credit(o.getUserId(), o.getTotalPrice(), TransactionType.REFUND, o.getId(), null,
                        "คืนเหรียญออเดอร์ #" + o.getId() + " (" + reason + ")");
            }
            o.setPaymentStatus(PaymentStatus.REFUNDED);
        } else if (o.getPaymentStatus() == PaymentStatus.AWAITING_VERIFICATION) {
            o.setPaymentStatus(PaymentStatus.VOIDED);
        }
    }

    private ServiceOrder lockOwned(UUID userId, Long orderId) {
        ServiceOrder o = orderRepo.findByIdForUpdate(orderId).orElseThrow(() -> ApiException.notFound("Order"));
        if (!o.getUserId().equals(userId)) throw ApiException.notFound("Order");
        return o;
    }

    private OrderResponse toResponse(ServiceOrder o) {
        Long queueAhead = null;
        if (o.getStatus() == OrderStatus.PENDING && o.getCreatedAt() != null) {
            queueAhead = orderRepo.countByStatusAndPriorityAndCreatedAtBefore(OrderStatus.PENDING, o.isPriority(), o.getCreatedAt());
            if (!o.isPriority()) {
                queueAhead += orderRepo.countByStatusAndPriority(OrderStatus.PENDING, true);
            }
        }
        return OrderResponse.from(o, queueAhead);
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
