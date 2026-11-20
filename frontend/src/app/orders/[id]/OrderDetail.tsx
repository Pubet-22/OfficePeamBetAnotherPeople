"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useState } from "react";
import { categoryIcon } from "@/components/icons";
import { FileLink, orderOptions, orderTitle, OrderLocation, statusClip } from "@/components/OrderSummary";
import { BinderClip, DrinkArt, liquidFor, Ransom, Sticker, Tape } from "@/components/scrapbook";
import {
  Button,
  Chip,
  Coins,
  cx,
  ErrorText,
  inputClass,
  Loading,
  Receipt,
  StatusBadge,
  Tear,
} from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { errorMessage, usePolledData, useRequireAuth } from "@/lib/hooks";
import { formatTime, ORDER_FLOW, paymentStatusLabel, statusLabel } from "@/lib/labels";
import type { Order, OrderStatus } from "@/lib/types";

const TIP_SMALL = 5;
const TIP_MEDIUM = 10;
const TIP_LARGE = 20;
const TIP_PRESETS = [TIP_SMALL, TIP_MEDIUM, TIP_LARGE];

/** How full the drawing is at each step, as a scaleY value. */
const fillLevel: Record<OrderStatus, string> = {
  PENDING: "0.15",
  ACCEPTED: "0.4",
  IN_PROGRESS: "0.7",
  COMPLETED: "1",
  CANCELLED: "0",
};

const headline: Record<OrderStatus, string> = {
  PENDING: "ส่งใบสั่งแล้ว",
  ACCEPTED: "รับงานแล้ว",
  IN_PROGRESS: "กำลังทำให้",
  COMPLETED: "ถึงโต๊ะแล้ว",
  CANCELLED: "ยกเลิกแล้ว",
};

const isFinished = (order: Order) => order.status === "COMPLETED" || order.status === "CANCELLED";

const Stepper = ({ order }: { order: Order }) => {
  const current = ORDER_FLOW.indexOf(order.status);
  return (
    <ol className="relative flex justify-between" aria-label="ขั้นตอน">
      <span aria-hidden className="absolute top-2 right-10 left-10 h-1 rounded-full bg-line" />
      <span
        aria-hidden
        className="absolute top-2 left-10 h-1 rounded-full bg-leaf transition-[width] duration-700"
        style={{ width: `calc((100% - 5rem) * ${Math.max(current, 0)} / ${ORDER_FLOW.length - 1})` }}
      />
      {ORDER_FLOW.map((status, index) => {
        const reached = index <= current;
        return (
          <li key={status} className="relative flex w-20 flex-col items-center gap-1.5 text-center">
            <span
              className={cx(
                "size-5 rounded-full border-[3px]",
                reached ? "border-leaf bg-leaf" : "border-line bg-paper",
                index === current && !isFinished(order) && "animate-pulse",
              )}
            />
            <span className={cx("text-xs leading-tight", reached ? "text-ink" : "text-ink-soft")}>
              {statusLabel[status]}
            </span>
          </li>
        );
      })}
    </ol>
  );
};

