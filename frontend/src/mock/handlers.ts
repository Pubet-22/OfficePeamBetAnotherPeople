// Mock of the Spring Boot backend in ../src (same paths, payloads, error codes and rules)
// so the frontend can be developed without Supabase. When the backend changes, update this too.

import type {
  CreateOrderRequest,
  Me,
  Order,
  OrderStatus,
  ShopReasonCode,
  ShopStatus,
  Topup,
  TopupStatus,
  TransactionType,
} from "@/lib/types";
import { SWEETNESS_LEVELS as SWEETNESS_LEVEL_LIST } from "@/lib/labels";
import { db, nextId, now, type OrderRow, type UserRow } from "./db";

const HTTP_OK = 200;
const HTTP_CREATED = 201;
const HTTP_BAD_REQUEST = 400;
const HTTP_UNAUTHORIZED = 401;
const HTTP_PAYMENT_REQUIRED = 402;
const HTTP_FORBIDDEN = 403;
const HTTP_NOT_FOUND = 404;
const HTTP_CONFLICT = 409;

const TOKEN_PREFIX = "mock-token-";
const PERCENT_BASE = 100;
const MIN_PASSWORD_LENGTH = 6;
const MAX_QUANTITY = 20;
const DEFAULT_LIMIT = 50;
const BANGKOK_TZ = "Asia/Bangkok";
const SWEETNESS_LEVELS = new Set<number>(SWEETNESS_LEVEL_LIST); // mirrors OrderService.SWEETNESS_LEVELS
const ACTIVE_STATUSES: OrderStatus[] = ["PENDING", "ACCEPTED", "IN_PROGRESS"];

const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["ACCEPTED", "CANCELLED"],
  ACCEPTED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

class MockError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields: Record<string, string> | null = null,
  ) {
    super(message);
  }
}

const errorResponse = (error: MockError) =>
  Response.json(
    { timestamp: now(), status: error.status, code: error.code, message: error.message, fields: error.fields },
    { status: error.status },
  );

const badRequest = (code: string, message: string) => new MockError(HTTP_BAD_REQUEST, code, message);
const conflict = (code: string, message: string) => new MockError(HTTP_CONFLICT, code, message);
const notFound = (what: string) => new MockError(HTTP_NOT_FOUND, "NOT_FOUND", `${what} not found`);
const validation = (fields: Record<string, string>) =>
  new MockError(HTTP_BAD_REQUEST, "VALIDATION_ERROR", "Invalid request", fields);

// ---------- helpers ----------

const toMe = ({ password: _password, ...user }: UserRow): Me => user;

const findUser = (id: string) => {
  const user = db.users.find((u) => u.id === id);
  if (!user) throw notFound("User");
  return user;
};

const findOrder = (id: number) => {
  const order = db.orders.find((o) => o.id === id);
  if (!order) throw notFound("Order");
  return order;
};

const queueAhead = (order: OrderRow) => {
  if (order.status !== "PENDING") return null;
  const pending = db.orders.filter((o) => o.status === "PENDING");
  const samePriorityBefore = pending.filter((o) => o.priority === order.priority && o.createdAt < order.createdAt);
  const priorityAhead = order.priority ? 0 : pending.filter((o) => o.priority).length;
  return samePriorityBefore.length + priorityAhead;
};

const toOrder = (order: OrderRow): Order => ({
  ...order,
  queueAhead: queueAhead(order),
  canTip: order.status === "COMPLETED" && order.tipAmount === 0 && order.runnerId !== null,
});

/** WalletService.credit / debit: negative amount = debit. */
const moveCoins = (
  userId: string,
  type: TransactionType,
  amount: number,
  refs: { orderId?: number; topupId?: number; note?: string } = {},
) => {
  const user = findUser(userId);
  if (user.coinBalance + amount < 0)
    throw new MockError(HTTP_PAYMENT_REQUIRED, "INSUFFICIENT_COINS", `เหรียญไม่พอ (มี ${user.coinBalance})`);
  user.coinBalance += amount;
  db.transactions.push({
    id: nextId(),
    userId,
    type,
    amount,
    balanceAfter: user.coinBalance,
    orderId: refs.orderId ?? null,
    topupId: refs.topupId ?? null,
    note: refs.note ?? null,
    createdAt: now(),
  });
};

const bangkokClock = () =>
  new Date().toLocaleTimeString("en-GB", { timeZone: BANGKOK_TZ, hour: "2-digit", minute: "2-digit", hour12: false });

