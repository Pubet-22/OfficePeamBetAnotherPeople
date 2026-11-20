import { API_BASE_URL } from "./config";
import { session } from "./session";
import type {
  CreateOrderRequest,
  Earnings,
  ErrorBody,
  Me,
  Menu,
  Order,
  OrderStatus,
  ShopStatus,
  Topup,
  TopupStatus,
  Transaction,
} from "./types";

const BASE_URL = API_BASE_URL;
const HTTP_NO_CONTENT = 204;

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields: Record<string, string> = {},
  ) {
    super(message);
  }
}

const request = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const headers = new Headers(init.headers);
  const token = await session().getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body) headers.set("Content-Type", "application/json");

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ (หลังบ้านเปิดอยู่ไหม? CORS อนุญาต origin นี้ไหม?)");
  }

  if (response.ok) {
    return response.status === HTTP_NO_CONTENT ? (undefined as T) : ((await response.json()) as T);
  }

  const error = (await response.json().catch(() => null)) as Partial<ErrorBody> | null;
  throw new ApiError(
    response.status,
    error?.code ?? "UNKNOWN",
    error?.message ?? `เกิดข้อผิดพลาด (${response.status})`,
    error?.fields ?? {},
  );
};

const send = (method: string, body?: unknown): RequestInit => ({
  method,
  body: body === undefined ? undefined : JSON.stringify(body),
});

export const api = {
  me: {
    get: () => request<Me>("/me"),
    upgradeToPremium: () => request<Me>("/me/premium", send("POST")),
  },
  shop: {
    status: () => request<ShopStatus>("/shop/status"),
  },
  menus: {
    list: () => request<Menu[]>("/menus"),
  },
  orders: {
    create: (body: CreateOrderRequest) => request<Order>("/orders", send("POST", body)),
    mine: () => request<Order[]>("/orders"),
    get: (id: number) => request<Order>(`/orders/${id}`),
    cancel: (id: number, reason?: string) => request<Order>(`/orders/${id}/cancel`, send("POST", { reason })),
    tip: (id: number, amount: number) => request<Order>(`/orders/${id}/tip`, send("POST", { amount })),
  },
  wallet: {
    transactions: () => request<Transaction[]>("/wallet/transactions"),
    topups: () => request<Topup[]>("/wallet/topups"),
    requestTopup: (amount: number, slipUrl: string) =>
      request<Topup>("/wallet/topups", send("POST", { amount, slipUrl })),
  },
  admin: {
    openShop: () => request<unknown>("/admin/shop/open", send("POST")),
    closeShop: () => request<unknown>("/admin/shop/close", send("POST")),
    queue: (statuses: OrderStatus[] = []) =>
      request<Order[]>(`/admin/orders${statuses.length ? `?${statuses.map((s) => `status=${s}`).join("&")}` : ""}`),
    updateOrderStatus: (id: number, status: OrderStatus, reason?: string) =>
      request<Order>(`/admin/orders/${id}/status`, send("PATCH", { status, reason })),
    earnings: () => request<Earnings>("/admin/earnings"),
    topups: (status: TopupStatus = "PENDING") => request<Topup[]>(`/admin/topups?status=${status}`),
    approveTopup: (id: number) => request<Topup>(`/admin/topups/${id}/approve`, send("POST")),
    rejectTopup: (id: number, reason: string) => request<Topup>(`/admin/topups/${id}/reject`, send("POST", { reason })),
  },
};
