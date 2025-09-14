// components/sets/SetList.tsx
import * as React from "react";
import { NumberInput } from "../ui/number-input";
import { TactileButton } from "../TactileButton";
import { X, Plus, Trash2 } from "lucide-react";

export type SetListMode = "view" | "edit" | "workout";

export interface SetListItem {
  key: string | number;
  order: number;
  reps?: string;
  weight?: string;
  removable?: boolean;
  done?: boolean;
}

export interface SetListProps {
  /** Back-compat: if mode !== "edit" we render read-only (but same layout) */
  mode?: SetListMode;
  items: SetListItem[];

  /** Used when interactive */
  onChange?: (key: string | number, field: "reps" | "weight", value: string) => void;
  onRemove?: (key: string | number) => void;
  onAdd?: () => void;
  onToggleDone?: (key: string | number, done: boolean) => void;

  /** Optional: delete the entire exercise (parent handles actual removal from routine) */
  onDeleteExercise?: () => void;
  deleteTitle?: string;
  deleteDisabled?: boolean;

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
  onToggleDone,
  onDeleteExercise,
  deleteTitle = "Remove this exercise from the routine",
  deleteDisabled = false,
  onFocusScroll,
  disabled = false,
  className = "",
}) => {
  // Single unified layout. Read-only when disabled OR not in explicit edit mode.
  const readOnly = disabled || mode === "view";
  const isDisabled = readOnly || deleteDisabled;

  // DEBUG: Log the overall component state
  React.useEffect(() => {
    /*logger.debug("🔍 SetsList DEBUG: Component state:", {
      mode,
      disabled,
      readOnly,
      itemsCount: items.length,
      hasOnRemove: !!onRemove,
      hasOnChange: !!onChange,
      hasOnAdd: !!onAdd,
      hasOnDeleteExercise: !!onDeleteExercise,
      hasOnFocusScroll: !!onFocusScroll,
      className
    }) */
  }, [
    mode,
    disabled,
    readOnly,
    items.length,
    onRemove,
    onChange,
    onAdd,
    onDeleteExercise,
    onFocusScroll,
    className
  ]);

  return (
    <div className={className}>
      {/* Header row — identical to configure card */}
      <div className="grid grid-cols-4 gap-3 md:gap-4 text-[10px] md:text-xs text-black uppercase tracking-wider mb-2"
      /* RAVI DBG: style={{ border: "2px solid green" }}*/>
        <span>Set</span>
        <span className="text-center">Reps</span>
        <span className="text-center">Weight (kg)</span>
        <span />
      </div>

      <div className="space-y-3"
      /*RAVI DBG:  style={{ border: "2px solid blue" }}*/>
        {items.map((it, index) => {  
          const canRemove =
            mode === "edit" && !readOnly && !!onRemove && (it.removable ?? true) && items.length > 1;

          // DEBUG: Log detailed canRemove calculation for each item
          /*logger.debug(`🔍 SetsList DEBUG: Set ${it.order} (key: ${it.key}) canRemove calculation:`, {
            setOrder: it.order,
            setKey: it.key,
            readOnly,
            hasOnRemove: !!onRemove,
            itemRemovable: it.removable,
            itemRemovableDefault: it.removable ?? true,
            itemsLength: items.length,
            itemsLengthCheck: items.length > 1,
            canRemove,
            condition1_notReadOnly: !readOnly,
            condition2_hasOnRemove: !!onRemove,
            condition3_itemRemovable: it.removable ?? true,
            condition4_itemsLengthGreaterThan1: items.length > 1,
            finalResult: canRemove
          });*/

          return (
            <div
              key={it.key}
              className={`grid grid-cols-4 gap-3 md:gap-4 items-center py-2 px-3 rounded-lg border border-border/20 ${
                it.done ? "bg-success-light" : "bg-soft-gray/30"
              }`}
              /*RAVI DBG: style={{ border: "2px solid yellow" }}*/>
              <span className="text-sm font-medium text-black">
                {index + 1}
              </span>

              <NumberInput
                mode="numeric"
                step={1}
                min={0}
                value={it.reps ?? "0"}
                onFocus={onFocusScroll}
                onChange={(e) => onChange?.(it.key, "reps", e.target.value)}
                disabled={readOnly}
                className={`bg-input-background border-border text-black text-center h-10 md:h-8 rounded-md focus:border-warm-sage/20 text-sm ${readOnly ? "opacity-50 cursor-not-allowed" : ""}`}
              />

              <NumberInput
                mode="decimal"
                step={0.5}
                min={0}
                value={it.weight ?? "0"}
                onFocus={onFocusScroll}
                onChange={(e) => onChange?.(it.key, "weight", e.target.value)}
                disabled={readOnly}
                className={`bg-input-background border-border text-black text-center h-10 md:h-8 rounded-md focus:border-warm-sage/20 text-sm ${readOnly ? "opacity-50 cursor-not-allowed" : ""}`}
              />

              {mode === "workout" ? (
                <div className="flex justify-end">
                  <input
                    type="checkbox"
                    checked={!!it.done}
                    onChange={(e) => onToggleDone?.(it.key, e.target.checked)}
                    className="w-5 h-5 ml-auto rounded-full border-2 border-border text-black accent-success checked:border-success"
                  />
                </div>
              ) : canRemove ? (
                <TactileButton
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemove?.(it.key)}
                  className="p-1 h-auto ml-auto"
                  title="Remove this set"
                >
                  <X size={14} />
                </TactileButton>
              ) : (
                // Spacer keeps grid width identical when read-only / not removable
                <div className="w-6 h-6 ml-auto" />
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom action row: Add on the left, Delete Exercise on the right */}
      {(onAdd || onDeleteExercise) && (
        <div className="mt-3 flex items-center justify-between">
          {/* Left: Add Set (only when interactive) */}
          {onAdd ? (
            <TactileButton
              onClick={onAdd}
              variant="primary"
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium"
              disabled={isDisabled}
              title={
                isDisabled
                  ? readOnly
                    ? "Editing disabled"
                    : "Adding sets is disabled"
                  : "Add a set"
              }
            >
              <Plus size={16} />
              <span className="text-xs md:text-sm font-medium uppercase tracking-wider">
                Add Set
              </span>
            </TactileButton>
          ) : (
            <div />
          )}

          {/* Right: Delete Exercise (icon button) */}
          {onDeleteExercise && (
            <TactileButton
              variant="secondary"
              size="sm"
              onClick={onDeleteExercise}
              disabled={deleteDisabled || readOnly}
              className={`p-2 h-auto rounded-lg font-medium ${deleteDisabled || readOnly
                ? "opacity-50 cursor-not-allowed"
                : "bg-destructive-light text-black hover:bg-destructive"
                }`}
              title={deleteTitle}
            >
              <Trash2 size={16} />
            </TactileButton>
          )}
        </div>
      )}
    </div>
  );
};

export default SetList;
