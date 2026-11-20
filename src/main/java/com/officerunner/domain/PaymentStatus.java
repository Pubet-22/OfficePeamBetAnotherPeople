package com.officerunner.domain;

public enum PaymentStatus {
    /** เงินเข้าระบบแล้ว (หัก wallet หรือแอดมินยืนยันสลิป QR แล้ว) */
    PAID,
    /** ลูกค้ากดยืนยันโอนผ่าน QR แล้ว รอแอดมินตรวจยอด */
    AWAITING_VERIFICATION,
    /** คืนเหรียญเข้ากระเป๋าแล้ว */
    REFUNDED,
    /** ยกเลิกก่อนยืนยันยอด QR ไม่มีเงินให้คืน */
    VOIDED
}
