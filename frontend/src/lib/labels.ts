import type {
  GeneralCategory,
  OrderStatus,
  PaymentStatus,
  SweetnessLevel,
  Temperature,
  TopupStatus,
  TransactionType,
} from "./types";

export const categoryLabel: Record<GeneralCategory, string> = {
  WASH_GLASS: "ล้างแก้ว",
  TRASH: "ทิ้งขยะ",
  PICKUP_FOOD: "ลงไปรับข้าว",
  PRINT: "ปริ้นเอกสาร",
  OTHER: "อื่นๆ",
};

export const statusLabel: Record<OrderStatus, string> = {
  PENDING: "รอรับออเดอร์",
  ACCEPTED: "รับงานแล้ว",
  IN_PROGRESS: "กำลังดำเนินการ",
  COMPLETED: "เสร็จสิ้น",
  CANCELLED: "ยกเลิก",
};

export const statusColor: Record<OrderStatus, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  ACCEPTED: "bg-sky-100 text-sky-800",
  IN_PROGRESS: "bg-indigo-100 text-indigo-800",
  COMPLETED: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-stone-200 text-stone-600",
};

export const paymentStatusLabel: Record<PaymentStatus, string> = {
  PAID: "ชำระแล้ว",
  AWAITING_VERIFICATION: "รอตรวจยอดโอน",
  REFUNDED: "คืนเหรียญแล้ว",
  VOIDED: "ยกเลิกการชำระ",
};

export const topupStatusLabel: Record<TopupStatus, string> = {
  PENDING: "รอแอดมินตรวจสอบ",
  APPROVED: "เติมแล้ว",
  REJECTED: "ถูกปฏิเสธ",
};

export const temperatureLabel: Record<Temperature, string> = { HOT: "ร้อน", ICED: "เย็น" };

// Same list as OrderService.SWEETNESS_LEVELS on the backend.
const SWEETNESS_NONE = 0;
const SWEETNESS_LOW = 25;
const SWEETNESS_HALF = 50;
const SWEETNESS_HIGH = 75;
const SWEETNESS_FULL = 100;
export const SWEETNESS_LEVELS: SweetnessLevel[] = [
  SWEETNESS_NONE,
  SWEETNESS_LOW,
  SWEETNESS_HALF,
  SWEETNESS_HIGH,
  SWEETNESS_FULL,
];
export const DEFAULT_SWEETNESS: SweetnessLevel = SWEETNESS_HALF;

export const sweetnessLabel = (level: number | null) => (level === null ? "" : `หวาน ${level}%`);

export const transactionLabel: Record<TransactionType, string> = {
  TOPUP: "เติมเหรียญ",
  ORDER_PAYMENT: "ชำระค่าบริการ",
  REFUND: "คืนเหรียญ",
  PREMIUM_UPGRADE: "สมัครพรีเมียม",
  PREMIUM_BONUS: "โบนัสพรีเมียม",
  TIP_SENT: "ให้ทิป",
  TIP_RECEIVED: "ได้รับทิป",
};

export const ORDER_FLOW: OrderStatus[] = ["PENDING", "ACCEPTED", "IN_PROGRESS", "COMPLETED"];

export const formatTime = (iso: string) =>
  new Date(iso).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Bangkok" });

/** "10:00:00" or "10:00" → "10:00" */
export const formatClock = (time: string | null) => time?.slice(0, "HH:mm".length) ?? "";
