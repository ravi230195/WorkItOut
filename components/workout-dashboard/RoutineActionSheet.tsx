import { useEffect, useState } from "react";
import ActionSheet from "../sheets/ActionSheet";
import { supabaseAPI, UserRoutine } from "../../utils/supabase/supabase-api";
import { toast } from "sonner";

interface RoutineActionSheetProps {
  routine: UserRoutine | null;
  onClose: () => void;
  reloadRoutines: () => Promise<void>;
}

export default function RoutineActionSheet({ routine, onClose, reloadRoutines }: RoutineActionSheetProps) {
  const [mode, setMode] = useState<"main" | "rename" | "delete">("main");
  const [renameValue, setRenameValue] = useState("");
  const [renameLoading, setRenameLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (routine) {
      setMode("main");
      setRenameValue(routine.name);
      setRenameLoading(false);
      setDeleteLoading(false);
    }
  }, [routine]);

  if (!routine) return null;

  const handleRename = async () => {
    if (!renameValue.trim()) return;
    setRenameLoading(true);
    await supabaseAPI.renameRoutine(routine.routine_template_id, renameValue.trim());
    await reloadRoutines();
    toast.success("Routine renamed");
    setRenameLoading(false);
    onClose();
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    await supabaseAPI.deleteRoutine(routine.routine_template_id);
    await reloadRoutines();
    toast.success("Routine deleted");
    setDeleteLoading(false);
    onClose();
  };

  return (
    <>
      {mode === "main" && (
        <ActionSheet
          open={!!routine}
          onClose={onClose}
          title={routine.name}
          actions={[
            {
              label: "Rename Routine",
              onClick: () => setMode("rename"),
              type: "button",
            },
            {
              label: "Delete Routine",
              onClick: () => setMode("delete"),
              type: "button",
              variant: "destructive",
            },
          ]}
        />
      )}
      {mode === "rename" && (
        <ActionSheet
          open={!!routine}
          onClose={onClose}
          title="Rename Routine"
          cancelText={null}
          actions={[
            {
              label: renameLoading ? "Saving…" : "Save",
              onClick: handleRename,
              type: "button",
              disabled: !renameValue.trim() || renameLoading,
            },
            {
              label: "Cancel",
              onClick: () => setMode("main"),
              type: "button",
              variant: "secondary",
              disabled: renameLoading,
            },
          ]}
        >
          <div className="space-y-3">
            <label className="text-sm text-gray-600">New name</label>
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 outline-none focus:ring-2 focus:ring-warm-coral/30 focus:border-warm-coral"
              placeholder="Enter routine name"
              onKeyDown={async (e) => {
                if (e.key === "Enter" && !renameLoading) {
                  await handleRename();
                }
              }}
            />
          </div>
        </ActionSheet>
      )}
      {mode === "delete" && (
        <ActionSheet
          open={!!routine}
          onClose={onClose}
          title={`Delete ${routine.name}?`}
          cancelText={null}
          message="This will remove it from your list"
          actions={[
            {
              label: deleteLoading ? "Deleting…" : "Delete",
              onClick: handleDelete,
              type: "button",
              variant: "destructive",
              disabled: deleteLoading,
            },
            {
              label: "Cancel",
              onClick: () => setMode("main"),
              type: "button",
              variant: "secondary",
              disabled: deleteLoading,
            },
          ]}
        />
      )}
    </>
  );
}
