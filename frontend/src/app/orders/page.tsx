"use client";

import Link from "next/link";
import { useCallback } from "react";
import { orderOptions, orderTitle, OrderLocation, statusClip } from "@/components/OrderSummary";
import { BinderClip, PageHeader } from "@/components/scrapbook";
import { Coins, cx, ErrorText, Loading, StatusBadge } from "@/components/ui";
import { api } from "@/lib/api";
import { usePolledData, useRequireAuth } from "@/lib/hooks";
import { formatTime } from "@/lib/labels";

const NOTE_TILTS = ["-rotate-1", "rotate-1", "rotate-[0.6deg]", "-rotate-[0.6deg]"];

export default function MyOrdersPage() {
  const { isReady } = useRequireAuth("USER");
  const loadOrders = useCallback(() => api.orders.mine(), []);
  const { data, error } = usePolledData(loadOrders, { enabled: isReady });

  if (!isReady) return <Loading />;

  return (
    <>
      <PageHeader title="ออเดอร์ของฉัน" seed={4} subtitle="หน้านี้อัปเดตเองทุก 5 วินาที" />
      <ErrorText message={error} />
      {!data && !error && <Loading />}
      {data?.length === 0 && (
        <div className="paper lined mx-auto max-w-md -rotate-1 px-6 py-10 pl-12 text-center">
          <p className="font-hand text-2xl">ยังไม่มีใบสั่งเลย</p>
          <Link href="/" className="mt-3 inline-block font-chunky text-coral hover:underline">
            สั่งแก้วแรกกัน
          </Link>
        </div>
      )}
      <ul className="grid gap-x-6 gap-y-10 pt-4 sm:grid-cols-2">
        {data?.map((order, index) => (
          <li key={order.id} className={NOTE_TILTS[index % NOTE_TILTS.length]}>
            <Link href={`/orders/${order.id}`} className="paper relative block px-5 pt-7 pb-5 transition-transform hover:-translate-y-1">
              <BinderClip color={statusClip[order.status]} />
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-chunky text-lg leading-snug">{orderTitle(order)}</p>
                  {order.serviceType === "COFFEE" && <p className="text-sm text-ink-soft">{orderOptions(order)}</p>}
                </div>
                <StatusBadge status={order.status} />
              </div>
              <div className="mt-3 text-sm">
                <OrderLocation order={order} />
              </div>
              <div className="tear mt-4 flex items-end justify-between pt-3 text-sm">
                <span className="text-ink-soft">
                  #{order.id}
                  <span className="mx-2">/</span>
                  {formatTime(order.createdAt)}
                </span>
                <Coins amount={order.totalPrice} className="font-chunky" />
              </div>
              {order.queueAhead !== null && (
                <p className={cx("mt-2 font-hand text-lg", order.queueAhead === 0 ? "text-leaf" : "text-coral")}>
                  {order.queueAhead === 0 ? "คิวถัดไปคือคุณ" : `รออีก ${order.queueAhead} คิว`}
                </p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
