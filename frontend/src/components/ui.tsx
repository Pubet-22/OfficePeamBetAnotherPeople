import type { ButtonHTMLAttributes, ReactNode } from "react";
import { statusLabel } from "@/lib/labels";
import type { OrderStatus } from "@/lib/types";

export const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(" ");

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type ButtonSize = "md" | "lg";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-coral text-paper shadow-[0_3px_0_var(--color-coral-deep)] hover:bg-coral-deep",
  secondary: "bg-paper text-ink ring-1 ring-line shadow-[0_3px_0_var(--color-line)] hover:bg-butter-soft",
  danger: "bg-paper text-berry ring-1 ring-berry/30 hover:bg-blush",
  ghost: "text-ink-soft hover:bg-butter-soft hover:text-ink",
};

const buttonSizes: Record<ButtonSize, string> = {
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

export const Button = ({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) => (
  <button
    className={cx(
      "inline-flex items-center justify-center gap-2 rounded-xl font-chunky font-medium transition-[background-color,transform,box-shadow] active:translate-y-[2px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none",
      buttonVariants[variant],
      buttonSizes[size],
      className,
    )}
    {...props}
  />
);

/** A sheet of paper on the desk. Decorations (clips, tape) are placed by the caller. */
export const Panel = ({ children, className }: { children: ReactNode; className?: string }) => (
  <section className={cx("paper p-5 sm:p-6", className)}>{children}</section>
);

/** Till receipt with a torn bottom edge — used for the order itself. */
export const Receipt = ({ children, className }: { children: ReactNode; className?: string }) => (
  <section className={cx("receipt px-5 pt-7 pb-6", className)}>{children}</section>
);

export const Tear = () => <div className="tear my-4" role="separator" />;

export const SectionTitle = ({ children, hint }: { children: ReactNode; hint?: ReactNode }) => (
  <div className="mb-3 flex items-baseline justify-between gap-3">
    <h2 className="text-2xl text-ink">{children}</h2>
    {hint && <span className="text-sm text-ink-soft">{hint}</span>}
  </div>
);

const statusStyle: Record<OrderStatus, string> = {
  PENDING: "bg-butter-soft text-ink",
  ACCEPTED: "bg-sky-soft text-ink",
  IN_PROGRESS: "bg-blush text-coral-deep",
  COMPLETED: "bg-leaf-soft text-ink",
  CANCELLED: "bg-line/60 text-ink-soft line-through decoration-1",
};

/** Sewn fabric label. */
export const StatusBadge = ({ status }: { status: OrderStatus }) => (
  <span className={cx("stitched inline-block rounded-md px-3 py-1 text-sm font-medium whitespace-nowrap", statusStyle[status])}>
    {statusLabel[status]}
  </span>
);

export const ErrorText = ({ message }: { message: string | null | undefined }) =>
  message ? (
    <p role="alert" className="rounded-lg bg-blush px-4 py-2.5 text-sm text-berry">
      {message}
    </p>
  ) : null;

export const Notice = ({ children }: { children: ReactNode }) => (
  <p className="rounded-lg bg-leaf-soft px-4 py-2.5 text-sm text-ink">{children}</p>
);

export const Label = ({ children, hint }: { children: ReactNode; hint?: string }) => (
  <span className="mb-1.5 block text-sm font-medium text-ink">
    {children}
    {hint && <span className="ml-1.5 font-normal text-ink-soft">{hint}</span>}
  </span>
);

export const inputClass =
  "w-full rounded-lg border-2 border-line bg-paper px-3.5 py-2.5 text-base text-ink placeholder:text-ink-soft/60 outline-none transition-colors focus:border-sky focus-visible:outline-none";

export const fileInputClass =
  "w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-butter-soft file:px-3 file:py-1.5 file:font-medium file:text-ink";

/** Coin amount, drawn as a little gold coin. */
export const Coins = ({ amount, className }: { amount: number; className?: string }) => (
  <span className={cx("inline-flex items-center gap-1.5 tabular-nums", className)}>
    <span
      aria-hidden
      className="inline-block size-[0.85em] rounded-full bg-butter ring-2 ring-[#e0b94a] ring-inset"
    />
    {amount.toLocaleString("th-TH")}
    <span className="sr-only">เหรียญ</span>
  </span>
);

export const Loading = () => (
  <p className="py-16 text-center font-hand text-xl text-ink-soft" aria-live="polite">
    กำลังโหลด…
  </p>
);

export const Chip = ({
  selected,
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { selected: boolean }) => (
  <button
    type="button"
    aria-pressed={selected}
    className={cx(
      "rounded-full border-2 px-4 py-1.5 text-sm transition-colors disabled:opacity-35",
      selected ? "border-sky bg-sky text-paper" : "border-line bg-paper text-ink hover:border-sky",
      className,
    )}
    {...props}
  >
    {children}
  </button>
);

export const PremiumMark = () => (
  <span className="stitched inline-flex items-center rounded-md bg-butter px-2.5 py-0.5 text-xs font-medium text-ink">
    ★ Premium
  </span>
);
