"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { categoryIcon } from "@/components/icons";
import { BinderClip, DrinkArt, liquidFor, PageHeader, Sticker, Tape } from "@/components/scrapbook";
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
  Panel,
  Receipt,
  SectionTitle,
  Tear,
} from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { errorMessage, usePolledData, useRequireAuth } from "@/lib/hooks";
import {
  categoryLabel,
  sweetnessLabel,
  SWEETNESS_LEVELS,
  temperatureLabel,
} from "@/lib/labels";
import { session } from "@/lib/session";
import type {
  CreateOrderRequest,
  GeneralCategory,
  Menu,
  PaymentMethod,
  ShopStatus,
  SweetnessLevel,
  Temperature,
} from "@/lib/types";

const PERCENT_BASE = 100;
const MAX_QUANTITY = 20;

type ServiceChoice = "COFFEE" | GeneralCategory;
type StickerColor = "pink" | "sky" | "leaf" | "butter" | "lilac";

const SERVICES: { key: ServiceChoice; color: StickerColor }[] = [
  { key: "COFFEE", color: "butter" },
  { key: "WASH_GLASS", color: "sky" },
  { key: "TRASH", color: "leaf" },
  { key: "PICKUP_FOOD", color: "pink" },
  { key: "PRINT", color: "lilac" },
  { key: "OTHER", color: "butter" },
];

const CARD_TILTS = ["-rotate-1", "rotate-1", "rotate-[0.5deg]", "-rotate-[0.5deg]"];

/** Hot-only or iced-only menus show that; menus offering both alternate so the grid has variety. */
const drinkKind = (menu: Menu, index: number): "hot" | "iced" => {
  if (!menu.allowIced) return "hot";
  if (!menu.allowHot) return "iced";
  return index % 2 === 0 ? "iced" : "hot";
};

const choiceLabel = (choice: ServiceChoice) => (choice === "COFFEE" ? "กาแฟ" : categoryLabel[choice]);

const detailsPlaceholder: Record<GeneralCategory, string> = {
  WASH_GLASS: "แก้ว 3 ใบ วางอยู่ข้างจอ",
  TRASH: "ถังใต้โต๊ะ 1 ถุง",
  PICKUP_FOOD: "Grab ชื่อบี เบอร์ท้าย 1234 รออยู่ล็อบบี้",
  PRINT: "ขาว-ดำ 2 ชุด เย็บมุมซ้าย",
  OTHER: "บอกสิ่งที่อยากให้ช่วย",
};

const menuTemperatures = (menu: Menu): Temperature[] =>
  (["HOT", "ICED"] as const).filter((t) => (t === "HOT" ? menu.allowHot : menu.allowIced));

const shopSubtitle = (shop: ShopStatus | null) => {
  if (!shop) return " ";
  return shop.canOrder ? "พร้อมรับออเดอร์ เดินไปส่งถึงโต๊ะ" : shop.message;
};