const TipNote = ({ order, onTipped }: { order: Order; onTipped: (order: Order) => void }) => {
  const [amount, setAmount] = useState<number>(TIP_MEDIUM);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  if (order.tipAmount > 0) {
    return (
      <p className="font-hand text-2xl text-coral-deep">
        ขอบคุณสำหรับทิป <Coins amount={order.tipAmount} /> นะ
      </p>
    );
  }

  const sendTip = async () => {
    setIsSending(true);
    setError(null);
    try {
      onTipped(await api.orders.tip(order.id, amount));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="font-hand text-2xl">ให้ทิปคนเดินส่งไหม</p>
      <div className="flex flex-wrap items-center gap-2">
        {TIP_PRESETS.map((preset) => (
          <Chip key={preset} selected={amount === preset} onClick={() => setAmount(preset)}>
            {preset}
          </Chip>
        ))}
        <input
          type="number"
          min={1}
          className={cx(inputClass, "w-24 py-1.5")}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          aria-label="จำนวนทิป"
        />
      </div>
      <Button onClick={sendTip} disabled={isSending || amount < 1}>
        ให้ทิป <Coins amount={amount} />
      </Button>
      <ErrorText message={error} />
    </div>
  );
};

const OrderPicture = ({ order }: { order: Order }) => {
  if (order.serviceType === "COFFEE") {
    return (
      <DrinkArt
        kind={order.temperature === "HOT" ? "hot" : "iced"}
        liquid={liquidFor(order.menuName)}
        level={fillLevel[order.status]}
        className="h-48 w-48"
      />
    );
  }
  const Glyph = categoryIcon[order.generalCategory ?? "OTHER"];
  return (
    <Sticker color="butter" className="size-40 -rotate-6">
      <Glyph className="size-20" />
    </Sticker>
  );
};

export const OrderDetail = () => {
  const { isReady } = useRequireAuth("USER");
  const { refreshUser } = useAuth();
  const orderId = Number(useParams<{ id: string }>().id);
  const loadOrder = useCallback(() => api.orders.get(orderId), [orderId]);
  const { data: order, error, setData } = usePolledData(loadOrder, { enabled: isReady });
  const [actionError, setActionError] = useState<string | null>(null);

  if (!isReady) return <Loading />;
  if (!order) return error ? <ErrorText message={error} /> : <Loading />;

  const cancel = async () => {
    setActionError(null);
    try {
      setData(await api.orders.cancel(order.id));
      await refreshUser();
    } catch (err) {
      setActionError(errorMessage(err));
    }
  };

  return (
    <>
      <Link href="/orders" className="font-hand text-lg text-ink-soft hover:text-coral">
        กลับไปออเดอร์ทั้งหมด
      </Link>

      <div className="mt-4 grid gap-10 md:grid-cols-[1fr_360px] md:items-start">
        <section className="flex flex-col items-center gap-6 text-center">
          <h1>
            <Ransom text={headline[order.status]} size="lg" seed={order.id} />
          </h1>
          <OrderPicture order={order} />
          {order.status === "CANCELLED" ? (
            <p className="font-hand text-xl text-ink-soft">
              {order.cancelReason}
              {order.paymentStatus === "REFUNDED" && " คืนเหรียญเข้ากระเป๋าแล้ว"}
            </p>
          ) : (
            <div className="w-full max-w-md">
              <Stepper order={order} />
            </div>
          )}
          {order.queueAhead !== null && (
            <Sticker color="pink" className="rotate-2 px-4 py-1.5 font-hand text-xl">
              {order.queueAhead === 0 ? "คิวถัดไปคือคุณ" : `รออีก ${order.queueAhead} คิว`}
            </Sticker>
          )}

          {order.status === "COMPLETED" && (order.canTip || order.tipAmount > 0) && (
            <div className="relative w-full max-w-md -rotate-1 rounded-md bg-blush px-6 pt-7 pb-6 text-left shadow-[0_12px_22px_-16px_rgb(59_42_32/0.45)]">
              <Tape color="butter" className="-top-3 left-1/2 -translate-x-1/2 rotate-2" />
              <TipNote
                order={order}
                onTipped={(updated) => {
                  setData(updated);
                  void refreshUser();
                }}
              />
            </div>
          )}
        </section>

        <Receipt className="relative">
          <BinderClip color={statusClip[order.status]} />
          <div className="flex items-center justify-between">
            <h2 className="font-serif-cut text-xl">ใบสั่ง #{order.id}</h2>
            <StatusBadge status={order.status} />
          </div>
          <p className="text-xs text-ink-soft">{formatTime(order.createdAt)}</p>
          <Tear />
          <p className="font-chunky text-lg">{orderTitle(order)}</p>
          {order.serviceType === "COFFEE" && <p className="text-sm text-ink-soft">{orderOptions(order)}</p>}
          {order.customDetails && <p className="mt-2 whitespace-pre-wrap text-sm">{order.customDetails}</p>}
          <div className="mt-2">
            <FileLink href={order.attachmentUrl} label="ไฟล์ที่แนบ" />
          </div>
          <Tear />
          <div className="text-sm">
            <OrderLocation order={order} />
          </div>
          <Tear />
          <dl className="space-y-1 text-sm">
            {order.discountAmount > 0 && (
              <div className="flex justify-between text-leaf">
                <dt>ส่วนลด Premium</dt>
                <dd className="tabular-nums">−{order.discountAmount}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-ink-soft">{order.paymentMethod === "WALLET" ? "จ่ายด้วยเหรียญ" : "จ่ายด้วย QR"}</dt>
              <dd>{paymentStatusLabel[order.paymentStatus]}</dd>
            </div>
          </dl>
          <FileLink href={order.paymentSlipUrl} label="สลิปโอนเงิน" />
          <div className="mt-3 flex items-baseline justify-between">
            <span className="font-serif-cut">รวม</span>
            <Coins amount={order.totalPrice} className="font-chunky text-2xl" />
          </div>
          {order.status === "PENDING" && (
            <Button variant="danger" className="mt-5 w-full" onClick={cancel}>
              ยกเลิกใบสั่งนี้
            </Button>
          )}
          <div className="mt-3">
            <ErrorText message={actionError} />
          </div>
        </Receipt>
      </div>
    </>
  );
};
