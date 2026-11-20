"use client";

import { useCallback, useState } from "react";
import { FileLink, orderOptions, orderTitle, OrderLocation, statusClip } from "@/components/OrderSummary";
import { BinderClip, PageHeader, Tape } from "@/components/scrapbook";
import { Button, Coins, cx, ErrorText, Loading, PremiumMark, Receipt } from "@/components/ui";
import { api } from "@/lib/api";
import { errorMessage, usePolledData, useRequireAuth } from "@/lib/hooks";
import { formatClock, formatTime, paymentStatusLabel, statusLabel } from "@/lib/labels";
import type { Order, OrderStatus } from "@/lib/types";

const RAIL: OrderStatus[] = ["PENDING", "ACCEPTED", "IN_PROGRESS"];

const nextAction: Partial<Record<OrderStatus, { status: OrderStatus; label: string }>> = {
  PENDING: { status: "ACCEPTED", label: "รับงาน" },
  ACCEPTED: { status: "IN_PROGRESS", label: "เริ่มทำ" },
  IN_PROGRESS: { status: "COMPLETED", label: "ส่งถึงโต๊ะแล้ว" },
};

const TICKET_TILTS = ["-rotate-1", "rotate-1", "rotate-[0.5deg]"];

const RailTicket = ({
  order,
  tilt,
  onAction,
}: {
  order: Order;
  tilt: string;
  onAction: (status: OrderStatus, reason?: string) => void;
}) => {
  const action = nextAction[order.status];
  const awaitingQr = order.paymentStatus === "AWAITING_VERIFICATION";

  const handleCancel = () => {
    const reason = window.prompt("เหตุผลที่ยกเลิก (ลูกค้าจะเห็นข้อความนี้)");
    if (reason !== null) onAction("CANCELLED", reason.trim() || undefined);
  };

  return (
    <li className={tilt}>
      <Receipt className="relative pt-8 text-sm">
        <BinderClip color={statusClip[order.status]} />
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-chunky text-base leading-snug">{orderTitle(order)}</p>
            {order.serviceType === "COFFEE" && <p className="text-ink-soft">{orderOptions(order)}</p>}
          </div>
          {order.priority && <PremiumMark />}
        </div>
        {order.customDetails && <p className="mt-2 whitespace-pre-wrap">{order.customDetails}</p>}
        <div className="mt-1">
          <FileLink href={order.attachmentUrl} label="ไฟล์ที่แนบ" />
        </div>
        <div className="mt-2">
          <OrderLocation order={order} />
        </div>
        <div className="tear mt-3 flex items-center justify-between pt-2 text-xs text-ink-soft">
          <span>
            #{order.id} {formatTime(order.createdAt)}
          </span>
          <Coins amount={order.totalPrice} className="text-sm text-ink" />
        </div>
        <p className={cx("mt-1 text-xs", awaitingQr ? "text-coral-deep" : "text-ink-soft")}>
          {order.paymentMethod === "QR_MOCK" ? "QR" : "เหรียญ"}: {paymentStatusLabel[order.paymentStatus]}
        </p>
        <FileLink href={order.paymentSlipUrl} label="ดูสลิป" />
        {awaitingQr && order.status === "PENDING" && (
          <p className="mt-2 rounded-md bg-butter-soft px-2 py-1 text-xs">กดรับงาน = ยืนยันว่าตรวจยอดโอนแล้ว</p>
        )}
        <div className="mt-3 flex gap-2">
          <Button variant="danger" className="px-3" onClick={handleCancel}>
            ยกเลิก
          </Button>
          {action && (
            <Button className="flex-1" onClick={() => onAction(action.status)}>
              {action.label}
            </Button>
          )}
        </div>
      </Receipt>
    </li>
  );
};