const isWithin = (time: string, start: string | null, end: string | null) =>
  start !== null && end !== null && time >= start && time < end;

const shopStatusFor = (premium: boolean): ShopStatus => {
  const s = db.settings;
  const clock = bangkokClock();
  const ignoreHours = process.env.MOCK_IGNORE_HOURS === "true";
  const withinHours = ignoreHours || isWithin(clock, s.openTime, s.closeTime);
  const rushHour = !ignoreHours && isWithin(clock, s.rushStart, s.rushEnd);

  const reasons: { when: boolean; code: ShopReasonCode; message: string }[] = [
    { when: !s.open, code: "SHOP_CLOSED", message: "ขณะนี้ปิดรับคิวชั่วคราว" },
    { when: !withinHours, code: "OUTSIDE_HOURS", message: `เปิดรับออเดอร์เวลา ${s.openTime} - ${s.closeTime} น.` },
    {
      when: rushHour && !premium,
      code: "RUSH_HOUR_PREMIUM_ONLY",
      message: `ช่วงเร่งด่วน ${s.rushStart} - ${s.rushEnd} น. สั่งได้เฉพาะสมาชิก Premium`,
    },
  ];
  const reason = reasons.find((r) => r.when);
  return {
    open: s.open,
    withinHours,
    rushHour,
    canOrder: !reason,
    reasonCode: reason?.code ?? null,
    message: reason?.message ?? "พร้อมรับออเดอร์",
    openTime: s.openTime,
    closeTime: s.closeTime,
    rushStart: s.rushStart,
    rushEnd: s.rushEnd,
    serverTime: now(),
    qrImageUrl: s.qrImageUrl,
    coffeeServiceFee: s.coffeeServiceFee,
    generalServiceFee: s.generalServiceFee,
    premiumDiscountPercent: s.premiumDiscountPercent,
    premiumPrice: s.premiumPrice,
    premiumBonusCoins: s.premiumBonusCoins,
  };
};

const cancelOrder = (orderId: number, reason: string) => {
  const order = findOrder(orderId);
  order.status = "CANCELLED";
  order.cancelReason = reason;
  order.cancelledAt = now();
  if (order.paymentStatus === "PAID") {
    if (order.totalPrice > 0)
      moveCoins(order.userId, "REFUND", order.totalPrice, { orderId: order.id, note: `คืนเหรียญออเดอร์ #${order.id}` });
    order.paymentStatus = "REFUNDED";
  } else if (order.paymentStatus === "AWAITING_VERIFICATION") {
    order.paymentStatus = "VOIDED";
  }
};

// ---------- request context ----------

type Ctx = {
  req: Request;
  url: URL;
  params: string[];
  body: () => Promise<Record<string, unknown>>;
  optionalUser: () => UserRow | null;
  user: () => UserRow;
  admin: () => UserRow;
};

const createCtx = (req: Request, params: string[]): Ctx => {
  const optionalUser = () => {
    const token = req.headers.get("authorization")?.replace("Bearer ", "") ?? "";
    if (!token.startsWith(TOKEN_PREFIX)) return null;
    return db.users.find((u) => u.id === token.slice(TOKEN_PREFIX.length)) ?? null;
  };
  const user = () => {
    const found = optionalUser();
    if (!found) throw new MockError(HTTP_UNAUTHORIZED, "UNAUTHORIZED", "กรุณาเข้าสู่ระบบ");
    return found;
  };
  return {
    req,
    url: new URL(req.url),
    params,
    body: async () => ((await req.json().catch(() => ({}))) ?? {}) as Record<string, unknown>,
    optionalUser,
    user,
    admin: () => {
      const current = user();
      if (current.role !== "ADMIN") throw new MockError(HTTP_FORBIDDEN, "FORBIDDEN", "Access denied");
      return current;
    },
  };
};

const ownOrder = (ctx: Ctx) => {
  const user = ctx.user();
  const order = findOrder(Number(ctx.params[0]));
  if (order.userId !== user.id) throw notFound("Order");
  return order;
};

const limitParam = (url: URL) => Number(url.searchParams.get("limit") ?? DEFAULT_LIMIT);
const newestFirst = <T extends { createdAt: string }>(a: T, b: T) => b.createdAt.localeCompare(a.createdAt);

/** AuthRequests.AuthResponse */
const authResponse = (user: UserRow) => ({
  accessToken: `${TOKEN_PREFIX}${user.id}`,
  tokenType: "Bearer",
  user: toMe(user),
});

// ---------- routes ----------

