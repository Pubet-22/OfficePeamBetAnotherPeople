"use client";

import { useCallback, useState } from "react";
import { FileLink } from "@/components/OrderSummary";
import { BinderClip, PageHeader, Sticker, Tape } from "@/components/scrapbook";
import {
  Button,
  Chip,
  Coins,
  cx,
  ErrorText,
  fileInputClass,
  inputClass,
  Label,
  Loading,
  Notice,
  Receipt,
  Tear,
} from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { errorMessage, usePolledData, useRequireAuth } from "@/lib/hooks";
import { formatTime, topupStatusLabel, transactionLabel } from "@/lib/labels";
import { session } from "@/lib/session";

const TOPUP_SMALL = 100;
const TOPUP_MEDIUM = 300;
const TOPUP_LARGE = 500;
const TOPUP_PRESETS = [TOPUP_SMALL, TOPUP_MEDIUM, TOPUP_LARGE];

export default function WalletPage() {
  const { user, isReady } = useRequireAuth("USER");
  const { refreshUser } = useAuth();
  const [amount, setAmount] = useState(TOPUP_MEDIUM);
  const [slip, setSlip] = useState<File | null>(null);
  const [slipInputKey, setSlipInputKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const loadWallet = useCallback(async () => {
    const [shop, topups, transactions] = await Promise.all([
      api.shop.status(),
      api.wallet.topups(),
      api.wallet.transactions(),
    ]);
    await refreshUser();
    return { shop, topups, transactions };
  }, [refreshUser]);
  const { data, reload } = usePolledData(loadWallet, { enabled: isReady });

  if (!isReady || !user || !data) return <Loading />;
  const { shop, topups, transactions } = data;

  const runAction = async (action: () => Promise<string>) => {
    setError(null);
    setNotice(null);
    setIsBusy(true);
    try {
      setNotice(await action());
      await reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsBusy(false);
    }
  };

  const submitTopup = (file: File) =>
    runAction(async () => {
      const slipUrl = await session().uploadFile("slips", file);
      await api.wallet.requestTopup(amount, slipUrl);
      setSlip(null);
      setSlipInputKey((key) => key + 1);
      return "ส่งคำขอแล้ว รอแอดมินตรวจสลิป";
    });

  const upgrade = () => {
    if (!window.confirm(`สมัคร Premium ${shop.premiumPrice} เหรียญ รับโบนัส ${shop.premiumBonusCoins} เหรียญ?`)) return;
    void runAction(async () => {
      await api.me.upgradeToPremium();
      return "ยินดีต้อนรับสมาชิก Premium";
    });
  };

  return (
    <>
      <PageHeader title="กระเป๋าเงิน" seed={6} />

      <div className="grid gap-10 md:grid-cols-[1fr_1fr]">
        <div className="space-y-10">
          {/* gingham coin card */}
          <section className="gingham relative -rotate-1 rounded-xl p-5 shadow-[0_14px_24px_-16px_rgb(59_42_32/0.5)]">
            <BinderClip color="coral" />
            <div className="stitched rounded-lg bg-paper px-5 py-6 text-center">
              <p className="font-hand text-xl text-ink-soft">เหรียญคงเหลือ</p>
              <Coins amount={user.coinBalance} className="font-chunky text-5xl" />
            </div>
          </section>

          {user.premium ? (
            <Sticker color="butter" className="rotate-2 px-5 py-2 font-hand text-xl">
              ★ สมาชิก Premium
            </Sticker>
          ) : (
            <section className="relative rotate-1 rounded-md bg-butter-soft px-6 pt-7 pb-6 shadow-[0_12px_22px_-16px_rgb(59_42_32/0.45)]">
              <Tape color="pink" className="-top-3 left-6 -rotate-6" />
              <h2 className="text-2xl">อัปเกรดเป็น Premium</h2>
              <ul className="mt-2 space-y-1 text-sm">
                <li>รับโบนัส {shop.premiumBonusCoins} เหรียญทันที</li>
                <li>ลด {shop.premiumDiscountPercent}% ทุกออเดอร์</li>
                <li>ได้คิวก่อน และสั่งช่วงเร่งด่วนได้</li>
              </ul>
              <Button className="mt-4" onClick={upgrade} disabled={isBusy}>
                สมัคร <Coins amount={shop.premiumPrice} />
              </Button>
            </section>
          )}

          {notice && <Notice>{notice}</Notice>}
          <ErrorText message={error} />

          <section className="paper lined relative px-6 pt-9 pb-6 pl-12">
            <Tape color="sky" className="-top-3 right-8 rotate-3" />
            <h2 className="text-2xl">เติมเหรียญ</h2>
            <p className="text-sm text-ink-soft">สแกนโอน แนบสลิป แล้วรอแอดมินตรวจ</p>
            <div className="mt-4 flex flex-col gap-5 sm:flex-row">
              {shop.qrImageUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- QR comes from admin settings, any host
                <img
                  src={shop.qrImageUrl}
                  alt="QR สำหรับเติมเงิน"
                  className="size-36 shrink-0 -rotate-2 rounded-md bg-paper p-2 shadow-sm"
                />
              )}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  {TOPUP_PRESETS.map((preset) => (
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
                    aria-label="จำนวนเงิน"
                  />
                </div>
                <label className="block">
                  <Label>สลิปโอนเงิน</Label>
                  <input
                    key={slipInputKey}
                    type="file"
                    accept="image/*"
                    className={fileInputClass}
                    onChange={(e) => setSlip(e.target.files?.[0] ?? null)}
                  />
                </label>
                <Button onClick={() => slip && submitTopup(slip)} disabled={isBusy || !slip || amount < 1}>
                  ส่งคำขอเติม {amount} เหรียญ
                </Button>
              </div>
            </div>
          </section>
        </div>

        <Receipt className="relative self-start rotate-[0.5deg]">
          <BinderClip color="lilac" />
          <h2 className="text-center font-serif-cut text-xl">ประวัติเหรียญ</h2>
          {topups.length > 0 && (
            <>
              <Tear />
              <p className="mb-2 text-sm font-medium">คำขอเติมเงิน</p>
              <ul className="space-y-2 text-sm">
                {topups.map((topup) => (
                  <li key={topup.id} className="flex flex-wrap items-center justify-between gap-x-3">
                    <span>
                      {topup.amount} บาท
                      <span className="ml-2 text-ink-soft">{topupStatusLabel[topup.status]}</span>
                      {topup.rejectReason && <span className="block text-berry">{topup.rejectReason}</span>}
                    </span>
                    <FileLink href={topup.slipUrl} label="สลิป" />
                  </li>
                ))}
              </ul>
            </>
          )}
          <Tear />
          {transactions.length === 0 && <p className="text-center text-sm text-ink-soft">ยังไม่มีรายการ</p>}
          <ul className="space-y-3 text-sm">
            {transactions.map((tx) => (
              <li key={tx.id} className="flex items-start justify-between gap-3">
                <div>
                  <p>
                    {transactionLabel[tx.type]}
                    {tx.orderId && <span className="text-ink-soft"> #{tx.orderId}</span>}
                  </p>
                  <p className="text-xs text-ink-soft">{formatTime(tx.createdAt)}</p>
                </div>
                <div className="text-right tabular-nums">
                  <p className={tx.amount >= 0 ? "text-leaf" : "text-ink"}>
                    {tx.amount >= 0 ? "+" : ""}
                    {tx.amount}
                  </p>
                  <p className="text-xs text-ink-soft">เหลือ {tx.balanceAfter}</p>
                </div>
              </li>
            ))}
          </ul>
        </Receipt>
      </div>
    </>
  );
}
