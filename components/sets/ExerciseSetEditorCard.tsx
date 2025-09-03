// components/sets/ExerciseSetEditorCard.tsx
import * as React from "react";
import { TactileButton } from "../TactileButton";
import SetList, { SetListItem, SetListMode } from "./SetList";
import { Trash2 } from "lucide-react";

type Props = {
  name: string;
  initials: string;
  items: SetListItem[];

  onChange?: (key: string | number, field: "reps" | "weight", value: string) => void;
  onRemove?: (key: string | number) => void;
  onAdd?: () => void;
  onToggleDone?: (key: string | number, done: boolean) => void;

  // Behavior / UI
  disabled?: boolean;
  onFocusScroll?: React.FocusEventHandler<HTMLInputElement>;
  className?: string;

  mode?: SetListMode;

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
  onToggleDone,
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
  mode = "edit",
}) => {
  return (
    <div className={["rounded-2xl bg-card/70 border border-border p-3 md:p-4", className].join(" ")}
    /* RAVI DBG: style={{ border: "2px solid red" }}*/>
      {note && (
        <p className="text-xs md:text-sm text-muted-foreground mb-3 italic bg-[var(--warm-cream)]/60 p-3 rounded-lg">
          {note}
        </p>
      )}

      {/* The unified set editor UI */}
      <SetList
        mode={mode}
        items={items}
        onDeleteExercise={mode === "workout" ? undefined : onDeleteExercise}
        deleteDisabled={deleteDisabled}
        onChange={onChange}
        onRemove={mode === "workout" ? undefined : onRemove}
        onAdd={onAdd}
        onToggleDone={onToggleDone}
        onFocusScroll={onFocusScroll}
        disabled={disabled}
      />

      {/* Secondary row (trash/cancel) */}
      {mode !== "workout" && onCancel && (
        <div className="mt-4 flex justify-end items-center gap-2">
          <TactileButton
            variant="secondary"
            size="sm"
            onClick={onCancel}
            disabled={disabled}
            className={`p-3 h-auto bg-card/70 border-destructive-light text-destructive hover:bg-destructive-light btn-tactile ${
              disabled ? "opacity-50 cursor-not-allowed" : ""
            }`}
            title="Cancel"
          >
            <Trash2 size={18} />
          </TactileButton>
        </div>
      )}

      {/* Primary CTA (optional) */}
      {mode !== "workout" && onPrimary && (
        <div className="mt-6">
          <TactileButton
            onClick={onPrimary}
            disabled={primaryDisabled || disabled}
            className={`w-full h-12 md:h-14 bg-primary text-primary-foreground font-medium rounded-full hover:bg-primary-hover btn-tactile ${
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