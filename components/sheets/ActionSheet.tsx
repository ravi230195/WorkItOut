import * as React from "react";
import BottomSheet from "./BottomSheets";
import { TactileButton } from "../TactileButton";
import { cn } from "../ui/utils";

export type ActionSheetAction = {
  label: string;
  onClick: () => void | Promise<void>;
  icon?: React.ReactNode;
  /**
   * Render style for the action. "list" renders a text row, "button" renders a TactileButton.
   */
  type?: "list" | "button";
  /**
   * Visual variant for button actions. "destructive" applies red styling, "secondary" uses the secondary button.
   */
  variant?: "primary" | "secondary" | "destructive";
  disabled?: boolean;
};

export interface ActionSheetProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  message?: React.ReactNode;
  actions: ActionSheetAction[];
  /** Text for footer cancel button. Pass `null` to hide. */
  cancelText?: string | null;
  zIndex?: number;
  fullWidth?: boolean;
  children?: React.ReactNode;
}

export default function ActionSheet({
  open,
  onClose,
  title,
  message,
  actions,
  cancelText = "Cancel",
  zIndex = 60,
  fullWidth = true,
  children,
}: ActionSheetProps) {
  const header = title ? (
    <div className="text-center">
      {typeof title === "string" ? (
        <h3 className="font-medium text-black text-[clamp(14px,3.8vw,18px)]">
          {title}
        </h3>
      ) : (
        title
      )}
    </div>
  ) : undefined;

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      header={header}
      footer={
        cancelText !== null ? (
          <TactileButton
            variant="secondary"
            className="w-full py-3 rounded-xl border-0 font-medium"
            onClick={onClose}
          >
            {cancelText}
          </TactileButton>
        ) : null
      }
      zIndex={zIndex}
      fullWidth={fullWidth}
    >
      <div className="p-4 space-y-4">
        {message && (
          <p className="text-sm text-black">{message}</p>
        )}
        {children}
        <div className="space-y-3">
          {actions.map((a, i) => {
            if (a.type === "button") {
              return (
                <TactileButton
                  key={i}
                  onClick={a.onClick}
                  disabled={a.disabled}
                  variant={a.variant === "secondary" ? "secondary" : "primary"}
                  className={cn(
                    "w-full rounded-xl border-0 font-medium",
                    a.variant === "destructive" &&
                      "bg-destructive hover:bg-destructive/90 text-black"
                  )}
                >
                  <div className="flex items-center justify-center gap-2">
                    {a.icon}
                    <span>{a.label}</span>
                  </div>
                </TactileButton>
              );
            }
            return (
              <button
                key={i}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50",
                  a.variant === "destructive" &&
                    "text-black hover:bg-destructive-light"
                )}
                onClick={a.onClick}
                disabled={a.disabled}
              >
                {a.icon}
                <span>{a.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </BottomSheet>
  );
}
