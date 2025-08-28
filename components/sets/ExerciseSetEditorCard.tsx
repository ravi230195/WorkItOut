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

  // Optional footer actions
  onCancel?: () => void;                     // show a small trash/cancel icon button if provided
  onPrimary?: () => void;                    // show primary CTA if provided
  primaryLabel?: string;
  primaryDisabled?: boolean;

  // Behavior / UI
  disabled?: boolean;
  onFocusScroll?: React.FocusEventHandler<HTMLInputElement>;
  className?: string;

  // NEW: hide the inner title bar (so we don’t double-show the exercise name)
  showHeader?: boolean;                      // default true

  // Optional helper note under header
  note?: string;
};

const ExerciseSetEditorCard: React.FC<Props> = ({
  name,
  initials,
  items,
  onChange,
  onRemove,
  onAdd,
  onCancel,
  onPrimary,
  primaryLabel = "Save",
  primaryDisabled = false,
  disabled = false,
  onFocusScroll,
  className = "",
  showHeader = true,        // <— default is to show header
  note,
}) => {
  return (
    <div className={["rounded-2xl bg-white/70 border border-[var(--border)] p-3 md:p-4", className].join(" ")}>
      {/* Header (optional) */}
      {showHeader && (
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-[var(--muted)] rounded-lg flex items-center justify-center overflow-hidden">
            <span className="text-base md:text-lg font-medium text-[var(--muted-foreground)]">
              {initials.substring(0, 2).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-medium text-[var(--foreground)] mb-1 truncate">
              {name}
            </h2>
            {!!items?.length && (
              <p className="text-xs md:text-sm text-[var(--muted-foreground)]">
                {items.length} {items.length === 1 ? "Set" : "Sets"}
              </p>
            )}
          </div>
        </div>
      )}

      {note && (
        <p className="text-xs md:text-sm text-[var(--muted-foreground)] mb-3 italic bg-[var(--warm-cream)]/50 p-3 rounded-lg">
          {note}
        </p>
      )}

      {/* The unified set editor UI */}
      <SetList
        mode="edit"
        items={items}
        onChange={onChange}
        onRemove={onRemove}
        onAdd={onAdd}
        onFocusScroll={onFocusScroll}
        disabled={disabled}
      />

      {/* Optional small cancel (trash) + primary CTA */}
      <div className="mt-4 flex justify-between items-center gap-2">
        {onCancel ? (
          <TactileButton
            variant="secondary"
            size="sm"
            onClick={onCancel}
            className="p-3 h-auto bg-white/70 border-red-200 text-red-500 hover:bg-red-50 btn-tactile"
          >
            <Trash2 size={18} />
          </TactileButton>
        ) : <div />}

        {onPrimary && (
          <TactileButton
            onClick={onPrimary}
            disabled={primaryDisabled}
            className={`h-11 md:h-12 px-6 bg-[var(--warm-coral)] text-white font-medium rounded-full hover:bg-[var(--warm-coral)]/90 btn-tactile ${
              primaryDisabled ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {primaryLabel}
          </TactileButton>
        )}
      </div>
    </div>
  );
};

export default ExerciseSetEditorCard;
