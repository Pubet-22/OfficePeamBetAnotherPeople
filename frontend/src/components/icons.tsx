import type { ReactNode, SVGProps } from "react";
import type { GeneralCategory } from "@/lib/types";

// Small line icons drawn for this app, 24×24, stroke = currentColor.
const Icon = ({ children, ...props }: SVGProps<SVGSVGElement> & { children: ReactNode }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
    {...props}
  >
    {children}
  </svg>
);

export const CupIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5V9Z" />
    <path d="M16 10.5h1.5a2.5 2.5 0 0 1 0 5H16" />
    <path d="M8.5 3.5c-.6.8-.6 1.7 0 2.5M12 3.5c-.6.8-.6 1.7 0 2.5" />
  </Icon>
);

export const GlassIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="M6.5 4h11l-1.4 15.2a1 1 0 0 1-1 .8H8.9a1 1 0 0 1-1-.8L6.5 4Z" />
    <path d="M7.2 10c1.6 1 3.2 1 4.8 0s3.2-1 4.8 0" />
    <path d="M19.5 3.5v2M20.5 4.5h-2" />
  </Icon>
);

export const TrashIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="M4.5 7h15M9.5 7V4.5h5V7" />
    <path d="M6.5 7l1 12.5a1 1 0 0 0 1 .9h7a1 1 0 0 0 1-.9l1-12.5" />
    <path d="M10 11v5.5M14 11v5.5" />
  </Icon>
);

export const BagIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="M5 8h14l-1 12H6L5 8Z" />
    <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
  </Icon>
);

export const PrinterIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="M7 8V3.5h10V8" />
    <rect x="3.5" y="8" width="17" height="8" rx="2" />
    <path d="M7 13.5h10V20.5H7z" />
  </Icon>
);

export const SparkIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="M12 3.5l1.8 5.2 5.2 1.8-5.2 1.8L12 17.5l-1.8-5.2L5 10.5l5.2-1.8L12 3.5Z" />
    <path d="M18.5 16.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8Z" />
  </Icon>
);

export const PinIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="M12 21s6.5-5.6 6.5-11a6.5 6.5 0 0 0-13 0c0 5.4 6.5 11 6.5 11Z" />
    <circle cx="12" cy="10" r="2.3" />
  </Icon>
);

export const ClipIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="M20 11.5l-7.8 7.8a5 5 0 0 1-7-7l8.3-8.4a3.4 3.4 0 0 1 4.8 4.8l-8.3 8.3a1.7 1.7 0 0 1-2.4-2.4l7.6-7.6" />
  </Icon>
);

export const categoryIcon: Record<GeneralCategory | "COFFEE", (props: SVGProps<SVGSVGElement>) => ReactNode> = {
  COFFEE: CupIcon,
  WASH_GLASS: GlassIcon,
  TRASH: TrashIcon,
  PICKUP_FOOD: BagIcon,
  PRINT: PrinterIcon,
  OTHER: SparkIcon,
};
