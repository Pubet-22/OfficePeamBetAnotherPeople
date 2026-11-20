package com.officerunner.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import com.officerunner.common.ApiException;
import com.officerunner.config.AppProperties;
import com.officerunner.domain.*;
import com.officerunner.repository.CoffeeMenuRepository;
import com.officerunner.repository.OrderRepository;
import com.officerunner.web.dto.CreateOrderRequest;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class OrderServiceTest {

    OrderRepository orderRepo = mock(OrderRepository.class);
    CoffeeMenuRepository menuRepo = mock(CoffeeMenuRepository.class);
    UserService userService = mock(UserService.class);
    SettingsService settingsService = mock(SettingsService.class);
    ShopStatusService shopStatus = mock(ShopStatusService.class);
    WalletService wallet = mock(WalletService.class);
    AppProperties props = new AppProperties(null, List.of(), new BigDecimal("1000"), new BigDecimal("10000"));
    Clock clock = Clock.fixed(Instant.parse("2026-11-20T03:30:00Z"), ZoneOffset.UTC);

    OrderService service;
    UUID userId = UUID.randomUUID();
    UUID adminId = UUID.randomUUID();
    AppUser user = new AppUser();
    CoffeeMenu latte = new CoffeeMenu();

    @BeforeEach
    void setUp() {
        service = new OrderService(orderRepo, menuRepo, userService, settingsService, shopStatus, wallet, props, clock);
        user.setId(userId);
        when(userService.get(userId)).thenReturn(user);
        when(settingsService.get()).thenReturn(new SystemSettings()); // fee 20, discount 10%
        when(shopStatus.statusFor(anyBoolean())).thenReturn(status(true, null));
        latte.setId(2L);
        latte.setName("ลาเต้");
        latte.setPrice(new BigDecimal("55.00"));
        when(menuRepo.findById(2L)).thenReturn(Optional.of(latte));
        when(orderRepo.save(any())).thenAnswer(inv -> {
            ServiceOrder o = inv.getArgument(0);
            o.setId(100L);
            return o;
        });
    }

    private static ShopStatusService.ShopStatus status(boolean canOrder, String code) {
        return new ShopStatusService.ShopStatus(true, true, false, canOrder, code, "msg",
                null, null, null, null, "", null, null, null, null, null);
    }

    private static CreateOrderRequest coffee(PaymentMethod pm, Boolean qrConfirmed) {
        return new CreateOrderRequest(ServiceType.COFFEE, 2L, 2, Temperature.ICED, 50, null, null, null,
                "A-12", "ริมหน้าต่าง", pm, null, qrConfirmed);
    }

    @Test
    void coffeeWalletOrderDebitsTotal() {
        var res = service.create(userId, coffee(PaymentMethod.WALLET, null));

        assertThat(res.totalPrice()).isEqualByComparingTo("110.00");
        assertThat(res.paymentStatus()).isEqualTo(PaymentStatus.PAID);
        assertThat(res.priority()).isFalse();
        verify(wallet).debit(eq(userId), eq(new BigDecimal("110.00")), eq(TransactionType.ORDER_PAYMENT), eq(100L), any(), any());
    }

    @Test
    void premiumGetsDiscountAndPriority() {
        user.setPremium(true);
        var res = service.create(userId, coffee(PaymentMethod.WALLET, null));

        assertThat(res.discountAmount()).isEqualByComparingTo("11.00");
        assertThat(res.totalPrice()).isEqualByComparingTo("99.00");
        assertThat(res.priority()).isTrue();
    }

    @Test
    void closedShopRejectsOrder() {
        when(shopStatus.statusFor(anyBoolean())).thenReturn(status(false, "SHOP_CLOSED"));
        assertThatThrownBy(() -> service.create(userId, coffee(PaymentMethod.WALLET, null)))
                .isInstanceOf(ApiException.class).hasFieldOrPropertyWithValue("code", "SHOP_CLOSED");
        verifyNoInteractions(wallet);
    }

    @Test
    void generalTaskRequiresDetailsAndUsesFlatFee() {
        var noDetails = new CreateOrderRequest(ServiceType.GENERAL, null, null, null, null, GeneralCategory.PRINT,
                "  ", null, "B-3", null, PaymentMethod.WALLET, null, null);
        assertThatThrownBy(() -> service.create(userId, noDetails))
                .hasFieldOrPropertyWithValue("code", "DETAILS_REQUIRED");

        var ok = new CreateOrderRequest(ServiceType.GENERAL, null, null, null, null, GeneralCategory.PRINT,
                "ปริ้น 3 ชุด", "https://x/file.pdf", "B-3", null, PaymentMethod.WALLET, null, null);
        assertThat(service.create(userId, ok).totalPrice()).isEqualByComparingTo("20");
    }

    @Test
    void qrOrderMustBeConfirmedAndAwaitsVerification() {
        assertThatThrownBy(() -> service.create(userId, coffee(PaymentMethod.QR_MOCK, false)))
                .hasFieldOrPropertyWithValue("code", "QR_NOT_CONFIRMED");

        var res = service.create(userId, coffee(PaymentMethod.QR_MOCK, true));
        assertThat(res.paymentStatus()).isEqualTo(PaymentStatus.AWAITING_VERIFICATION);
        verifyNoInteractions(wallet);
    }

    private ServiceOrder existing(OrderStatus status, PaymentStatus pay) {
        ServiceOrder o = new ServiceOrder();
        o.setId(7L);
        o.setUserId(userId);
        o.setStatus(status);
        o.setPaymentStatus(pay);
        o.setPaymentMethod(PaymentMethod.WALLET);
        o.setTotalPrice(new BigDecimal("45.00"));
        o.setSubtotal(new BigDecimal("45.00"));
        when(orderRepo.findByIdForUpdate(7L)).thenReturn(Optional.of(o));
        return o;
    }

    @Test
    void adminCancelRefundsWallet() {
        ServiceOrder o = existing(OrderStatus.ACCEPTED, PaymentStatus.PAID);
        service.updateStatus(adminId, 7L, OrderStatus.CANCELLED, "นมหมด");

        assertThat(o.getStatus()).isEqualTo(OrderStatus.CANCELLED);
        assertThat(o.getPaymentStatus()).isEqualTo(PaymentStatus.REFUNDED);
        verify(wallet).credit(eq(userId), eq(new BigDecimal("45.00")), eq(TransactionType.REFUND), eq(7L), any(), any());
    }

    @Test
    void cancellingUnverifiedQrDoesNotRefund() {
        ServiceOrder o = existing(OrderStatus.PENDING, PaymentStatus.AWAITING_VERIFICATION);
        service.cancelByUser(userId, 7L, null);

        assertThat(o.getPaymentStatus()).isEqualTo(PaymentStatus.VOIDED);
        verifyNoInteractions(wallet);
    }

    @Test
    void userCannotCancelAcceptedOrder() {
        existing(OrderStatus.ACCEPTED, PaymentStatus.PAID);
        assertThatThrownBy(() -> service.cancelByUser(userId, 7L, null))
                .hasFieldOrPropertyWithValue("code", "CANNOT_CANCEL");
    }

    @Test
    void acceptingSetsRunnerAndVerifiesQr() {
        ServiceOrder o = existing(OrderStatus.PENDING, PaymentStatus.AWAITING_VERIFICATION);
        service.updateStatus(adminId, 7L, OrderStatus.ACCEPTED, null);

        assertThat(o.getRunnerId()).isEqualTo(adminId);
        assertThat(o.getPaymentStatus()).isEqualTo(PaymentStatus.PAID);
        assertThat(o.getAcceptedAt()).isNotNull();
    }

    @Test
    void tipMovesCoinsToRunnerOnce() {
        ServiceOrder o = existing(OrderStatus.COMPLETED, PaymentStatus.PAID);
        o.setRunnerId(adminId);

        service.tip(userId, 7L, new BigDecimal("10"));
        verify(wallet).debit(eq(userId), eq(new BigDecimal("10.00")), eq(TransactionType.TIP_SENT), eq(7L), any(), any());
        verify(wallet).credit(eq(adminId), eq(new BigDecimal("10.00")), eq(TransactionType.TIP_RECEIVED), eq(7L), any(), any());
        assertThat(o.getTipAmount()).isEqualByComparingTo("10");

        assertThatThrownBy(() -> service.tip(userId, 7L, new BigDecimal("5")))
                .hasFieldOrPropertyWithValue("code", "ALREADY_TIPPED");
    }

    @Test
    void cannotTipBeforeCompleted() {
        existing(OrderStatus.IN_PROGRESS, PaymentStatus.PAID);
        assertThatThrownBy(() -> service.tip(userId, 7L, new BigDecimal("5")))
                .hasFieldOrPropertyWithValue("code", "ORDER_NOT_COMPLETED");
        verify(wallet, never()).debit(any(), any(), any(), anyLong(), any(), any());
    }
}
