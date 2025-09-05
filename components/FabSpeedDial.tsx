import { useState } from "react";
import { Plus } from "lucide-react";

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

  const radius = 90;
  const spacing = 45;
  const startAngle = 180 - spacing * (actions.length - 1);

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-30" onClick={close}>
          <div
            className="absolute right-0 bottom-0 w-56 h-56 bg-black/40 backdrop-blur-sm rounded-tl-full pointer-events-none"
          />
        </div>
      )}
      <div className="fixed right-4 bottom-24 z-40">
        {open &&
          actions.map((action, index) => {
            const angle = startAngle + index * spacing;
            const rad = (angle * Math.PI) / 180;
            const x = Math.cos(rad) * radius;
            const y = Math.sin(rad) * radius;
            return (
              <button
                key={action.label}
                onClick={() => {
                  close();
                  action.onPress();
                }}
                className="absolute text-xl font-medium-lg text-primary text-right whitespace-nowrap"
                style={{ transform: `translate(${x}px, ${-y}px) translateX(-100%)` }}
                aria-label={action.label}
              >
                {action.label}
              </button>
            );
          })}
        <button
          onClick={toggle}
          className="w-16 h-16 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center"
          aria-label="Speed dial"
        >
          <Plus className={`w-6 h-6 transition-transform ${open ? "rotate-45" : ""}`} />
        </button>
      </div>
    </>
  );
}
