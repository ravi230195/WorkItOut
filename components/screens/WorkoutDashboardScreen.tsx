import { useState, useEffect } from "react";
import { StepCounter } from "../StepCounter";
import { TactileButton } from "../TactileButton";
import { MoreVertical, AlertCircle } from "lucide-react";
import { useStepTracking } from "../../hooks/useStepTracking";
import { useScrollToTop } from "../../hooks/useScrollToTop";
import { useKeyboardInset } from "../../hooks/useKeyboardInset";
import { supabaseAPI, UserRoutine } from "../../utils/supabase-api";
import { useAuth } from "../AuthContext";
import { toast } from "sonner";

interface WorkoutDashboardScreenProps {
  onCreateRoutine: () => void;
  onSelectRoutine: (routineId: number, routineName: string) => void;
  /** NEW: notify parent when a modal/sheet is opened/closed so it can hide BottomNavigation */
  onOverlayChange?: (open: boolean) => void;
}

export function WorkoutDashboardScreen({
  onCreateRoutine,
  onSelectRoutine,
  onOverlayChange, // NEW
}: WorkoutDashboardScreenProps) {
  // Scroll and keyboard helpers
  const scrollRef = useScrollToTop();
  useKeyboardInset();

  const { userToken } = useAuth();

  const [routines, setRoutines] = useState<UserRoutine[]>([]);
  const [isLoadingRoutines, setIsLoadingRoutines] = useState(true);
  const [routinesError, setRoutinesError] = useState<string | null>(null);

  // Bottom sheet state
  const [actionRoutine, setActionRoutine] = useState<UserRoutine | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Step tracking
  const {
    steps,
    goal,
    progressPercentage,
    isLoading: isLoadingSteps,
  } = useStepTracking(true);

  const reloadRoutines = async () => {
    try {
      const data = await supabaseAPI.getUserRoutines();
      setRoutines(data);
    } catch (e) {
      setRoutinesError(e instanceof Error ? e.message : "Failed to load routines");
    }
  };

  // Load routines
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!userToken) return;
      setIsLoadingRoutines(true);
      try {
        await reloadRoutines();
      } catch (error) {
        if (error instanceof Error && error.message === "UNAUTHORIZED") {
          toast.error("Session expired. Please sign in.");
        }
      } finally {
        setIsLoadingRoutines(false);
      }
    };
    fetchInitialData();
  }, [userToken]);

  // Ensure nav is restored if component unmounts while sheet is open
  useEffect(() => {
    return () => {
      if (actionRoutine) onOverlayChange?.(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning!";
    if (hour < 18) return "Good afternoon!";
    return "Good evening!";
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 1) return "yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  // Open/close bottom sheet
  const openActions = (routine: UserRoutine, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent card navigation
    setActionRoutine(routine);
    setRenaming(false);
    setRenameValue(routine.name);
    setConfirmDelete(false);
    onOverlayChange?.(true); // NEW
  };
  const closeActions = () => {
    setActionRoutine(null);
    setRenaming(false);
    setConfirmDelete(false);
    onOverlayChange?.(false); // NEW
  };

  const handleRenameSubmit = async () => {
    if (!actionRoutine) return;
    const nextName = renameValue.trim();
    if (!nextName) {
      toast.error("Name cannot be empty");
      return;
    }

    try {
      await supabaseAPI.renameRoutine(actionRoutine.routine_template_id, nextName);
      await reloadRoutines();
      toast.success("Routine renamed");
      closeActions();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to rename routine");
    }
  };

  const handleDeleteRoutine = async () => {
    if (!actionRoutine) return;
    try {
      await supabaseAPI.deleteRoutine(actionRoutine.routine_template_id); // soft delete (is_active=false)
      await reloadRoutines();
      toast.success("Routine deleted");
      closeActions();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete routine");
    }
  };

  return (
    <div ref={scrollRef} className="dashboard-bg pt-safe p-6 space-y-6 max-w-md mx-auto pb-20">
      {/* Greeting */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-medium text-[var(--warm-brown)]">
          {getGreeting()}
        </h1>
      </div>

      {/* Routines */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-[var(--warm-brown)]">MY ROUTINES</h2>
          <TactileButton
            onClick={onCreateRoutine}
            className="bg-[var(--warm-coral)] hover:bg-[var(--warm-coral)]/90 text-white px-3 py-1.5 text-sm font-medium"
          >
            Create Routine
          </TactileButton>
        </div>

        {isLoadingRoutines ? (
          <div className="text-center py-8">
            <div className="animate-spin mx-auto mb-3 w-6 h-6 border-2 border-[var(--warm-coral)] border-t-transparent rounded-full"></div>
            <p className="text-[var(--warm-brown)]/60 text-sm">Loading routines...</p>
          </div>
        ) : routinesError ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto mb-3 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-500" />
            </div>
            <p className="text-red-600 text-sm mb-3">{routinesError}</p>
            <TactileButton
              onClick={reloadRoutines}
              variant="secondary"
              className="px-4 py-2 text-sm"
            >
              Try Again
            </TactileButton>
          </div>
        ) : routines.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-[var(--warm-brown)]/60 text-sm mb-3">
              Start by adding a new routine
            </p>
            <TactileButton
              onClick={onCreateRoutine}
              className="bg-[var(--warm-coral)] hover:bg-[var(--warm-coral)]/90 text-white px-4 py-2 text-sm font-medium"
            >
              Create Your First Routine
            </TactileButton>
          </div>
        ) : (
          <div className="space-y-3">
            {routines.map((routine) => (
              <div
                key={routine.routine_template_id}
                onClick={() => onSelectRoutine(routine.routine_template_id, routine.name)}
                className="relative bg-white/80 backdrop-blur-sm rounded-2xl border border-[var(--border)] p-4 shadow-sm hover:shadow-md transition-all cursor-pointer hover:bg-white/90"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-[var(--warm-brown)] mb-1">
                      {routine.name}
                    </h3>
                    <p className="text-sm text-[var(--warm-brown)]/60">
                      Created {formatDate(routine.created_at)} • Version {routine.version}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-xs text-[var(--warm-brown)]/40 px-2 py-1 bg-[var(--soft-gray)] rounded-full">
                      Active
                    </div>
                    <TactileButton
                      variant="secondary"
                      size="sm"
                      className="p-2 h-auto"
                      onClick={(e) => openActions(routine, e)}
                      aria-label="More options"
                    >
                      <MoreVertical size={16} />
                    </TactileButton>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Steps */}
      <div className="space-y-4">
        <StepCounter
          steps={steps}
          goal={goal}
          progressPercentage={progressPercentage}
          isLoading={isLoadingSteps}
        />
      </div>

      {/* Bottom Sheet Action Menu */}
      {actionRoutine && (
        <div
          className="fixed inset-0 z-50"
          aria-modal="true"
          role="dialog"
          onClick={closeActions}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />

          {/* Sheet container */}
          <div
            className="absolute inset-x-0 bottom-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto w-full max-w-md px-4 pb-[env(safe-area-inset-bottom)]">
              <div className="bg-white rounded-t-2xl shadow-2xl border border-[var(--border)] overflow-hidden">
                {/* Grip */}
                <div className="flex justify-center py-2">
                  <div className="h-1.5 w-10 rounded-full bg-gray-200" />
                </div>

                {/* Header */}
                <div className="px-4 pb-2">
                  <p className="text-xs text-gray-500">Routine</p>
                  <h3 className="font-medium text-[var(--warm-brown)] truncate">
                    {actionRoutine.name}
                  </h3>
                </div>

                <div className="h-px bg-[var(--border)]" />

                {/* Content */}
                {!renaming && !confirmDelete ? (
                  <div className="p-2">
                    <button
                      className="w-full text-left px-3 py-3 rounded-lg hover:bg-gray-50"
                      onClick={() => setRenaming(true)}
                    >
                      Rename
                    </button>
                    <button
                      className="w-full text-left px-3 py-3 rounded-lg hover:bg-red-50 text-red-600"
                      onClick={() => setConfirmDelete(true)}
                    >
                      Delete
                    </button>

                    <div className="pt-1">
                      <TactileButton
                        variant="secondary"
                        className="w-full py-3"
                        onClick={closeActions}
                      >
                        Cancel
                      </TactileButton>
                    </div>
                  </div>
                ) : null}

                {/* Rename UI */}
                {renaming && !confirmDelete && (
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
                        onClick={handleRenameSubmit}
                        disabled={!renameValue.trim()}
                      >
                        Save
                      </TactileButton>
                      <TactileButton
                        variant="secondary"
                        className="flex-1"
                        onClick={() => setRenaming(false)}
                      >
                        Cancel
                      </TactileButton>
                    </div>
                  </div>
                )}

                {/* Confirm Delete UI */}
                {confirmDelete && (
                  <div className="p-4 space-y-3">
                    <p className="text-sm text-gray-700">
                      Delete <span className="font-medium">{actionRoutine.name}</span>?
                      <br />
                      <span className="text-gray-500">This will remove it from your list (soft delete).</span>
                    </p>
                    <div className="flex gap-3 pt-1">
                      <TactileButton
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                        onClick={handleDeleteRoutine}
                      >
                        Delete
                      </TactileButton>
                      <TactileButton
                        variant="secondary"
                        className="flex-1"
                        onClick={() => setConfirmDelete(false)}
                      >
                        Cancel
                      </TactileButton>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}