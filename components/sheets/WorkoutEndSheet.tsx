// components/sheets/WorkoutEndSheet.tsx
import * as React from "react";
import BottomSheet from "./BottomSheets";
import { TactileButton } from "../TactileButton";

export type WorkoutEndSheetProps = {
  open: boolean;
  hasIncompleteSets: boolean;
  onClose: () => void;
  onFinish: () => void | Promise<void>;
  onCancelWorkout: () => void | Promise<void>;
  finishing?: boolean;
};

export default function WorkoutEndSheet({
  open,
  hasIncompleteSets,
  onClose,
  onFinish,
  onCancelWorkout,
  finishing = false,
}: WorkoutEndSheetProps) {
  const header = (
    <div className="text-center">
      <h3 className="font-medium text-warm-brown text-[clamp(14px,3.8vw,18px)]">
        Finish Workout?
      </h3>
    </div>
  );

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      header={header}
      footer={
        <TactileButton
          variant="secondary"
          className="w-full py-3"
          onClick={onClose}
          disabled={finishing}
        >
          Cancel
        </TactileButton>
      }
      fullWidth
      zIndex={60}
    >
      <div className="p-4 space-y-3">
        {hasIncompleteSets && (
          <p className="text-sm text-muted-foreground">
            There are valid sets in this workout that have not been marked as
            complete.
          </p>
        )}
        <div className="space-y-3 pt-1">
          <TactileButton
            className="w-full"
            onClick={onFinish}
            disabled={finishing}
          >
            {finishing ? "Saving…" : "Finish Workout"}
          </TactileButton>
          <TactileButton
            className="w-full bg-destructive hover:bg-destructive/90 text-primary-foreground"
            onClick={onCancelWorkout}
            disabled={finishing}
          >
            Cancel Workout
          </TactileButton>
        </div>
      </div>
    </BottomSheet>
  );
}

