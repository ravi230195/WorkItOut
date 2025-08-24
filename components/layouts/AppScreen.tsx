// components/layout/AppScreen.tsx
import * as React from "react";
import type { MaxContent } from "./layout-types";
import { classForMaxContent } from "./layout-types";

export type AppScreenProps = React.PropsWithChildren<{
  header?: React.ReactNode | null;
  /** Make the header stick to the top of the viewport. */
  stickyHeader?: boolean;

  bottomBar?: React.ReactNode | null;
  /** Make the bottom bar stick to the bottom (above safe-area/keyboard). */
  bottomBarSticky?: boolean;

  /** Control whether the AppScreen shell shows a bottom border under the header. */
  showHeaderBorder?: boolean;        // NEW (default true)
  /** Control whether the AppScreen shell shows a top border above the bottom bar. */
  showBottomBarBorder?: boolean;     // NEW (default true)

  /** Constrain inner content width (Tailwind presets). */
  maxContent?: MaxContent;
  /** Explicit pixel max width for content (overrides Tailwind presets). */
  maxContentPx?: number;
  /** Extra classes applied to the width-capped wrapper. */
  maxContentClassName?: string;

  /** Apply default padding to the scrollable content area. */
  padContent?: boolean;
  /** Apply default padding to the header inner wrapper. */
  padHeader?: boolean;
  /** Apply default padding to the bottom bar inner wrapper. */
  padBottomBar?: boolean;

  /** CSS var name (without var()) used for keyboard inset. */
  keyboardInsetVarName?: string;

  /** Utility classes for the outer shell. */
  className?: string;
  /** Utility classes for the content inner wrapper. */
  contentClassName?: string;
  /** Utility classes for the scroll area container. */
  scrollAreaClassName?: string;
  /** Utility classes for the header shell (outside of width wrapper). */
  headerShellClassName?: string;
  /** Utility classes for the bottom bar shell (outside of width wrapper). */
  bottomBarShellClassName?: string;
  /** Let AppScreen add top safe-area above the header shell. */
  padHeaderSafeArea?: boolean;
}>;

const cx = (...xs: Array<string | undefined | null | false>) =>
  xs.filter(Boolean).join(" ");

export default function AppScreen({
  header,
  stickyHeader = false,

  bottomBar,
  bottomBarSticky = true,

  showHeaderBorder = true,       // NEW
  showBottomBarBorder = true,    // NEW

  maxContent = "md",
  maxContentPx,
  maxContentClassName,

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

  return (
    <div
      className={cx("min-h-[100dvh] flex flex-col bg-background", className)}
      style={{
        paddingLeft: "max(env(safe-area-inset-left), 0px)",
        paddingRight: "max(env(safe-area-inset-right), 0px)",
      }}
    >
      {header ? (
        <div
          className={cx(
            stickyHeader && "sticky top-0 z-30",
            "bg-white/80 backdrop-blur-sm",
            showHeaderBorder && "border-b border-[var(--border)]",
            headerShellClassName
          )}
          style={{
            // Only add if you explicitly want AppScreen to handle it
            paddingTop: padHeaderSafeArea ? "max(env(safe-area-inset-top), 0px)" : undefined,
          }}
        >
          <div className={cx(innerWidthClasses, padHeader && "px-4")} style={innerWidthStyle}>
            {header}
          </div>
        </div>
      ) : null}


      <div className={cx("flex-1 overflow-y-auto w-full", scrollAreaClassName)}>
        <div
          className={cx(innerWidthClasses, padContent && "px-4", contentClassName)}
          style={innerWidthStyle}
        >
          {children}
        </div>
      </div>

      {bottomBar ? (
        <div
          className={cx(
            bottomBarSticky && "sticky bottom-0 z-30",
            "bg-white/95 backdrop-blur-sm",
            showBottomBarBorder && "border-t border-[var(--border)]", // NEW
            bottomBarShellClassName
          )}
          style={{
            paddingBottom: `calc(env(safe-area-inset-bottom) + ${kbInsetChain})`,
          }}
        >
          <div
            className={cx(innerWidthClasses, padBottomBar && "px-4 pt-4")}
            style={innerWidthStyle}
          >
            {bottomBar}
          </div>
        </div>
      ) : null}
    </div>
  );
}
