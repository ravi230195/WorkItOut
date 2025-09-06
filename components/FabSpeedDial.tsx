import { useState } from "react";
import { Plus } from "lucide-react";
import { logger } from "../utils/logging";

export interface FabAction {
  label: string;
  onPress: () => void;
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

  // --- geometry ---
  const count = actions.length;
  const radius = 10;
  const spacing = 50;
  const totalSpread = spacing * Math.max(count - 1, 0);
  const startAngle = 180 - totalSpread;      // fan from bottom-right upward
  const factor = 4.7;

  const maxLabelLength = count ? Math.max(...actions.map((a) => a.label.length)) : 0;
  const overlaySize = radius * factor * 4 + maxLabelLength * 8 + 100;

  logger.info("overlaySize", overlaySize);

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-30" onClick={close}>
          {/* Localized overlay only (no global dim) */}
          <div
            className="absolute right-0 bottom-0 pointer-events-none"
            style={{
              width: overlaySize,
              height: overlaySize,
              background: "rgba(61,41,20,0.16)",
              WebkitMaskImage:
                "radial-gradient(120% 120% at 100% 100%, #000 0%, #000 55%, transparent 78%)",
              maskImage:
                "radial-gradient(120% 120% at 100% 100%, #000 0%, #000 55%, transparent 78%)",

              // ↓ make the blur very subtle (tweak 0–2px)
              backdropFilter: "blur(0.2px)",
              WebkitBackdropFilter: "blur(0.2px)", // Safari
            }}
          />

        </div>
      )}


      {/* Actions + FAB */}
      <div className="fixed right-4 bottom-24 z-40">
        {open &&
          actions.map((action, index) => {
            const angle = startAngle + index * spacing;
            const rad = (angle * Math.PI) / 180;
            const x = Math.cos(rad) * radius * factor;
            const y = Math.sin(rad) * radius * factor;

            return (
              <button
                key={action.label}
                onClick={() => { close(); action.onPress(); }}
                className="
    absolute uppercase whitespace-nowrap
    text-primary text-xl font-bold tracking-wide
  "
                style={{ textShadow: 'none', transform: `translate(${x}px, ${-y}px) translateX(-100%)` }}

              >
                {action.label}
              </button>

            );
          })}

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
