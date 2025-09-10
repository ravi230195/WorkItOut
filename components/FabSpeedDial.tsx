import { ReactNode, useState } from "react";
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
    <div className="fixed right-4 bottom-20 z-40 flex flex-col items-end gap-4">
      {open && (
        <div className="flex flex-col items-end gap-4 mb-4">
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
                className="uppercase whitespace-nowrap text-primary text-xl font-bold tracking-wide"
                style={{ textShadow: "0 2px 2px rgba(0,0,0,0.3)" }}
              >
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
  );
}

