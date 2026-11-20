// Scrapbook pieces: cut-out letters, binder clips, washi tape, stickers and drink drawings.

import { useId, type ReactNode } from "react";
import { cx } from "./ui";

// ---------- Cut-out ransom letters ----------

const TILE_STYLES = [
  "bg-pink text-paper font-chunky",
  "bg-butter text-ink font-serif-cut",
  "bg-sky text-paper font-chunky",
  "bg-paper text-coral font-serif-cut ring-1 ring-line",
  "bg-leaf-soft text-ink font-hand",
  "bg-coral text-paper font-chunky",
  "bg-lilac text-paper font-serif-cut",
  "bg-blush text-coral-deep font-hand",
];
const TILE_TILTS = ["-rotate-3", "rotate-2", "-rotate-1", "rotate-3", "rotate-1", "-rotate-2"];

const tileSizes = {
  sm: "px-1 text-base leading-7",
  md: "px-1.5 text-2xl leading-10",
  lg: "px-2 text-3xl leading-[3.25rem] sm:text-4xl",
};

/** Thai-safe split: keeps vowels and tone marks attached to their consonant. */
const graphemes = (text: string) =>
  Array.from(new Intl.Segmenter("th", { granularity: "grapheme" }).segment(text), (s) => s.segment);

/** Headline made of letters cut from magazines — every character its own paper tile. */
export const Ransom = ({
  text,
  size = "md",
  seed = 0,
  nowrap = false,
  className,
}: {
  text: string;
  size?: keyof typeof tileSizes;
  seed?: number;
  nowrap?: boolean;
  className?: string;
}) => (
  <span
    aria-label={text}
    role="img"
    className={cx("inline-flex items-center gap-x-1 gap-y-2", nowrap ? "flex-nowrap" : "flex-wrap", className)}
  >
    {graphemes(text).map((char, i) =>
      char === " " ? (
        <span key={i} className="w-2" aria-hidden />
      ) : (
        <span
          key={i}
          aria-hidden
          className={cx(
            "inline-block rounded-[3px] shadow-[0_2px_0_rgb(59_42_32/0.12)]",
            tileSizes[size],
            TILE_STYLES[(i + seed) % TILE_STYLES.length],
            TILE_TILTS[(i + seed) % TILE_TILTS.length],
          )}
        >
          {char}
        </span>
      ),
    )}
  </span>
);

// ---------- Binder clip ----------

export type ClipColor = "pink" | "sky" | "leaf" | "butter" | "lilac" | "coral";

const clipColor: Record<ClipColor, string> = {
  pink: "text-pink",
  sky: "text-sky",
  leaf: "text-leaf",
  butter: "text-butter",
  lilac: "text-lilac",
  coral: "text-coral",
};

/** Binder clip pinching the top edge of whatever it sits on. */
export const BinderClip = ({ color = "pink", className }: { color?: ClipColor; className?: string }) => (
  <svg
    viewBox="0 0 40 46"
    aria-hidden
    className={cx("pointer-events-none absolute -top-6 left-1/2 h-12 w-10 -translate-x-1/2 drop-shadow-sm", clipColor[color], className)}
  >
    <circle cx="20" cy="11" r="8" fill="none" stroke="currentColor" strokeWidth="5" />
    <path d="M13 17l-3 9M27 17l3 9" stroke="#b8a998" strokeWidth="2" strokeLinecap="round" />
    <path
      d="M5 26h30a2 2 0 0 1 2 2v12c-2.5 0-2.5 2.5-5 2.5s-2.5-2.5-5-2.5-2.5 2.5-5 2.5-2.5-2.5-5-2.5-2.5 2.5-5 2.5S6.5 40 3 40V28a2 2 0 0 1 2-2Z"
      fill="currentColor"
    />
    <rect x="7" y="29" width="26" height="3" rx="1.5" fill="#fff" opacity="0.35" />
  </svg>
);

// ---------- Washi tape ----------

const tapeColor = {
  butter: "bg-butter/70",
  pink: "bg-pink/55",
  sky: "bg-sky/55",
  leaf: "bg-leaf/50",
};

/** A strip of washi tape stuck across a corner or edge. */
export const Tape = ({ color = "butter", className }: { color?: keyof typeof tapeColor; className?: string }) => (
  <span
    aria-hidden
    className={cx("pointer-events-none absolute h-6 w-24", tapeColor[color], className)}
    style={{ clipPath: "polygon(0 8%, 6% 0, 12% 10%, 100% 0, 96% 50%, 100% 100%, 8% 92%, 0 100%, 4% 50%)" }}
  />
);

// ---------- Sticker ----------

