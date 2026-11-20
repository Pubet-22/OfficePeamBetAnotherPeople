// Mirrors the Spring Boot DTOs in ../src/main/java/com/officerunner/web/dto.
// BigDecimal fields arrive as JSON numbers; UUIDs and Instants arrive as strings.

export type Role = "USER" | "ADMIN";
export type ServiceType = "COFFEE" | "GENERAL";
export type GeneralCategory = "WASH_GLASS" | "TRASH" | "PICKUP_FOOD" | "PRINT" | "OTHER";
export type OrderStatus = "PENDING" | "ACCEPTED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type PaymentMethod = "WALLET" | "QR_MOCK";
export type PaymentStatus = "PAID" | "AWAITING_VERIFICATION" | "REFUNDED" | "VOIDED";
export type TopupStatus = "PENDING" | "APPROVED" | "REJECTED";
export type TransactionType =
  | "TOPUP"
  | "ORDER_PAYMENT"
  | "REFUND"
  | "PREMIUM_UPGRADE"
  | "PREMIUM_BONUS"
  | "TIP_SENT"
  | "TIP_RECEIVED";
export type Temperature = "HOT" | "ICED";
export type SweetnessLevel = 0 | 25 | 50 | 75 | 100;
export type ShopReasonCode = "SHOP_CLOSED" | "OUTSIDE_HOURS" | "RUSH_HOUR_PREMIUM_ONLY";

/** GlobalExceptionHandler.ErrorBody */
export type ErrorBody = {
  timestamp: string;
  status: number;
  code: string;
  message: string;
  fields: Record<string, string> | null;
};

/** MeResponse */
export type Me = {
  id: string;
  email: string;
  fullName: string | null;
  role: Role;
  premium: boolean;
  premiumSince: string | null;
  coinBalance: number;
};

/** ShopStatusService.ShopStatus */
export type ShopStatus = {
  open: boolean;
  withinHours: boolean;
  rushHour: boolean;
  canOrder: boolean;
  reasonCode: ShopReasonCode | null;
  message: string;
  openTime: string;
  closeTime: string;
  rushStart: string | null;
  rushEnd: string | null;
  serverTime: string;
  qrImageUrl: string | null;
  /** Runner fee added once per coffee order (the drinks themselves are free). */
  coffeeServiceFee: number;
  generalServiceFee: number;
  premiumDiscountPercent: number;
  premiumPrice: number;
  premiumBonusCoins: number;
};

/** MenuResponse */
export type Menu = {
  id: number;
  name: string;
  description: string | null;
  price: number;
  allowHot: boolean;
  allowIced: boolean;
  imageUrl: string | null;
  available: boolean;
  sortOrder: number;
};

/** CreateOrderRequest */
export type CreateOrderRequest = {
  serviceType: ServiceType;
  menuId?: number;
  quantity?: number;
  temperature?: Temperature;
  sweetnessLevel?: SweetnessLevel;
  generalCategory?: GeneralCategory;
  customDetails?: string | null;
  attachmentUrl?: string | null;
  deskLocation: string;
  locationNote?: string | null;
  paymentMethod: PaymentMethod;
  paymentSlipUrl?: string | null;
  qrTransferConfirmed?: boolean;
};

/** OrderResponse */
export type Order = {
  id: number;
  userId: string;
  runnerId: string | null;
  serviceType: ServiceType;
  menuId: number | null;
  menuName: string | null;
  quantity: number;
  temperature: Temperature | null;
  sweetnessLevel: number | null;
  generalCategory: GeneralCategory | null;
  customDetails: string | null;
  attachmentUrl: string | null;
  deskLocation: string;
  locationNote: string | null;
  status: OrderStatus;
  priority: boolean;
  queueAhead: number | null;
  subtotal: number;
  discountAmount: number;
  totalPrice: number;
  tipAmount: number;
  canTip: boolean;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentSlipUrl: string | null;
  cancelReason: string | null;
  createdAt: string;
  acceptedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
};

/** TopupResponse */
export type Topup = {
  id: number;
  userId: string;
  amount: number;
  slipUrl: string;
  status: TopupStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  rejectReason: string | null;
  createdAt: string;
};

/** TransactionResponse */
export type Transaction = {
  id: number;
  type: TransactionType;
  amount: number;
  balanceAfter: number;
  orderId: number | null;
  topupId: number | null;
  note: string | null;
  createdAt: string;
};

/** OrderService.earnings() — figures for the signed-in runner */
export type Earnings = {
  completedOrders: number;
  serviceRevenue: number;
  tipsReceived: number;
  coinBalance: number;
};
