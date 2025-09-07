import { ReactNode, useLayoutEffect, useRef, useState } from "react";
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
  const actionsRef = useRef<HTMLDivElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);
  const [overlayStyle, setOverlayStyle] = useState<React.CSSProperties | null>(null);
  const [scrimStyle, setScrimStyle] = useState<React.CSSProperties | null>(null);

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

  useLayoutEffect(() => {
    if (open && actionsRef.current && fabRef.current) {
      const actionsRect = actionsRef.current.getBoundingClientRect();
      const fabRect = fabRef.current.getBoundingClientRect();

      setOverlayStyle({
        width: actionsRect.width,
        height: fabRect.bottom - actionsRect.top,
        right: window.innerWidth - actionsRect.right,
        top: actionsRect.top,
      });

      setScrimStyle({
        top: 0,
        bottom: window.innerHeight - fabRect.bottom,
      });

      logger.info("overlay", { actionsRect, fabRect });
    } else {
      setOverlayStyle(null);
      setScrimStyle(null);
    }
  }, [open]);

  return (
    <>
      {open && overlayStyle && scrimStyle && (
        <div
          className="fixed left-0 right-0 z-30"
          style={scrimStyle}
          onClick={close}
        >
          {/* Localized rectangular overlay anchored to the FAB */}
          <div
            className="absolute pointer-events-none rounded-lg"
            style={{
              ...overlayStyle,
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
        {open && (
          <div ref={actionsRef} className="flex flex-col items-end gap-4 mb-4">
            {actions.map((action) => (
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
          </div>
        )}

        <button
          ref={fabRef}
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