type Handler = (ctx: Ctx) => Promise<unknown> | unknown;
type Route = { method: string; pattern: string; status?: number; handler: Handler };

const routes: Route[] = [
  // AuthController
  {
    method: "POST",
    pattern: "/auth/register",
    status: HTTP_CREATED,
    handler: async (ctx) => {
      const { email, password, fullName } = await ctx.body();
      const fields: Record<string, string> = {};
      if (typeof email !== "string" || !email.includes("@")) fields.email = "รูปแบบอีเมลไม่ถูกต้อง";
      if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH)
        fields.password = `รหัสผ่านต้องมีความยาวอย่างน้อย ${MIN_PASSWORD_LENGTH} ตัวอักษร`;
      if (typeof fullName !== "string" || !fullName.trim()) fields.fullName = "กรุณาระบุชื่อ-นามสกุล";
      if (Object.keys(fields).length) throw validation(fields);
      const normalizedEmail = String(email).trim().toLowerCase();
      if (db.users.some((u) => u.email === normalizedEmail))
        throw conflict("EMAIL_ALREADY_EXISTS", "อีเมลนี้มีผู้ใช้งานในระบบแล้ว");
      const user: UserRow = {
        id: crypto.randomUUID(),
        email: normalizedEmail,
        password: String(password),
        fullName: String(fullName).trim(),
        role: "USER",
        premium: false,
        premiumSince: null,
        coinBalance: 0,
      };
      db.users.push(user);
      return authResponse(user);
    },
  },
  {
    method: "POST",
    pattern: "/auth/login",
    handler: async (ctx) => {
      const { email, password } = await ctx.body();
      const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
      const user = db.users.find((u) => u.email === normalizedEmail && u.password === password);
      if (!user) throw new MockError(HTTP_UNAUTHORIZED, "UNAUTHORIZED", "อีเมลหรือรหัสผ่านไม่ถูกต้อง");
      return authResponse(user);
    },
  },
  // Mock-only stand-in for Supabase Storage (see src/lib/session.ts)
  {
    method: "POST",
    pattern: "/uploads",
    handler: async (ctx) => {
      const form = await ctx.req.formData();
      const file = form.get("file");
      if (!(file instanceof File)) throw badRequest("FILE_REQUIRED", "ไม่พบไฟล์");
      return { url: `https://mock-storage.local/${String(form.get("bucket"))}/${Date.now()}-${file.name}` };
    },
  },

  // PublicController
  { method: "GET", pattern: "/health", handler: () => ({ status: "ok" }) },
  { method: "GET", pattern: "/menus", handler: () => db.menus.filter((m) => m.available) },
  { method: "GET", pattern: "/shop/status", handler: (ctx) => shopStatusFor(ctx.optionalUser()?.premium ?? false) },

  // MeController
  { method: "GET", pattern: "/me", handler: (ctx) => toMe(ctx.user()) },
  {
    method: "POST",
    pattern: "/me/premium",
    handler: (ctx) => {
      const user = ctx.user();
      if (user.premium) throw conflict("ALREADY_PREMIUM", "คุณเป็นสมาชิก Premium อยู่แล้ว");
      const { premiumPrice, premiumBonusCoins } = db.settings;
      if (premiumPrice > 0) moveCoins(user.id, "PREMIUM_UPGRADE", -premiumPrice, { note: "สมัครสมาชิก Premium" });
      user.premium = true;
      user.premiumSince = now();
      if (premiumBonusCoins > 0)
        moveCoins(user.id, "PREMIUM_BONUS", premiumBonusCoins, { note: "โบนัสต้อนรับสมาชิก Premium" });
      return toMe(user);
    },
  },
  {
    method: "GET",
    pattern: "/wallet/transactions",
    handler: (ctx) => {
      const user = ctx.user();
      return db.transactions
        .filter((t) => t.userId === user.id)
        .sort((a, b) => b.id - a.id)
        .slice(0, limitParam(ctx.url))
        .map(({ userId: _userId, ...t }) => t);
    },
  },
  {
    method: "POST",
    pattern: "/wallet/topups",
    status: HTTP_CREATED,
    handler: async (ctx) => {
      const user = ctx.user();
      const { amount, slipUrl } = await ctx.body();
      const fields: Record<string, string> = {};
      if (typeof amount !== "number" || amount < 1) fields.amount = "must be greater than or equal to 1";
      if (typeof slipUrl !== "string" || !slipUrl.trim()) fields.slipUrl = "must not be blank";
      if (Object.keys(fields).length) throw validation(fields);
      const topup: Topup = {
        id: nextId(),
        userId: user.id,
        amount: Number(amount),
        slipUrl: String(slipUrl),
        status: "PENDING",
        reviewedBy: null,
        reviewedAt: null,
        rejectReason: null,
        createdAt: now(),
      };
      db.topups.push(topup);
      return topup;
    },
  },
  {
    method: "GET",
    pattern: "/wallet/topups",
    handler: (ctx) => {
      const user = ctx.user();
      return db.topups.filter((t) => t.userId === user.id).sort(newestFirst).slice(0, limitParam(ctx.url));
    },
  },

  // OrderController
  {
    method: "POST",
    pattern: "/orders",
    status: HTTP_CREATED,
    handler: async (ctx) => {
      const user = ctx.user();
      const shop = shopStatusFor(user.premium);
      if (!shop.canOrder) throw conflict(shop.reasonCode ?? "SHOP_CLOSED", shop.message);

      const r = (await ctx.body()) as Partial<CreateOrderRequest>;
      const fields: Record<string, string> = {};
      if (r.serviceType !== "COFFEE" && r.serviceType !== "GENERAL") fields.serviceType = "must not be null";
      if (!r.deskLocation?.trim()) fields.deskLocation = "must not be blank";
      if (r.paymentMethod !== "WALLET" && r.paymentMethod !== "QR_MOCK") fields.paymentMethod = "must not be null";
      if (r.quantity !== undefined && (r.quantity < 1 || r.quantity > MAX_QUANTITY))
        fields.quantity = `must be between 1 and ${MAX_QUANTITY}`;
      if (Object.keys(fields).length) throw validation(fields);

      const timestamp = now();
      const order: OrderRow = {
        id: nextId(),
        userId: user.id,
        runnerId: null,
        serviceType: r.serviceType!,
        menuId: null,
        menuName: null,
        quantity: 1,
        temperature: null,
        sweetnessLevel: null,
        generalCategory: null,
        customDetails: r.customDetails?.trim() || null,
        attachmentUrl: null,
        deskLocation: r.deskLocation!.trim(),
        locationNote: r.locationNote?.trim() || null,
        status: "PENDING",
        priority: user.premium,
        subtotal: 0,
        discountAmount: 0,
        totalPrice: 0,
        tipAmount: 0,
        paymentMethod: r.paymentMethod!,
        paymentStatus: "PAID",
        paymentSlipUrl: null,
        cancelReason: null,
        createdAt: timestamp,
        acceptedAt: null,
        startedAt: null,
        completedAt: null,
        cancelledAt: null,
      };

      if (r.serviceType === "COFFEE") {
        if (r.menuId === undefined) throw badRequest("MENU_REQUIRED", "กรุณาเลือกเมนู");
        const menu = db.menus.find((m) => m.id === r.menuId);
        if (!menu) throw notFound("Menu");
        if (!menu.available) throw conflict("MENU_UNAVAILABLE", `${menu.name} หมดชั่วคราว`);
        const temperature = r.temperature ?? (menu.allowIced ? "ICED" : "HOT");
        const allowed = temperature === "HOT" ? menu.allowHot : menu.allowIced;
        if (!allowed) throw badRequest("TEMPERATURE_NOT_ALLOWED", `${menu.name} ไม่มีแบบ ${temperature}`);
        const sweetness = r.sweetnessLevel ?? null; // optional: the vending machine menu sets sweetness
        if (sweetness !== null && !SWEETNESS_LEVELS.has(sweetness))
          throw badRequest("INVALID_SWEETNESS", "ระดับความหวานต้องเป็น 0, 25, 50, 75 หรือ 100");
        Object.assign(order, {
          menuId: menu.id,
          menuName: menu.name,
          temperature,
          sweetnessLevel: sweetness,
          quantity: r.quantity ?? 1,
          subtotal: menu.price * (r.quantity ?? 1) + db.settings.coffeeServiceFee,
        });
      } else {
        if (!r.customDetails?.trim()) throw badRequest("DETAILS_REQUIRED", "กรุณาระบุรายละเอียดงาน");
        Object.assign(order, {
          generalCategory: r.generalCategory ?? "OTHER",
          attachmentUrl: r.attachmentUrl?.trim() || null,
          subtotal: db.settings.generalServiceFee,
        });
      }

      order.discountAmount = user.premium
        ? Math.round((order.subtotal * db.settings.premiumDiscountPercent) / PERCENT_BASE * PERCENT_BASE) / PERCENT_BASE
        : 0;
      order.totalPrice = order.subtotal - order.discountAmount;

      if (order.paymentMethod === "WALLET") {
        if (order.totalPrice > 0)
          moveCoins(user.id, "ORDER_PAYMENT", -order.totalPrice, { orderId: order.id, note: `ค่าบริการออเดอร์ #${order.id}` });
      } else {
        if (r.qrTransferConfirmed !== true) throw badRequest("QR_NOT_CONFIRMED", "กรุณากดยืนยันการโอนเงินผ่าน QR ก่อน");
        order.paymentStatus = "AWAITING_VERIFICATION";
        order.paymentSlipUrl = r.paymentSlipUrl?.trim() || null;
      }
      db.orders.push(order);
      return toOrder(order);
    },
  },
  {
    method: "GET",
    pattern: "/orders",
    handler: (ctx) => {
      const user = ctx.user();
      return db.orders
        .filter((o) => o.userId === user.id)
        .sort(newestFirst)
        .slice(0, limitParam(ctx.url))
        .map(toOrder);
    },
  },
  {
    method: "GET",
    pattern: "/orders/:id",
    handler: (ctx) => {
      const user = ctx.user();
      const order = findOrder(Number(ctx.params[0]));
      if (user.role !== "ADMIN" && order.userId !== user.id) throw notFound("Order");
      return toOrder(order);
    },
  },
  {
    method: "POST",
    pattern: "/orders/:id/cancel",
    handler: async (ctx) => {
      const order = ownOrder(ctx);
      if (order.status !== "PENDING") throw conflict("CANNOT_CANCEL", "ยกเลิกได้เฉพาะออเดอร์ที่ยังไม่ถูกรับงาน");
      const { reason } = await ctx.body();
      cancelOrder(order.id, typeof reason === "string" && reason.trim() ? reason.trim() : "ลูกค้ายกเลิก");
      return toOrder(order);
    },
  },
  {
    method: "POST",
    pattern: "/orders/:id/tip",
    handler: async (ctx) => {
      const order = ownOrder(ctx);
      const { amount } = await ctx.body();
      if (typeof amount !== "number" || amount < 1) throw validation({ amount: "must be greater than or equal to 1" });
      if (order.status !== "COMPLETED") throw conflict("ORDER_NOT_COMPLETED", "ให้ทิปได้หลังงานเสร็จแล้วเท่านั้น");
      if (order.tipAmount > 0) throw conflict("ALREADY_TIPPED", "ออเดอร์นี้ให้ทิปไปแล้ว");
      if (!order.runnerId) throw conflict("NO_RUNNER", "ไม่พบผู้รับงานของออเดอร์นี้");
      if (amount > db.settings.maxTip) throw badRequest("TIP_TOO_LARGE", `ทิปได้สูงสุด ${db.settings.maxTip} เหรียญ`);
      moveCoins(order.userId, "TIP_SENT", -amount, { orderId: order.id, note: `ทิปออเดอร์ #${order.id}` });
      moveCoins(order.runnerId, "TIP_RECEIVED", amount, { orderId: order.id, note: `ได้รับทิปออเดอร์ #${order.id}` });
      order.tipAmount = amount;
      return toOrder(order);
    },
  },

  // AdminController
  {
    method: "POST",
    pattern: "/admin/shop/open",
    handler: (ctx) => {
      ctx.admin();
      db.settings.open = true;
      return db.settings;
    },
  },
  {
    method: "POST",
    pattern: "/admin/shop/close",
    handler: (ctx) => {
      ctx.admin();
      db.settings.open = false;
      return db.settings;
    },
  },
  {
    method: "GET",
    pattern: "/admin/orders",
    handler: (ctx) => {
      ctx.admin();
      const requested = ctx.url.searchParams.getAll("status");
      const statuses = requested.length ? requested : ACTIVE_STATUSES;
      return db.orders
        .filter((o) => statuses.includes(o.status))
        .sort((a, b) => Number(b.priority) - Number(a.priority) || a.createdAt.localeCompare(b.createdAt))
        .map(toOrder);
    },
  },
  {
    method: "PATCH",
    pattern: "/admin/orders/:id/status",
    handler: async (ctx) => {
      const admin = ctx.admin();
      const order = findOrder(Number(ctx.params[0]));
      const { status, reason } = await ctx.body();
      const next = status as OrderStatus;
      if (!ORDER_TRANSITIONS[order.status].includes(next))
        throw conflict("INVALID_TRANSITION", `เปลี่ยนสถานะจาก ${order.status} เป็น ${String(status)} ไม่ได้`);
      const timestamp = now();
      if (next === "CANCELLED") {
        cancelOrder(order.id, typeof reason === "string" && reason.trim() ? reason.trim() : "ยกเลิกโดยผู้ให้บริการ");
        return toOrder(order);
      }
      if (next === "ACCEPTED") {
        order.runnerId = admin.id;
        order.acceptedAt = timestamp;
        if (order.paymentStatus === "AWAITING_VERIFICATION") order.paymentStatus = "PAID";
      }
      if (next === "IN_PROGRESS") order.startedAt = timestamp;
      if (next === "COMPLETED") order.completedAt = timestamp;
      order.status = next;
      return toOrder(order);
    },
  },
  {
    method: "GET",
    pattern: "/admin/earnings",
    handler: (ctx) => {
      const admin = ctx.admin();
      const completed = db.orders.filter((o) => o.runnerId === admin.id && o.status === "COMPLETED");
      return {
        completedOrders: completed.length,
        serviceRevenue: completed.reduce((sum, o) => sum + o.totalPrice, 0),
        tipsReceived: completed.reduce((sum, o) => sum + o.tipAmount, 0),
        coinBalance: admin.coinBalance,
      };
    },
  },
  {
    method: "GET",
    pattern: "/admin/topups",
    handler: (ctx) => {
      ctx.admin();
      const status = (ctx.url.searchParams.get("status") ?? "PENDING") as TopupStatus;
      return db.topups.filter((t) => t.status === status).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    },
  },
  {
    method: "POST",
    pattern: "/admin/topups/:id/approve",
    handler: (ctx) => {
      const admin = ctx.admin();
      const topup = db.topups.find((t) => t.id === Number(ctx.params[0]));
      if (!topup) throw notFound("Topup");
      if (topup.status !== "PENDING") throw conflict("TOPUP_ALREADY_REVIEWED", "รายการนี้ถูกตรวจสอบไปแล้ว");
      Object.assign(topup, { status: "APPROVED", reviewedBy: admin.id, reviewedAt: now() });
      moveCoins(topup.userId, "TOPUP", topup.amount, { topupId: topup.id, note: "เติมเหรียญ" });
      return topup;
    },
  },
  {
    method: "POST",
    pattern: "/admin/topups/:id/reject",
    handler: async (ctx) => {
      const admin = ctx.admin();
      const topup = db.topups.find((t) => t.id === Number(ctx.params[0]));
      if (!topup) throw notFound("Topup");
      if (topup.status !== "PENDING") throw conflict("TOPUP_ALREADY_REVIEWED", "รายการนี้ถูกตรวจสอบไปแล้ว");
      const { reason } = await ctx.body();
      Object.assign(topup, {
        status: "REJECTED",
        reviewedBy: admin.id,
        reviewedAt: now(),
        rejectReason: typeof reason === "string" ? reason : null,
      });
      return topup;
    },
  },
];

