import * as React from "react";
import BackButton from "../BackButton";
import { TactileButton } from "../TactileButton";
import { Plus } from "lucide-react";

type ScreenHeaderProps = {
  title: string;
  /** optional secondary line beneath title */
  subtitle?: React.ReactNode;
  onBack?: () => void;
  right?: React.ReactNode;
  onAdd?: () => void;
  sticky?: boolean;
  dense?: boolean;
  denseSmall?: boolean;
  showBorder?: boolean;
  className?: string;
  reserveLeftPx?: number;
  reserveRightPx?: number;
  padSafeArea?: boolean;
  /** sets the content row height (excludes safe-area padding) */
  contentHeightPx?: number;
  /** customize title styles (size/weight/etc.) */
  titleClassName?: string;
  /** customize subtitle styles */
  subtitleClassName?: string;
};

export default function ScreenHeader({
  title,
  subtitle,
  onBack,
  right,
  onAdd,
  sticky = false,
  dense = false,
  denseSmall = true,
  showBorder = false,
  className = "",
  reserveLeftPx = 44,
  reserveRightPx = 44,
  padSafeArea = false,
  contentHeightPx = 74,
  titleClassName = "",
  subtitleClassName = "",
}: ScreenHeaderProps) {
  const sizeKey = denseSmall ? "compactTiny" : dense ? "compact" : "comfortable";
  const legacy = {
    compactTiny: { py: "py-1.5", minH: "min-h-[44px]" },
    compact:     { py: "py-2",   minH: "min-h-[52px]" },
    comfortable: { py: "py-3",   minH: "min-h-[64px]" },
  }[sizeKey as "compactTiny" | "compact" | "comfortable"];

  const useFixed = typeof contentHeightPx === "number";

  const containerClasses = [
    sticky ? "sticky top-0 z-30" : "",
    "relative w-full bg-background",
    padSafeArea && "pt-safe",
    showBorder ? "border-b border-border" : "",
    className,
  ].filter(Boolean).join(" ");

  const rowClasses = [
    "flex items-center w-full",
    !useFixed && legacy.minH,
    !useFixed && legacy.py,
  ].filter(Boolean).join(" ");

  const titleMaxWidth = `calc(100% - ${reserveLeftPx + reserveRightPx}px)`;

  return (
    <div className={containerClasses}  /* RAVI style={{ border: "2px solid green" }} */>
      {/* Content row (height excludes safe-area padding) */}
      <div className={rowClasses} style={useFixed ? { height: contentHeightPx } : undefined}>
        {/* Left */}
        <div className="shrink-0 flex items-center" style={{ width: reserveLeftPx }}>
          {onBack ? <BackButton onClick={onBack} /> : null}
        </div>

        {/* Center: true-centered title with optional subtitle */}
        <div
          className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center m-0"
          style={{ maxWidth: titleMaxWidth }}
        >
          <h1
            className={[
              "font-medium leading-none text-warm-brown truncate text-[clamp(16px,4.2vw,20px)]",
              titleClassName,
            ].join(" ")}
          >
            {title}
          </h1>
          {subtitle ? (
            <span
              className={[
                "mt-1 text-xs text-warm-brown",
                subtitleClassName,
              ].join(" ")}
            >
              {subtitle}
            </span>
          ) : null}
        </div>

        {/* Right */}
        <div className="ml-auto shrink-0 flex items-center justify-end" style={{ width: reserveRightPx }}>
          {right ?? (onAdd ? (
            <TactileButton variant="secondary" size="sm" onClick={onAdd} className="p-2 h-auto">
              <Plus size={20} />
            </TactileButton>
          ) : null)}
        </div>
      </div>
    </div>
  );
}
