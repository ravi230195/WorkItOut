import * as React from "react";

interface BottomBarProps extends React.PropsWithChildren<{
  /**
   * Alignment of child elements within the bar.
   * `center` centers all children, `between` spreads first and last to edges.
   */
  align?: "center" | "between";
  /** Optional class on outer container */
  className?: string;
  /** Optional class on inner flex wrapper */
  innerClassName?: string;
  /**
   * When true, a translucent overlay with a spinner covers the bar, useful while
   * performing background actions.
   */
  isLoading?: boolean;
}>>;

const cx = (...xs: Array<string | undefined | null | false>) =>
  xs.filter(Boolean).join(" ");

export default function BottomBar({
  children,
  align = "center",
  className = "",
  innerClassName = "",
  isLoading = false,
}: BottomBarProps) {
  const justify = align === "between" ? "justify-between" : "justify-center";

  return (
    <div className={cx("relative w-full", className)}>
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50">
          <div className="w-4 h-4 animate-spin border-2 border-current border-t-transparent rounded-full" />
        </div>
      )}
      <div
        className={cx(
          "flex w-full items-center gap-3",
          justify,
          innerClassName,
          isLoading && "pointer-events-none opacity-50"
        )}
      >
        {children}
      </div>
    </div>
  );
}

