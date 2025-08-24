// components/layout/ScreenHeader.tsx
import * as React from "react";
import BackButton from "../BackButton";
import { TactileButton } from "../TactileButton";
import { Plus } from "lucide-react";

type ScreenHeaderProps = {
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
  onAdd?: () => void;

  /** Let the header stick itself (usually leave false and let AppScreen do it) */
  sticky?: boolean;

  /** Medium-compact */
  dense?: boolean;

  /** Smallest height (smaller than `dense`) */
  denseSmall?: boolean;

  showBorder?: boolean;
  className?: string;

  /** Reserve space (px) for left/right controls so the centered title won’t overlap */
  reserveLeftPx?: number;
  reserveRightPx?: number;
  /** Add top safe-area inside the header (recommended). */
  padSafeArea?: boolean;
};

export default function ScreenHeader({
  title,
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
  padSafeArea = true,
}: ScreenHeaderProps) {
  const sizeKey = denseSmall ? "compactTiny" : dense ? "compact" : "comfortable";
  const sizeMap = {
    compactTiny: { py: "py-1.5", minH: "min-h-[44px]" },
    compact: { py: "py-2", minH: "min-h-[52px]" },
    comfortable: { py: "py-3", minH: "min-h-[64px]" },
  }[sizeKey as "compactTiny" | "compact" | "comfortable"];

  const containerClasses = [
    sticky ? "sticky top-0 z-30" : "",
    "relative flex items-center bg-white/80 backdrop-blur-sm w-full",
    padSafeArea && "pt-safe",    // ← apply top safe-area here
    sizeMap.minH,
    sizeMap.py,
    showBorder ? "border-b border-[var(--border)]" : "",
    className,
  ].filter(Boolean).join(" ");

  const titleMaxWidth = `calc(100% - ${reserveLeftPx + reserveRightPx}px)`;

  return (
    <div className={containerClasses}>
      {/* Left: Back or spacer (fixed width so title can be truly centered) */}
      <div className="shrink-0 flex items-center" style={{ width: reserveLeftPx }}>
        {onBack ? <BackButton onClick={onBack} /> : null}
      </div>

      {/* Center: true-centered title; single line; fluid size */}
      <h1
        className="absolute left-1/2 -translate-x-1/2 m-0 font-medium leading-none text-[var(--warm-brown)] truncate text-[clamp(16px,4.2vw,20px)]"
        style={{ maxWidth: titleMaxWidth }}
      >
        {title}
      </h1>

      {/* Right: custom content or + button or spacer */}
      <div
        className="ml-auto shrink-0 flex items-center justify-end"
        style={{ width: reserveRightPx }}
      >
        {right ??
          (onAdd ? (
            <TactileButton
              variant="secondary"
              size="sm"
              onClick={onAdd}
              className="p-2 h-auto"
            >
              <Plus size={20} />
            </TactileButton>
          ) : null)}
      </div>
    </div>
  );
}