export default function AdminPage() {
  const { isReady } = useRequireAuth("ADMIN");
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    const [shop, queue, topups, earnings] = await Promise.all([
      api.shop.status(),
      api.admin.queue(),
      api.admin.topups("PENDING"),
      api.admin.earnings(),
    ]);
    return { shop, queue, topups, earnings };
  }, []);
  const { data, reload } = usePolledData(loadDashboard, { enabled: isReady });

  if (!isReady || !data) return <Loading />;

  const runAction = async (action: () => Promise<unknown>) => {
    setError(null);
    try {
      await action();
      await reload();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const { shop, queue, topups, earnings } = data;

  return (
    <>
      <PageHeader
        title="ราวใบสั่ง"
        seed={1}
        subtitle={`เปิด ${formatClock(shop.openTime)}–${formatClock(shop.closeTime)} น.${
          shop.rushStart ? ` เร่งด่วน ${formatClock(shop.rushStart)}–${formatClock(shop.rushEnd)} น.` : ""
        }`}
        action={
          <button
            onClick={() => runAction(shop.open ? api.admin.closeShop : api.admin.openShop)}
            role="switch"
            aria-checked={shop.open}
            className="flex items-center gap-3 rounded-full bg-paper py-1.5 pr-4 pl-1.5 shadow-sm ring-2 ring-line"
          >
            <span
              className={cx(
                "relative h-8 w-14 rounded-full transition-colors",
                shop.open ? "bg-leaf" : "bg-line",
              )}
            >
              <span
                className={cx(
                  "absolute top-1 size-6 rounded-full bg-paper shadow transition-[left]",
                  shop.open ? "left-7" : "left-1",
                )}
              />
            </span>
            <span className="font-chunky">{shop.open ? "เปิดรับคิว" : "ปิดรับคิว"}</span>
          </button>
        }
      />

      {shop.open && !shop.withinHours && (
        <p className="-mt-4 mb-6 font-hand text-lg text-coral-deep">ตอนนี้อยู่นอกเวลาทำการ ลูกค้าจะยังสั่งไม่ได้</p>
      )}

      <div className="mb-10 flex flex-wrap gap-4">
        <div className="-rotate-1 rounded-md bg-leaf-soft px-5 py-3 shadow-sm">
          <p className="text-sm text-ink-soft">รายได้ของฉัน</p>
          <Coins amount={earnings.serviceRevenue} className="font-chunky text-2xl" />
        </div>
        <div className="rotate-1 rounded-md bg-blush px-5 py-3 shadow-sm">
          <p className="text-sm text-ink-soft">ทิป</p>
          <Coins amount={earnings.tipsReceived} className="font-chunky text-2xl" />
        </div>
        <div className="-rotate-[0.5deg] rounded-md bg-sky-soft px-5 py-3 shadow-sm">
          <p className="text-sm text-ink-soft">ส่งแล้ว</p>
          <p className="font-chunky text-2xl">{earnings.completedOrders} งาน</p>
        </div>
      </div>

      <ErrorText message={error} />

      <section aria-label="ใบสั่งที่ยังไม่เสร็จ" className="grid gap-8 md:grid-cols-3">
        {RAIL.map((status) => {
          const tickets = queue.filter((o) => o.status === status);
          return (
            <div key={status}>
              <div className="flex items-baseline justify-between border-b-[3px] border-ink/70 pb-1">
                <h2 className="text-2xl">{statusLabel[status]}</h2>
                <span className="font-chunky text-ink-soft">{tickets.length}</span>
              </div>
              {tickets.length === 0 && <p className="mt-6 font-hand text-lg text-ink-soft">ว่าง</p>}
              <ul className="mt-9 space-y-12">
                {tickets.map((order, index) => (
                  <RailTicket
                    key={order.id}
                    order={order}
                    tilt={TICKET_TILTS[index % TICKET_TILTS.length]}
                    onAction={(next, reason) => runAction(() => api.admin.updateOrderStatus(order.id, next, reason))}
                  />
                ))}
              </ul>
            </div>
          );
        })}
      </section>

      <section className="paper lined relative mt-14 px-6 pt-9 pb-6 pl-12">
        <Tape color="leaf" className="-top-3 left-10 -rotate-3" />
        <h2 className="text-2xl">คำขอเติมเงินรอตรวจ</h2>
        {topups.length === 0 && <p className="mt-2 text-ink-soft">ไม่มีคำขอค้าง</p>}
        <ul className="mt-3 divide-y-2 divide-dashed divide-line">
          {topups.map((topup) => (
            <li key={topup.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="font-chunky text-lg">{topup.amount} บาท</p>
                <p className="text-xs text-ink-soft">
                  {formatTime(topup.createdAt)} ผู้ใช้ {topup.userId.slice(0, "xxxxxxxx".length)}
                </p>
                <FileLink href={topup.slipUrl} label="ดูสลิป" />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="danger"
                  onClick={() => {
                    const reason = window.prompt("เหตุผลที่ปฏิเสธ", "สลิปไม่ถูกต้อง");
                    if (reason !== null) void runAction(() => api.admin.rejectTopup(topup.id, reason));
                  }}
                >
                  ปฏิเสธ
                </Button>
                <Button onClick={() => runAction(() => api.admin.approveTopup(topup.id))}>อนุมัติ</Button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
