import * as React from "react";
import BackButton from "./BackButton";
import { TactileButton } from "./TactileButton";
import { Plus } from "lucide-react";

type ScreenHeaderProps = {
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
  onAdd?: () => void;
  sticky?: boolean;
  dense?: boolean;
  showBorder?: boolean;
  className?: string;
  reserveLeftPx?: number;
  reserveRightPx?: number;
};

export default function ScreenHeader({
  title,
  onBack,
  right,
  onAdd,
  sticky = false,
  dense = false,
  showBorder = true,
  className = "",
  reserveLeftPx = 44,
  reserveRightPx = 44,
}: ScreenHeaderProps) {
  const containerClasses = [
    sticky ? "sticky top-0 z-30" : "",
    "relative flex items-center bg-white/80 backdrop-blur-sm w-full",
    dense ? "px-4 py-2" : "p-4",
    showBorder ? "border-b border-[var(--border)]" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const titleMaxWidth = `calc(100% - ${reserveLeftPx + reserveRightPx}px)`;

  return (
    <div
      className={containerClasses}
      style={{
        paddingLeft: "max(env(safe-area-inset-left), 1rem)",
        paddingRight: "max(env(safe-area-inset-right), 1rem)",
      }}
    >
      {/* Left: Back or spacer */}
      <div className="shrink-0 flex items-center" style={{ width: reserveLeftPx }}>
        {onBack ? <BackButton onClick={onBack} /> : null}
      </div>

      {/* Center: true-centered title, single line, auto-sized */}
      <h1
        className="absolute left-1/2 -translate-x-1/2 font-medium text-[var(--warm-brown)] truncate text-[clamp(16px,4.2vw,20px)]"
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
