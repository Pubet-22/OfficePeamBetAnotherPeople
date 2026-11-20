import { categoryLabel, sweetnessLabel, temperatureLabel } from "@/lib/labels";
import type { Order, OrderStatus } from "@/lib/types";
import { ClipIcon, PinIcon } from "./icons";
import type { ClipColor } from "./scrapbook";

/** One-line description of what was ordered. */
export const orderTitle = (order: Order) => {
  if (order.serviceType === "GENERAL") return categoryLabel[order.generalCategory ?? "OTHER"];
  return `${order.menuName ?? "กาแฟ"} × ${order.quantity}`;
};

export const orderOptions = (order: Order) =>
  [order.temperature && temperatureLabel[order.temperature], sweetnessLabel(order.sweetnessLevel)]
    .filter(Boolean)
    .join(", ");

/** Binder-clip colour per status, so the rail reads at a glance. */
export const statusClip: Record<OrderStatus, ClipColor> = {
  PENDING: "butter",
  ACCEPTED: "sky",
  IN_PROGRESS: "coral",
  COMPLETED: "leaf",
  CANCELLED: "lilac",
};

export const OrderLocation = ({ order }: { order: Order }) => (
  <span className="inline-flex items-start gap-1.5">
    <PinIcon className="mt-0.5 size-4 shrink-0 text-coral" />
    <span>
      โต๊ะ {order.deskLocation}
      {order.locationNote && <span className="block text-ink-soft">{order.locationNote}</span>}
    </span>
  </span>
);

export const FileLink = ({ href, label }: { href: string | null; label: string }) =>
  href ? (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 text-sm text-coral underline-offset-2 hover:underline"
    >
      <ClipIcon className="size-4" />
      {label}
    </a>
  ) : null;
