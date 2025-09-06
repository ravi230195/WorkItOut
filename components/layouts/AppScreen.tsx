// components/layout/AppScreen.tsx
import * as React from "react";
import type { MaxContent } from "./layout-types";
import { classForMaxContent } from "./layout-types";
import { useKeyboardInset } from "../../hooks/useKeyboardInset";
import { useKeyboardVisible } from "../../hooks/useKeyboardVisible";
import { useNumericInputFocus } from "../../hooks/useNumericInputFocus";

export type AppScreenProps = React.PropsWithChildren<{
  header?: React.ReactNode | null;
  stickyHeader?: boolean;

  bottomBar?: React.ReactNode | null;
  bottomBarSticky?: boolean;

  /** Hide the bottom bar when the on-screen keyboard is visible. */
  hideBottomBarOnKeyboard?: boolean;

  showHeaderBorder?: boolean;
  showBottomBarBorder?: boolean;

  maxContent?: MaxContent;
  maxContentPx?: number;
  maxContentClassName?: string;

  padContent?: boolean;
  padHeader?: boolean;
  padBottomBar?: boolean;

  /** Name of the CSS var that carries keyboard inset (defaults to --app-kb-inset; falls back to --kb-inset / --keyboard-inset). */
  keyboardInsetVarName?: string;

  className?: string;
  contentClassName?: string;
  scrollAreaClassName?: string;
  headerShellClassName?: string;
  bottomBarShellClassName?: string;

  padHeaderSafeArea?: boolean;

  contentGuttersPreset?: "none" | "compact" | "responsive";
  contentBottomPaddingClassName?: string;
  headerInScrollArea?: boolean;
}>;

const cx = (...xs: Array<string | undefined | null | false>) =>
  xs.filter(Boolean).join(" ");

export default function AppScreen({
  header,
  stickyHeader = false,

  bottomBar,
  bottomBarSticky = true,
  hideBottomBarOnKeyboard = true,

  showHeaderBorder = true,
  showBottomBarBorder = true,

  maxContent = "md",
  maxContentPx,
  maxContentClassName,

  padContent = true,
  padHeader = true,
  padBottomBar = false,

  keyboardInsetVarName = "--app-kb-inset",

  className = "",
  contentClassName = "",
  scrollAreaClassName = "",
  headerShellClassName = "",
  bottomBarShellClassName = "",
  padHeaderSafeArea = false,

  contentGuttersPreset = "responsive",
  contentBottomPaddingClassName = "",

  children,
  headerInScrollArea = false,
}: AppScreenProps) {
  // Single global provider of --app-kb-inset / --kb-inset / --keyboard-inset
  useKeyboardInset();
  const keyboardVisible = useKeyboardVisible();
  const numericInputFocused = useNumericInputFocus();

  const rootRef = React.useRef<HTMLDivElement>(null);
  const headerRef = React.useRef<HTMLDivElement>(null);
  const bottomRef = React.useRef<HTMLDivElement>(null);

  const showDoneBar = keyboardVisible && numericInputFocused;
  const renderedBottomBar = showDoneBar
    ? (
        <div className="w-full flex justify-end">
          <button
            className="px-3 py-2 text-dark-green-800 text-sm bg-transparent border-0"
            onClick={() => (document.activeElement as HTMLElement | null)?.blur()}
            type="button"
          >
            Done
          </button>
        </div>
      )
    : bottomBar && !(hideBottomBarOnKeyboard && keyboardVisible)
      ? bottomBar
      : null;

  /** Measure header/bottom heights and publish CSS vars */
  React.useLayoutEffect(() => {
    if (!rootRef.current) return;

    const updateVars = () => {
      const h = headerRef.current?.offsetHeight ?? 0;
      const b = bottomRef.current?.offsetHeight ?? 0;
      rootRef.current!.style.setProperty("--app-header-h", `${header ? h : 0}px`);
      rootRef.current!.style.setProperty("--app-bottom-h", `${renderedBottomBar ? b : 0}px`);
    };

    const ro = new ResizeObserver(updateVars);
    if (headerRef.current) ro.observe(headerRef.current);
    if (bottomRef.current) ro.observe(bottomRef.current);

    updateVars();
    return () => ro.disconnect();
  }, [header, renderedBottomBar]);

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

  // Var chain for keyboard inset (allows custom var name override)
  const kbInsetChain = `var(${keyboardInsetVarName}, var(--kb-inset, var(--keyboard-inset, 0px)))`;

  const contentGutters =
    contentGuttersPreset === "responsive"
      ? "px-4 py-6 sm:px-6 md:px-8 md:py-8"
      : contentGuttersPreset === "compact"
        ? "px-4 py-4"
        : padContent
          ? "px-4"
          : "";
  const renderHeaderShell = () => (
    <div
      ref={headerRef}
      className={cx(
        "shrink-0",
        stickyHeader && "sticky top-0 z-30",
        "bg-background",
        showHeaderBorder && "border-b border-border",
        headerShellClassName
      )}
      style={{
        paddingTop: padHeaderSafeArea
          ? "max(env(safe-area-inset-top), 0px)"
          : undefined,
          // RAVI: Debug border commented out
          //border: "2px solid green",
      }}
    >
      <div className={cx(innerWidthClasses, padHeader && "px-4")} style={innerWidthStyle}>
        {header}
      </div>
    </div>
  );

  return (
    <div
      ref={rootRef}
      className={cx(
        "fixed inset-0 flex flex-col overflow-hidden overscroll-contain bg-background",
        className
      )}
      style={{
        paddingLeft: "max(env(safe-area-inset-left), 0px)",
        paddingRight: "max(env(safe-area-inset-right), 0px)",
      }}
    >
      {header && !headerInScrollArea ? renderHeaderShell() : null}

      {/* Scroll area */}
      <div className={cx("flex-1 min-h-0 overflow-y-auto w-full", scrollAreaClassName)}>
        {header && headerInScrollArea ? renderHeaderShell() : null}

        <div
          className={cx(
            innerWidthClasses,
            contentGutters,
            contentBottomPaddingClassName,
            contentClassName
          )}
          style={{
            ...innerWidthStyle,
              paddingBottom: renderedBottomBar
                ? `var(--app-bottom-h, 0px)`
                : `calc(env(safe-area-inset-bottom) + ${kbInsetChain})`,
              // RAVI: Debug border commented out
              //border: "2px solid red",
          }}
        >
          {children}
        </div>
      </div>

        {renderedBottomBar ? (
          <div
            ref={bottomRef}
          className={cx(
            "shrink-0",
            bottomBarSticky && "sticky bottom-0 z-30",
            "bg-card/95 backdrop-blur-sm",
            showBottomBarBorder && "border-t border-border",
            bottomBarShellClassName
          )}
          style={
            showDoneBar
              ? {
                  marginBottom: `calc(${kbInsetChain} - env(safe-area-inset-bottom))`,
                }
              : {
                  paddingBottom: `calc(env(safe-area-inset-bottom) + ${kbInsetChain})`,
                }
          }
        >
          <div
            className={cx(innerWidthClasses, padBottomBar && "px-4 py-2")}
            style={innerWidthStyle}
          >
              {renderedBottomBar}
            </div>
          </div>
        ) : null}
      </div>
    );
  }
