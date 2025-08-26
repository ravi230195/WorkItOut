// components/layout/AppScreen.tsx
import * as React from "react";
import type { MaxContent } from "./layout-types";
import { classForMaxContent } from "./layout-types";

export type AppScreenProps = React.PropsWithChildren<{
  header?: React.ReactNode | null;
  stickyHeader?: boolean;

  bottomBar?: React.ReactNode | null;
  bottomBarSticky?: boolean;

  showHeaderBorder?: boolean;
  showBottomBarBorder?: boolean;

  maxContent?: MaxContent;
  maxContentPx?: number;
  maxContentClassName?: string;

  /** Old knobs (kept for compatibility) */
  padContent?: boolean;
  padHeader?: boolean;
  padBottomBar?: boolean;

  keyboardInsetVarName?: string;

  className?: string;
  contentClassName?: string;
  scrollAreaClassName?: string;
  headerShellClassName?: string;
  bottomBarShellClassName?: string;
  padHeaderSafeArea?: boolean;

  /** NEW: consistent responsive gutters for content */
  contentGuttersPreset?: "none" | "compact" | "responsive";

  /** NEW: reserve bottom space (e.g. tab bar / sticky footer) without redoing gutters */
  contentBottomPaddingClassName?: string; // e.g., "pb-20" or "pb-24"
}>;

const cx = (...xs: Array<string | undefined | null | false>) =>
  xs.filter(Boolean).join(" ");

export default function AppScreen({
  header,
  stickyHeader = false,

  bottomBar,
  bottomBarSticky = true,

  showHeaderBorder = true,
  showBottomBarBorder = true,

  maxContent = "md",
  maxContentPx,
  maxContentClassName,

  // legacy
  padContent = true,
  padHeader = true,
  padBottomBar = true,

  keyboardInsetVarName = "--app-kb-inset",

  className = "",
  contentClassName = "",
  scrollAreaClassName = "",
  headerShellClassName = "",
  bottomBarShellClassName = "",
  padHeaderSafeArea = false,

  // NEW
  contentGuttersPreset = "responsive",
  contentBottomPaddingClassName = "",

  children,
}: AppScreenProps) {
  const shouldCenter = maxContent !== "none" || typeof maxContentPx === "number";
  const maxWidthClass =
    typeof maxContentPx === "number" ? "" : classForMaxContent(maxContent);

  const innerWidthClasses = cx(
    "w-full",
    shouldCenter && "mx-auto",
    maxWidthClass,
    maxContentClassName
  );

  const innerWidthStyle = React.useMemo<React.CSSProperties | undefined>(
    () => (typeof maxContentPx === "number" ? { maxWidth: maxContentPx } : undefined),
    [maxContentPx]
  );

  const kbInsetChain = `var(${keyboardInsetVarName}, var(--kb-inset, var(--keyboard-inset, 0px)))`;

  // Decide content gutters once, globally
  const contentGutters =
    contentGuttersPreset === "responsive"
      ? "px-4 py-6 sm:px-6 md:px-8 md:py-8"
      : contentGuttersPreset === "compact"
        ? "px-4 py-4"
        : padContent
          ? "px-4" // backward-compat if someone opts into padContent manually
          : "";

  return (
    <div className={cx("h-dvh flex flex-col overflow-hidden bg-background", className)}
      style={{
        paddingLeft: "max(env(safe-area-inset-left), 0px)",
        paddingRight: "max(env(safe-area-inset-right), 0px)",
        border: "2px solid red", // TEMPORARY DEBUG: Add red border to see container boundaries
      }}
    >
      {header ? (
        <div
          className={cx(
            "shrink-0",
            stickyHeader && "sticky top-0 z-30",
            "bg-white/80 backdrop-blur-sm",
            showHeaderBorder && "border-b border-[var(--border)]",
            headerShellClassName
          )}
          style={{
            paddingTop: padHeaderSafeArea ? "max(env(safe-area-inset-top), 0px)" : undefined,
          }}
        >
          <div className={cx(innerWidthClasses, padHeader && "px-4")} style={innerWidthStyle}>
            {header}
          </div>
        </div>
      ) : null}

      <div className={cx("flex-1 min-h-0 overflow-y-auto w-full", scrollAreaClassName)}>
        <div
          className={cx(
            innerWidthClasses,
            contentGutters,                 // <-- unified gutters here
            contentBottomPaddingClassName,  // <-- bottom reserve only
            contentClassName,               // any last-mile overrides
            "bg-green-200"                 // TEMPORARY DEBUG: Add green background to see content area
          )}
          style={innerWidthStyle}
        >
          {children}
        </div>
      </div>

      {bottomBar ? (
        <div
          className={cx(
            "shrink-0",
            bottomBarSticky && "sticky bottom-0 z-30",
            "bg-white/95 backdrop-blur-sm",
            showBottomBarBorder && "border-t border-[var(--border)]",
            bottomBarShellClassName
          )}
          style={{
            paddingBottom: `calc(env(safe-area-inset-bottom) + ${kbInsetChain})`,
          }}
        >
          <div className={cx(innerWidthClasses, padBottomBar && "px-4 pt-4")} style={innerWidthStyle}>
            {bottomBar}
          </div>
        </div>
      ) : null}
    </div>
  );
}
