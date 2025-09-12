// components/layout/FooterBar.tsx
import * as React from "react";
import type { MaxContent } from "./layout-types";
import { classForMaxContent } from "./layout-types";

/** Horizontal alignment of children inside the bar */
export type Align = "center" | "between" | "start" | "end";
/** Background / elevation style */
export type Bg = "solid" | "translucent" | "elevated";

/** FooterBar props */
export type FooterBarProps = {
  children: React.ReactNode;

  /** Size preset for height, padding, gaps */
  size?: "sm" | "md" | "lg";

  /** Background/elevation preset */
  bg?: Bg;

  /** Horizontal alignment of content */
  align?: Align;

  /**
   * Positioning:
   * - true  => fixed to the viewport bottom (default)
   * - false => sticky within the scroll container
   */
  sticky?: boolean;

  /** Limit content width; center with mx-auto when not "none" */
  maxContent?: MaxContent;

  /** When true, dims content and shows a spinner overlay */
  loading?: boolean;
  loadingText?: string;

  /** Extra classes on the inner content row */
  innerClassName?: string;

  className?: string;
} & Omit<React.HTMLAttributes<HTMLDivElement>, "children">;

const sizeMap = {
  sm: { h: "min-h-12", px: "px-3", gap: "gap-2" },
  md: { h: "min-h-14", px: "px-4", gap: "gap-3" }, // default
  lg: { h: "min-h-16", px: "px-4", gap: "gap-4" },
} as const;

const bgMap: Record<Bg, string> = {
  solid:
    "bg-background border-t border-border shadow-[0_-2px_8px_rgba(0,0,0,0.04)]",
  translucent:
    "bg-background/95 backdrop-blur-sm border-t border-border shadow-[0_-2px_8px_rgba(0,0,0,0.04)]",
  elevated: "bg-background shadow-lg border-t border-border",
};

const alignMap: Record<Align, string> = {
  center: "justify-center",
  between: "justify-between",
  start: "justify-start",
  end: "justify-end",
};

export default function FooterBar({
  children,
  size = "md",
  bg = "solid",
  align = "center",
  sticky = true,
  maxContent = "md",
  loading = false,
  loadingText = "Working…",
  innerClassName = "",
  className = "",
  ...rest
}: FooterBarProps) {
  const S = sizeMap[size];

  const container = [
    sticky ? "fixed inset-x-0 bottom-0 z-50" : "sticky bottom-0 z-40",
    bgMap[bg],
    "pt-3",
    //"pb-[max(env(safe-area-inset-bottom),12px)]",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const maxWidthClass = classForMaxContent(maxContent);
  const widthClasses = ["w-full", maxContent !== "none" && "mx-auto", maxWidthClass]
    .filter(Boolean)
    .join(" ");

  const row = [
    widthClasses,
    S.px,
    S.h,
    "flex items-center",
    alignMap[align],
    S.gap,
    "relative", // for overlay positioning
    innerClassName,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={container} role="region" aria-label="Footer actions" {...rest}>
      <div className={row} aria-busy={loading || undefined}>
        {/* Content */}
        <div className={loading ? "opacity-60 pointer-events-none w-full" : "w-full"}>
          <div className={["flex items-center", alignMap[align], S.gap].join(" ")}>
            {children}
          </div>
        </div>

        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 grid place-items-center">
            <div className="flex items-center gap-2 text-black">
              <div className="animate-spin w-5 h-5 border-2 border-warm-coral border-t-transparent rounded-full" />
              <span className="text-sm">{loadingText}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
