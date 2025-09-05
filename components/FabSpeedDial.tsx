import { useState, ReactNode } from "react";
import { Plus } from "lucide-react";

export interface FabAction {
  icon: ReactNode;
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

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-30" onClick={close}>
          <div
            className="absolute bottom-24 right-4 flex flex-col items-end gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            {actions.map((action) => (
              <button
                key={action.label}
                onClick={() => {
                  close();
                  action.onPress();
                }}
                className="w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center"
                aria-label={action.label}
              >
                {action.icon}
              </button>
            ))}
          </div>
        </div>
      )}
      <button
        onClick={toggle}
        className="fixed right-4 bottom-24 z-40 w-16 h-16 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center"
        aria-label="Speed dial"
      >
        <Plus className={`w-6 h-6 transition-transform ${open ? "rotate-45" : ""}`} />
      </button>
    </>
  );
}
