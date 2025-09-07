import { ReactNode, useState } from "react";
import { Plus } from "lucide-react";
import { logger } from "../utils/logging";

export interface FabAction {
  label: string;
  onPress: () => void;
  icon?: ReactNode;
}

interface FabSpeedDialProps {
  actions: FabAction[];
  onOpenChange?: (open: boolean) => void;
}

export default function FabSpeedDial({ actions, onOpenChange }: FabSpeedDialProps) {
  const [open, setOpen] = useState(false);

  const toggle = () => {
    setOpen((o) => {
      const next = !o;
      onOpenChange?.(next);
      return next;
    });
  };

  const close = () => {
    setOpen(false);
    onOpenChange?.(false);
  };

  // --- geometry for overlay ---
  const count = actions.length;
  const spacing = 56;
  const maxLabelLength = count ? Math.max(...actions.map((a) => a.label.length)) : 0;
  const overlayWidth = maxLabelLength * 8 + 160;

  // Place the overlay just above the FAB instead of from the bottom of the screen
  const fabSize = 64; // w-16 / h-16
  const fabOffsetFromBottom = 96; // bottom-24
  const overlayBottom = fabSize + fabOffsetFromBottom; // start tinting above the FAB
  const overlayHeight = count * spacing + 32; // cover all actions with a bit of padding

  logger.info("overlayWidth", overlayWidth, "overlayHeight", overlayHeight);

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-30" onClick={close}>
          {/* Localized rectangular overlay anchored to the FAB */}
          <div
            className="absolute pointer-events-none rounded-lg"
            style={{
              right: 16,
              bottom: overlayBottom,
              width: overlayWidth,
              height: overlayHeight,
              background: "rgba(61,41,20,0.16)",

              // ↓ make the blur very subtle (tweak 0–2px)
              backdropFilter: "blur(0.2px)",
              WebkitBackdropFilter: "blur(0.2px)", // Safari
            }}
          />
        </div>
      )}


      {/* Actions + FAB */}
      <div className="fixed right-4 bottom-24 z-40 flex flex-col items-end gap-4">
        {open &&
          actions.map((action) => (
            <button
              key={action.label}
              onClick={() => {
                close();
                action.onPress();
              }}
              className="flex items-center gap-3"
              style={{ textShadow: "none" }}
            >
              <span className="uppercase whitespace-nowrap text-primary text-xl font-bold tracking-wide">
                {action.label}
              </span>
              {action.icon && (
                <span className="w-12 h-12 rounded-full bg-primary text-primary-foreground shadow flex items-center justify-center">
                  {action.icon}
                </span>
              )}
            </button>
          ))}

        <button
          onClick={toggle}
          aria-label="Speed dial"
          aria-expanded={open}
          className="
            w-16 h-16 rounded-full bg-primary text-primary-foreground
            shadow-lg flex items-center justify-center
            transition-transform
          "
        >
          <Plus className={`w-6 h-6 transition-transform ${open ? "rotate-45" : ""}`} />
        </button>
      </div>
    </>
  );
}
