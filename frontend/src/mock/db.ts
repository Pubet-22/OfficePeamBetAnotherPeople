// In-memory data for the mock API. Resets when the dev server restarts.
// Stored on globalThis so hot reload does not wipe it.

import type { Me, Menu, Order, Topup, Transaction } from "@/lib/types";
import seedJson from "./seed.json";

export type UserRow = Me & { password: string };
export type OrderRow = Omit<Order, "queueAhead" | "canTip">;
export type TransactionRow = Transaction & { userId: string };

export type Settings = {
  open: boolean;
  openTime: string;
  closeTime: string;
  rushStart: string | null;
  rushEnd: string | null;
  coffeeServiceFee: number;
  generalServiceFee: number;
  premiumPrice: number;
  premiumBonusCoins: number;
  premiumDiscountPercent: number;
  qrImageUrl: string | null;
  maxTip: number;
};

type Db = {
  users: UserRow[];
  menus: Menu[];
  settings: Settings;
  orders: OrderRow[];
  topups: Topup[];
  transactions: TransactionRow[];
  nextId: number;
};

type Seed = Pick<Db, "users" | "menus" | "settings">;
const seed: Seed = seedJson as Seed;
const FIRST_ID = 1000;

const createDb = (): Db => ({
  ...structuredClone(seed),
  orders: [],
  topups: [],
  transactions: [],
  nextId: FIRST_ID,
});

const globalForDb = globalThis as typeof globalThis & { __officeMockDbV2?: Db };
export const db: Db = (globalForDb.__officeMockDbV2 ??= createDb());

export const nextId = () => db.nextId++;
export const now = () => new Date().toISOString();
