import { ReactNode, useEffect, useState } from "react";
import { Plus } from "lucide-react";

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
  const [showBackdrop, setShowBackdrop] = useState(false);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;

    if (open) {
      setShowBackdrop(true);
    } else if (showBackdrop) {
      timeout = setTimeout(() => setShowBackdrop(false), 400);
    }

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [open, showBackdrop]);

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

  return (
    <div className="fixed right-4 bottom-20 z-40">
      <div className="relative flex flex-col items-end gap-4">
        {showBackdrop && (
          <div
            className={`pointer-events-none absolute right-0 bottom-0 w-56 h-56 translate-x-6 translate-y-6 rounded-[36px] bg-white/90 shadow-xl blur-lg transition-all duration-500 ease-out -z-10 transform ${
              open ? "opacity-100 scale-100" : "opacity-0 scale-95"
            }`}
          />
        )}

        {open && (
          <div className="relative flex flex-col items-end gap-4 mb-4 z-10">
            {actions.map((action) => (
              <button
                key={action.label}
                onClick={() => {
                  close();
                  action.onPress();
                }}
                className="flex items-center gap-3"
              >
                <span
                  className="uppercase whitespace-nowrap text-black text-xl font-bold tracking-wide"
                  style={{ textShadow: "0 2px 2px rgba(0,0,0,0.3)" }}
                >
                  {action.label}
                </span>
                {action.icon && (
                  <span className="w-12 h-12 rounded-full bg-primary text-black shadow flex items-center justify-center">
                    {action.icon}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        <button
          onClick={toggle}
          aria-label="Speed dial"
          aria-expanded={open}
          className="
            relative z-20 w-16 h-16 rounded-full bg-primary text-black
            shadow-lg flex items-center justify-center
            transition-transform
          "
        >
          <Plus className={`w-6 h-6 transition-transform ${open ? "rotate-45" : ""}`} />
        </button>
      </div>
    </div>
  );
}