// ---------- router ----------

const isNumericId = (segment: string) => segment !== "" && Number.isSafeInteger(Number(segment));

// Returns the ":id" values when the path fits the pattern, or null when it does not.
const matchParams = (pattern: string, segments: string[]) => {
  const patternSegments = pattern.split("/").filter(Boolean);
  if (patternSegments.length !== segments.length) return null;
  const fits = patternSegments.every((part, i) =>
    part.startsWith(":") ? isNumericId(segments[i]) : part === segments[i],
  );
  return fits ? segments.filter((_, i) => patternSegments[i].startsWith(":")) : null;
};

const matchRoute = (method: string, path: string) => {
  const segments = path.split("/").filter(Boolean);
  return (
    routes
      .filter((route) => route.method === method)
      .map((route) => ({ route, params: matchParams(route.pattern, segments) }))
      .find((match): match is { route: Route; params: string[] } => match.params !== null) ?? null
  );
};

export const handleMockRequest = async (req: Request, pathSegments: string[]) => {
  const match = matchRoute(req.method, `/${pathSegments.join("/")}`);
  if (!match) return errorResponse(notFound(`Endpoint ${req.method} /${pathSegments.join("/")}`));
  try {
    const result = await match.route.handler(createCtx(req, match.params));
    return Response.json(result, { status: match.route.status ?? HTTP_OK });
  } catch (error) {
    if (error instanceof MockError) return errorResponse(error);
    throw error;
  }
};