export default function OrderPage() {
  const { user, isReady } = useRequireAuth("USER");
  const { refreshUser } = useAuth();
  const router = useRouter();

  const { data: shop } = usePolledData(api.shop.status, { enabled: isReady });
  const [menus, setMenus] = useState<Menu[]>([]);

  const [choice, setChoice] = useState<ServiceChoice>("COFFEE");
  const [menuId, setMenuId] = useState<number | null>(null);
  const [temperature, setTemperature] = useState<Temperature>("ICED");
  const [sweetness, setSweetness] = useState<SweetnessLevel | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [details, setDetails] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [deskLocation, setDeskLocation] = useState("");
  const [locationNote, setLocationNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("WALLET");
  const [slip, setSlip] = useState<File | null>(null);
  const [qrConfirmed, setQrConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isReady) return;
    const loadMenus = async () => setMenus(await api.menus.list());
    void loadMenus();
  }, [isReady]);

  if (!isReady || !user) return <Loading />;

  const isCoffee = choice === "COFFEE";
  const menu = menus.find((m) => m.id === menuId);
  const coffeeFee = shop?.coffeeServiceFee ?? 0;
  const drinksPrice = menu ? menu.price * quantity : 0;
  const coffeePrice = menu ? drinksPrice + coffeeFee : 0;
  const subtotal = isCoffee ? coffeePrice : (shop?.generalServiceFee ?? 0);
  const discountPercent = user.premium ? (shop?.premiumDiscountPercent ?? 0) : 0;
  const discount = Math.round(((subtotal * discountPercent) / PERCENT_BASE) * PERCENT_BASE) / PERCENT_BASE;
  const total = subtotal - discount;
  const notEnoughCoins = paymentMethod === "WALLET" && total > user.coinBalance;
  const itemReady = isCoffee ? !!menu : details.trim().length > 0;
  const canSubmit =
    !!shop?.canOrder &&
    itemReady &&
    deskLocation.trim().length > 0 &&
    !notEnoughCoins &&
    (paymentMethod === "WALLET" || qrConfirmed);

  const coffeeLine = menu ? `${menu.name} ${temperatureLabel[temperature]}` : "ยังไม่ได้เลือกเมนู";
  const receiptItem = isCoffee ? coffeeLine : choiceLabel(choice);

  const selectMenu = (item: Menu) => {
    setMenuId(item.id);
    const temperatures = menuTemperatures(item);
    if (!temperatures.includes(temperature)) setTemperature(temperatures[0]);
  };

  const buildRequest = async (): Promise<CreateOrderRequest> => {
    const common = {
      deskLocation,
      locationNote: locationNote.trim() || null,
      paymentMethod,
      ...(paymentMethod === "QR_MOCK" && {
        qrTransferConfirmed: qrConfirmed,
        paymentSlipUrl: slip ? await session().uploadFile("slips", slip) : null,
      }),
    };
    if (isCoffee) {
      return {
        ...common,
        serviceType: "COFFEE",
        menuId: menuId ?? undefined,
        temperature,
        sweetnessLevel: sweetness ?? undefined,
        quantity,
        customDetails: details.trim() || null,
      };
    }
    return {
      ...common,
      serviceType: "GENERAL",
      generalCategory: choice,
      customDetails: details,
      attachmentUrl: choice === "PRINT" && attachment ? await session().uploadFile("attachments", attachment) : null,
    };
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setFields({});
    setIsSubmitting(true);
    try {
      const order = await api.orders.create(await buildRequest());
      await refreshUser();
      router.push(`/orders/${order.id}`);
    } catch (err) {
      setError(errorMessage(err));
      if (err instanceof ApiError) setFields(err.fields);
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="วันนี้รับอะไรดี"
        subtitle={shopSubtitle(shop)}
        action={
          shop?.rushHour && (
            <Sticker color="pink" className="rotate-3 px-4 py-1.5 font-hand text-lg">
              ช่วงเร่งด่วน
            </Sticker>
          )
        }
      />

      <form onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-[1fr_340px] lg:items-start">
        <div className="space-y-8">
          <div className="flex flex-wrap gap-3" role="radiogroup" aria-label="บริการ">
            {SERVICES.map(({ key, color }) => {
              const Glyph = categoryIcon[key];
              const selected = choice === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setChoice(key)}
                  className={cx("transition-transform", selected ? "-rotate-2 scale-105" : "hover:-rotate-1")}
                >
                  <Sticker
                    color={selected ? "coral" : color}
                    className="gap-2 px-4 py-2 font-chunky text-sm font-medium"
                  >
                    <Glyph className="size-5" />
                    {choiceLabel(key)}
                  </Sticker>
                </button>
              );
            })}
          </div>

          {isCoffee ? (
            <>
              <section aria-label="เมนูกาแฟ">
                <SectionTitle hint={<>เครื่องดื่มจากตู้ ฟรี จ่ายแค่ค่าวิ่ง <Coins amount={coffeeFee} /> ต่อออเดอร์</>}>
                  เมนู
                </SectionTitle>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {menus.map((item, index) => {
                    const selected = menuId === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        disabled={!item.available}
                        aria-pressed={selected}
                        onClick={() => selectMenu(item)}
                        className={cx(
                          "paper relative flex flex-col items-center px-3 pt-4 pb-3 text-center transition-transform disabled:opacity-40",
                          CARD_TILTS[index % CARD_TILTS.length],
                          selected ? "ring-[3px] ring-coral" : "hover:-translate-y-0.5",
                        )}
                      >
                        {selected && <Tape color="pink" className="-top-3 left-1/2 w-16 -translate-x-1/2 rotate-[-4deg]" />}
                        <DrinkArt
                          kind={drinkKind(item, index)}
                          liquid={liquidFor(item.description ?? item.name)}
                          className="h-24 w-24"
                        />
                        <span className="mt-2 font-chunky text-base leading-snug">{item.name}</span>
                        <span className="text-xs text-ink-soft">{item.description}</span>
                        {item.price > 0 && <Coins amount={item.price} className="mt-1.5 font-chunky text-coral" />}
                        {item.price === 0 && <span className="mt-1.5 font-chunky text-leaf">ฟรี</span>}
                      </button>
                    );
                  })}
                </div>
              </section>

              <Panel className="grid gap-5 sm:grid-cols-2">
                <div>
                  <Label>จำนวน</Label>
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="secondary"
                      aria-label="ลดจำนวน"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    >
                      −
                    </Button>
                    <span className="w-6 text-center font-chunky text-lg tabular-nums">{quantity}</span>
                    <Button
                      type="button"
                      variant="secondary"
                      aria-label="เพิ่มจำนวน"
                      onClick={() => setQuantity(Math.min(MAX_QUANTITY, quantity + 1))}
                    >
                      +
                    </Button>
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <Label hint="ไม่บังคับ">ความหวาน</Label>
                  <div className="flex flex-wrap gap-2">
                    <Chip selected={sweetness === null} onClick={() => setSweetness(null)}>
                      ตามเมนู
                    </Chip>
                    {SWEETNESS_LEVELS.map((level) => (
                      <Chip key={level} selected={sweetness === level} onClick={() => setSweetness(level)}>
                        {sweetnessLabel(level)}
                      </Chip>
                    ))}
                  </div>
                </div>
                <label className="block sm:col-span-2">
                  <Label hint="ไม่บังคับ">ฝากบอกบาริสต้า</Label>
                  <input
                    className={inputClass}
                    placeholder="ขอหลอดด้วย, ใส่แก้วที่วางบนโต๊ะ"
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                  />
                </label>
              </Panel>
            </>
          ) : (
            <section className="paper lined relative space-y-5 px-6 pt-8 pb-6 pl-12">
              <Tape color="sky" className="-top-3 left-8 -rotate-3" />
              <label className="block">
                <span className="mb-2 block font-hand text-2xl">อยากให้ช่วยอะไร</span>
                <textarea
                  rows={4}
                  className={cx(inputClass, "bg-paper/80")}
                  placeholder={detailsPlaceholder[choice]}
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                />
              </label>
              {choice === "PRINT" && (
                <label className="block">
                  <Label hint="PDF หรือ Word">ไฟล์ที่จะปริ้น</Label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className={fileInputClass}
                    onChange={(e) => setAttachment(e.target.files?.[0] ?? null)}
                  />
                </label>
              )}
              <p className="text-sm text-ink-soft">
                ค่าบริการ <Coins amount={shop?.generalServiceFee ?? 0} /> ต่อครั้ง
              </p>
            </section>
          )}
        </div>

        <div className="lg:sticky lg:top-28">
          <Receipt className="relative rotate-1">
            <BinderClip color="leaf" />
            <h2 className="text-center font-serif-cut text-xl tracking-wide">ใบสั่ง</h2>
            <p className="text-center text-xs text-ink-soft">Office Runner</p>
            <Tear />
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{receiptItem}</p>
                {isCoffee && menu && (
                  <p className="text-sm text-ink-soft">
                    {[sweetness !== null && sweetnessLabel(sweetness), `${quantity} แก้ว`].filter(Boolean).join(", ")}
                  </p>
                )}
              </div>
              {isCoffee && menu && drinksPrice === 0 && <span className="text-leaf">ฟรี</span>}
              {isCoffee && drinksPrice > 0 && <Coins amount={drinksPrice} />}
              {!isCoffee && subtotal > 0 && <Coins amount={subtotal} />}
            </div>
            {isCoffee && menu && (
              <p className="mt-1 flex justify-between text-sm">
                <span>ค่าวิ่งไปตู้กาแฟ</span>
                <Coins amount={coffeeFee} />
              </p>
            )}
            {discount > 0 && (
              <p className="mt-1 flex justify-between text-sm text-leaf">
                <span>ส่วนลด Premium {discountPercent}%</span>
                <span className="tabular-nums">−{discount}</span>
              </p>
            )}

            <Tear />

            <div className="space-y-3">
              <label className="block">
                <Label>ส่งที่โต๊ะ</Label>
                <input
                  className={inputClass}
                  placeholder="เช่น B-12"
                  value={deskLocation}
                  onChange={(e) => setDeskLocation(e.target.value)}
                />
                {fields.deskLocation && <span className="mt-1 block text-sm text-berry">กรอกเลขโต๊ะ</span>}
              </label>
              <label className="block">
                <Label hint="ไม่บังคับ">จุดสังเกต</Label>
                <input
                  className={inputClass}
                  placeholder="ริมหน้าต่าง ใกล้ห้องประชุม B"
                  value={locationNote}
                  onChange={(e) => setLocationNote(e.target.value)}
                />
              </label>
            </div>

            <Tear />

            <Label>จ่ายด้วย</Label>
            <div className="flex gap-2">
              <Chip selected={paymentMethod === "WALLET"} onClick={() => setPaymentMethod("WALLET")}>
                เหรียญ
              </Chip>
              <Chip selected={paymentMethod === "QR_MOCK"} onClick={() => setPaymentMethod("QR_MOCK")}>
                สแกน QR
              </Chip>
            </div>
            {paymentMethod === "WALLET" && !notEnoughCoins && (
              <p className="mt-2 text-sm text-ink-soft">
                มีอยู่ <Coins amount={user.coinBalance} />
              </p>
            )}
            {notEnoughCoins && <p className="mt-2 text-sm text-berry">เหรียญไม่พอ เติมได้ที่หน้ากระเป๋าเงิน</p>}
            {paymentMethod === "QR_MOCK" && (
              <div className="mt-3 space-y-3 rounded-lg bg-sky-soft/60 p-3">
                {shop?.qrImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- QR comes from admin settings, any host
                  <img src={shop.qrImageUrl} alt="QR สำหรับโอนเงิน" className="mx-auto size-36 rounded-md bg-paper p-2" />
                ) : (
                  <p className="text-sm text-ink-soft">ร้านยังไม่ได้ตั้งรูป QR</p>
                )}
                <label className="block">
                  <Label hint="ไม่บังคับ">สลิป</Label>
                  <input
                    type="file"
                    accept="image/*"
                    className={fileInputClass}
                    onChange={(e) => setSlip(e.target.files?.[0] ?? null)}
                  />
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="size-4 accent-coral"
                    checked={qrConfirmed}
                    onChange={(e) => setQrConfirmed(e.target.checked)}
                  />
                  โอน {total} บาทแล้ว
                </label>
              </div>
            )}

            <Tear />

            <div className="flex items-baseline justify-between">
              <span className="font-serif-cut">รวม</span>
              <Coins amount={total} className="font-chunky text-3xl" />
            </div>
            <div className="mt-4 space-y-3">
              <ErrorText message={error} />
              <Button type="submit" size="lg" className="w-full" disabled={isSubmitting || !canSubmit}>
                {isSubmitting ? "กำลังส่งใบสั่ง…" : "ส่งใบสั่ง"}
              </Button>
            </div>
          </Receipt>
        </div>
      </form>
    </>
  );
}
