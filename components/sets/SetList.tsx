// components/sets/SetList.tsx
import * as React from "react";
import { Input } from "../ui/input";
import { TactileButton } from "../TactileButton";
import { X, Plus } from "lucide-react";

export type SetListMode = "view" | "edit";

export interface SetListItem {
  key: string | number;
  order: number;
  reps?: string;
  weight?: string;
  removable?: boolean;
}

export interface SetListProps {
  /** Back-compat: if mode !== "edit" we render read-only (but same layout) */
  mode?: SetListMode;
  items: SetListItem[];

  /** Used when interactive */
  onChange?: (key: string | number, field: "reps" | "weight", value: string) => void;
  onRemove?: (key: string | number) => void;
  onAdd?: () => void;

  /** Optional focus helper for keyboard scroll-into-view */
  onFocusScroll?: React.FocusEventHandler<HTMLInputElement>;

  /** Force read-only/disabled */
  disabled?: boolean;

  className?: string;
}

const SetList: React.FC<SetListProps> = ({
  mode = "edit",
  items,
  onChange,
  onRemove,
  onAdd,
  onFocusScroll,
  disabled = false,
  className = "",
}) => {
  // Single unified layout. Read-only when disabled OR not in explicit edit mode.
  const readOnly = disabled || mode !== "edit";

  return (
    <div className={className}>
      {/* Header row — identical to configure card */}
      <div className="grid grid-cols-4 gap-3 md:gap-4 text-[10px] md:text-xs text-[var(--warm-brown)]/60 uppercase tracking-wider mb-2">
        <span>Set</span>
        <span className="text-center">Reps</span>
        <span className="text-center">Weight (kg)</span>
        <span />
      </div>

      <div className="space-y-3">
        {items.map((it) => {
          const canRemove =
            !readOnly && !!onRemove && (it.removable ?? true) && items.length > 1;

          return (
            <div
              key={it.key}
              className="grid grid-cols-4 gap-3 md:gap-4 items-center py-2 px-3 bg-[var(--soft-gray)]/30 rounded-lg border border-[var(--border)]/20"
            >
              <span className="text-sm font-medium text-[var(--warm-brown)]/80">
                {it.order}
              </span>

              <Input
                type="number"
                value={it.reps ?? "0"}
                onFocus={onFocusScroll}
                onChange={(e) => onChange?.(it.key, "reps", e.target.value)}
                disabled={readOnly}
                className={`bg-white border-[var(--border)] text-[var(--foreground)] text-center h-10 md:h-8 rounded-md focus:border-[var(--warm-sage)] focus:ring-[var(--warm-sage)]/20 text-sm ${readOnly ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                min="0"
              />

              <Input
                type="number"
                step="0.5"
                value={it.weight ?? "0"}
                onFocus={onFocusScroll}
                onChange={(e) => onChange?.(it.key, "weight", e.target.value)}
                disabled={readOnly}
                className={`bg-white border-[var(--border)] text-[var(--foreground)] text-center h-10 md:h-8 rounded-md focus:border-[var(--warm-coral)] focus:ring-[var(--warm-coral)]/20 text-sm ${readOnly ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                min="0"
              />

              {canRemove ? (
                <TactileButton
                  variant="secondary"
                  size="sm"
                  onClick={() => onRemove?.(it.key)}
                  className="p-1 h-auto bg-red-50 text-red-500 hover:bg-red-100"
                  title="Remove this set"
                >
                  <X size={14} />
                </TactileButton>
              ) : (
                // Spacer keeps grid width identical when read-only / not removable
                <div className="w-6 h-6" />
              )}
            </div>
          );
        })}
      </div>

      {/* Add button only when interactive */}
      {onAdd && (
        <div className="mt-3">
          <TactileButton
            onClick={onAdd}
            className="flex items-center gap-2 px-4 py-2 rounded-lg btn-tactile bg-white/70 border-[var(--border)] text-[var(--foreground)] hover:bg-white"
          >
            <Plus size={16} />
            <span className="text-xs md:text-sm font-medium uppercase tracking-wider">
              Add Set
            </span>
          </TactileButton>
        </div>
      )}
    </div>
  );
};

export default SetList;
