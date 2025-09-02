// components/sheets/BottomSheets.tsx
import * as React from "react";
import { useKeyboardInset } from "../../hooks/useKeyboardInset";

export type BottomSheetProps = {
  open: boolean;
  onClose: () => void;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  children?: React.ReactNode;
  maxWidthClassName?: string;
  className?: string;
  innerClassName?: string;
  zIndex?: number;
  closeOnBackdrop?: boolean;
  fullWidth?: boolean;
};

const cx = (...xs: Array<string | false | null | undefined>) =>
  xs.filter(Boolean).join(" ");

export default function BottomSheet({
  open,
  onClose,
  header,
  footer,
  children,
  maxWidthClassName = "max-w-md",
  className = "",
  innerClassName = "",
  zIndex = 60,
  closeOnBackdrop = true,
  fullWidth = false,
}: BottomSheetProps) {
  if (!open) return null;

  // Ensure keyboard inset is published even if AppScreen isn't mounted.
  useKeyboardInset();

  const kb = "var(--app-kb-inset, var(--kb-inset, var(--keyboard-inset, 0px)))";

  return (
    <div
      className={cx("fixed inset-0", className)}
      style={{ zIndex }}
      aria-modal="true"
      role="dialog"
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div className="absolute inset-0 bg-overlay/30 backdrop-blur-[2px]" />

      <div className="absolute inset-x-0 bottom-0" onClick={(e) => e.stopPropagation()}>
        <div
          className={cx(
            "w-full",
            fullWidth ? "px-0 max-w-none" : cx("mx-auto px-4", maxWidthClassName)
          )}
        >
          <div
            className={cx(
              "bg-white rounded-t-2xl shadow-2xl border-t border-x border-border overflow-hidden",
              innerClassName
            )}
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <div className="flex justify-center py-2">
              <div className="h-1.5 w-10 rounded-full bg-gray-200" />
            </div>

            {header ? <div className="px-4 pb-2">{header}</div> : null}

            <div
              className="overflow-y-auto"
              style={{
                maxHeight: `calc(85svh - ${kb})`,
                paddingBottom: `calc(env(safe-area-inset-bottom) + ${kb} + 12px)`,
              }}
            >
              {children}
            </div>

            {footer ? <div className="px-4 pt-2">{footer}</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
