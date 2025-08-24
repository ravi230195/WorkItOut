import * as React from "react";
import BottomSheet from "../sheets/BottomSheets";
import { TactileButton } from "../TactileButton";

export type RoutineActionsSheetProps = {
  open: boolean;
  routineName: string;

  onClose: () => void;

  /** Parent performs the actual rename and delete. */
  onRequestRename: (newName: string) => Promise<void> | void;
  onRequestDelete: () => Promise<void> | void;

  /** Optional loading flags while parent is doing work */
  renameLoading?: boolean;
  deleteLoading?: boolean;
};

export default function RoutineActionsSheet({
  open,
  routineName,
  onClose,
  onRequestRename,
  onRequestDelete,
  renameLoading = false,
  deleteLoading = false,
}: RoutineActionsSheetProps) {
  type Mode = "default" | "renaming" | "confirmDelete";
  const [mode, setMode] = React.useState<Mode>("default");
  const [renameValue, setRenameValue] = React.useState(routineName);

  React.useEffect(() => {
    if (open) {
      setMode("default");
      setRenameValue(routineName);
    }
  }, [open, routineName]);

  const header = (
    <div>
      <p className="text-xs text-gray-500">Routine</p>
      <h3 className="font-medium text-[var(--warm-brown)] truncate text-[clamp(14px,3.8vw,18px)]">
        {routineName}
      </h3>
    </div>
  );

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      header={header}
      zIndex={60} // above FooterBar's z-50
    >
      {/* default mode */}
      {mode === "default" && (
        <div className="p-2">
          <button
            className="w-full text-left px-3 py-3 rounded-lg hover:bg-gray-50"
            onClick={() => setMode("renaming")}
          >
            Rename
          </button>
          <button
            className="w-full text-left px-3 py-3 rounded-lg hover:bg-red-50 text-red-600"
            onClick={() => setMode("confirmDelete")}
          >
            Delete
          </button>

          <div className="pt-1">
            <TactileButton
              variant="secondary"
              className="w-full py-3"
              onClick={onClose}
            >
              Cancel
            </TactileButton>
          </div>
        </div>
      )}

      {/* renaming */}
      {mode === "renaming" && (
        <div className="p-4 space-y-3">
          <label className="text-sm text-gray-600">New name</label>
          <input
            autoFocus
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--warm-coral)]/30 focus:border-[var(--warm-coral)]"
            placeholder="Enter routine name"
          />
          <div className="flex gap-3 pt-1">
            <TactileButton
              className="flex-1"
              onClick={async () => {
                const v = renameValue.trim();
                if (!v) return;
                await onRequestRename(v);
              }}
              disabled={!renameValue.trim() || renameLoading}
            >
              {renameLoading ? "Saving…" : "Save"}
            </TactileButton>
            <TactileButton
              variant="secondary"
              className="flex-1"
              onClick={() => setMode("default")}
              disabled={renameLoading}
            >
              Cancel
            </TactileButton>
          </div>
        </div>
      )}

      {/* confirm delete */}
      {mode === "confirmDelete" && (
        <div className="p-4 space-y-3">
          <p className="text-sm text-gray-700">
            Delete <span className="font-medium">{routineName}</span>?
            <br />
            <span className="text-gray-500">This will remove it from your list</span>
          </p>
          <div className="flex gap-3 pt-1">
            <TactileButton
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              onClick={onRequestDelete}
              disabled={deleteLoading}
            >
              {deleteLoading ? "Deleting…" : "Delete"}
            </TactileButton>
            <TactileButton
              variant="secondary"
              className="flex-1"
              onClick={() => setMode("default")}
              disabled={deleteLoading}
            >
              Cancel
            </TactileButton>
          </div>
        </div>
      )}
    </BottomSheet>
  );
}
