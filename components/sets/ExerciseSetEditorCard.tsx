// components/sets/ExerciseSetEditorCard.tsx
import * as React from "react";
import { TactileButton } from "../TactileButton";
import SetList, { SetListItem } from "./SetList";
import { Trash2 } from "lucide-react";

type Props = {
  name: string;
  initials: string;
  items: SetListItem[];

  onChange?: (key: string | number, field: "reps" | "weight", value: string) => void;
  onRemove?: (key: string | number) => void;
  onAdd?: () => void;

  // Behavior / UI
  disabled?: boolean;
  onFocusScroll?: React.FocusEventHandler<HTMLInputElement>;
  className?: string;

  // Optional helper note under header
  note?: string;

  // NEW: delete exercise from routine
  onDeleteExercise?: () => void;
  deleteDisabled?: boolean;

  // Optional cancel and primary actions
  onCancel?: () => void;
  onPrimary?: () => void;
  primaryLabel?: string;
  primaryDisabled?: boolean;
};

const ExerciseSetEditorCard: React.FC<Props> = ({
  items,
  onChange,
  onRemove,
  onAdd,
  onDeleteExercise,
  deleteDisabled,
  disabled = false,
  onFocusScroll,
  className = "",
  note,
  onCancel,
  onPrimary,
  primaryLabel = "Save",
  primaryDisabled = false,
}) => {
  return (
    <div className={["rounded-2xl bg-white/70 border border-[var(--border)] p-3 md:p-4", className].join(" ")}
    style={{ border: "2px solid red" }}>
      {note && (
        <p className="text-xs md:text-sm text-[var(--muted-foreground)] mb-3 italic bg-[var(--warm-cream)]/50 p-3 rounded-lg">
          {note}
        </p>
      )}

      {/* The unified set editor UI */}
      <SetList
        mode="edit"
        items={items}
        onDeleteExercise={onDeleteExercise}
        deleteDisabled={deleteDisabled}
        onChange={onChange}
        onRemove={onRemove}
        onAdd={onAdd}
        onFocusScroll={onFocusScroll}
        disabled={disabled}
      />

      {/* Secondary row (trash/cancel) */}
      {onCancel && (
        <div className="mt-4 flex justify-end items-center gap-2">
          <TactileButton
            variant="secondary"
            size="sm"
            onClick={onCancel}
            disabled={disabled}
            className={`p-3 h-auto bg-white/70 border-red-200 text-red-500 hover:bg-red-50 btn-tactile ${
              disabled ? "opacity-50 cursor-not-allowed" : ""
            }`}
            title="Cancel"
          >
            <Trash2 size={18} />
          </TactileButton>
        </div>
      )}

      {/* Primary CTA (optional) */}
      {onPrimary && (
        <div className="mt-6">
          <TactileButton
            onClick={onPrimary}
            disabled={primaryDisabled || disabled}
            className={`w-full h-12 md:h-14 bg-[var(--warm-coral)] text-white font-medium rounded-full hover:bg-[var(--warm-coral)]/90 btn-tactile ${
              primaryDisabled || disabled ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {primaryLabel}
          </TactileButton>
        </div>
      )}
    </div>
  );
};

export default ExerciseSetEditorCard;