const stickerBg = {
  pink: "bg-blush text-coral-deep",
  sky: "bg-sky-soft text-ink",
  leaf: "bg-leaf-soft text-ink",
  butter: "bg-butter-soft text-ink",
  lilac: "bg-lilac-soft text-ink",
  coral: "bg-coral text-paper",
};

export const Sticker = ({
  color,
  children,
  className,
}: {
  color: keyof typeof stickerBg;
  children: ReactNode;
  className?: string;
}) => (
  <span className={cx("sticker inline-flex items-center justify-center rounded-full", stickerBg[color], className)}>
    {children}
  </span>
);

// ---------- Drink drawings ----------

const ICE = "#dcefff";
const LIQUIDS = [
  { match: ["น้ำแข็ง"], color: ICE },
  { match: ["hot milk", "นมร้อน"], color: "#f4ebdc" },
  { match: ["ชาเขียว", "matcha"], color: "#8db86b" },
  { match: ["โกโก้", "มอคค่า", "mocha", "cocoa"], color: "#7a4b32" },
  { match: ["อเมริกาโน่", "เอสเปรสโซ่", "americano", "espresso"], color: "#5b3626" },
];
const LATTE = "#c8925a";

/** "Ice" is matched exactly, so "Iced Americano" still reads as coffee. */
export const liquidFor = (name: string | null) => {
  const lower = name?.trim().toLowerCase() ?? "";
  if (lower === "ice") return ICE;
  return LIQUIDS.find((l) => l.match.some((m) => lower.includes(m)))?.color ?? LATTE;
};

/**
 * Hand-drawn drink. `level` is how full it is, "0" to "1", and animates when it changes.
 */
export const DrinkArt = ({
  kind,
  liquid,
  level = "1",
  className,
}: {
  kind: "hot" | "iced";
  liquid: string;
  level?: string;
  className?: string;
}) => {
  const clipId = useId();
  const fillStyle = { transform: `scaleY(${level})`, transformBox: "fill-box" as const };

  if (kind === "iced") {
    return (
      <svg viewBox="0 0 80 100" aria-hidden className={className}>
        <path d="M50 4l-6 26" stroke="#ee8fb0" strokeWidth="5" strokeLinecap="round" />
        <clipPath id={clipId}>
          <path d="M16 24h48l-6 66a6 6 0 0 1-6 5H28a6 6 0 0 1-6-5L16 24Z" />
        </clipPath>
        <g clipPath={`url(#${clipId})`}>
          <rect x="10" y="24" width="60" height="72" fill="#fff" />
          <rect className="cup-fill" x="10" y="38" width="60" height="58" fill={liquid} style={fillStyle} />
          <rect x="10" y="38" width="60" height="6" fill="#fff" opacity="0.35" className="cup-fill" style={fillStyle} />
          <rect x="24" y="44" width="13" height="13" rx="3" fill="#fff" opacity="0.55" transform="rotate(-12 30 50)" />
          <rect x="40" y="52" width="12" height="12" rx="3" fill="#fff" opacity="0.5" transform="rotate(10 46 58)" />
        </g>
        <path d="M16 24h48l-6 66a6 6 0 0 1-6 5H28a6 6 0 0 1-6-5L16 24Z" fill="none" stroke="#3b2a20" strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M12 24h56" stroke="#3b2a20" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 100 90" aria-hidden className={className}>
      <path d="M38 6c-4 6 4 9 0 15M52 4c-4 6 4 9 0 15" stroke="#b8a998" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <ellipse cx="48" cy="80" rx="40" ry="7" fill="#fff" stroke="#3b2a20" strokeWidth="2.5" />
      <clipPath id={clipId}>
        <path d="M16 30h64v18a32 30 0 0 1-64 0V30Z" />
      </clipPath>
      <g clipPath={`url(#${clipId})`}>
        <rect x="10" y="30" width="76" height="52" fill="#fff" />
        <rect className="cup-fill" x="10" y="32" width="76" height="50" fill={liquid} style={fillStyle} />
      </g>
      <path d="M80 38h4a10 10 0 0 1 0 20h-6" fill="none" stroke="#3b2a20" strokeWidth="2.5" />
      <path d="M16 30h64v18a32 30 0 0 1-64 0V30Z" fill="none" stroke="#3b2a20" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M44 36c-3-3-8 1-4 5l4 4 4-4c4-4-1-8-4-5Z" fill="#fff" opacity="0.8" />
    </svg>
  );
};

// ---------- Page header ----------

export const PageHeader = ({
  title,
  subtitle,
  action,
  seed = 0,
}: {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
  seed?: number;
}) => (
  <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
    <div>
      <h1>
        <Ransom text={title} size="lg" seed={seed} />
      </h1>
      {subtitle && <p className="mt-3 font-hand text-xl text-ink-soft">{subtitle}</p>}
    </div>
    {action}
  </header>
);
