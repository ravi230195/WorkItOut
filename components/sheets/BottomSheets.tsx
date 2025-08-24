import * as React from "react";

export type BottomSheetProps = {
  open: boolean;
  onClose: () => void;

  /** Optional header and/or footer areas */
  header?: React.ReactNode;
  footer?: React.ReactNode;

  /** Scrollable content */
  children?: React.ReactNode;

  /** Max content width; defaults to Tailwind max-w-md */
  maxWidthClassName?: string; // e.g., "max-w-md", "max-w-lg"
  /** Extra classes for the sheet container */
  className?: string;
  /** Extra classes for the inner wrapper */
  innerClassName?: string;

  /** z-index for the sheet root; defaults to 60 (above FooterBar z-50) */
  zIndex?: number;

  /** If false, clicking the backdrop won’t close the sheet */
  closeOnBackdrop?: boolean;
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
}: BottomSheetProps) {
  if (!open) return null;

  // keyboard inset chain
  const kbInsetChain = "var(--kb-inset, var(--keyboard-inset, 0px))";

  return (
    <div
      className={cx("fixed inset-0", className)}
      style={{ zIndex }}
      aria-modal="true"
      role="dialog"
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />

      {/* sheet */}
      <div className="absolute inset-x-0 bottom-0" onClick={(e) => e.stopPropagation()}>
        <div className={cx("mx-auto w-full px-4", maxWidthClassName)}>
          <div
            className={cx(
              "bg-white rounded-t-2xl shadow-2xl border-t border-x border-[var(--border)] overflow-hidden",
              innerClassName
            )}
            style={{
              paddingBottom: `calc(env(safe-area-inset-bottom) + ${kbInsetChain} + 12px)`,
            }}
          >
            {/* drag handle */}
            <div className="flex justify-center py-2">
              <div className="h-1.5 w-10 rounded-full bg-gray-200" />
            </div>

            {/* header (optional) */}
            {header ? <div className="px-4 pb-2">{header}</div> : null}

            {/* scroll area */}
            <div className="max-h-[70vh] overflow-y-auto">{children}</div>

            {/* footer (optional) */}
            {footer ? <div className="px-4 pt-2">{footer}</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
