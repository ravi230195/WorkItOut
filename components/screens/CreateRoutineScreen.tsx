import { useState } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import { Input } from "../ui/input";
import { TactileButton } from "../TactileButton";
import { useAuth } from "../AuthContext";
import { toast } from "sonner";
import { useKeyboardInset } from "../../hooks/useKeyboardInset";
import { supabaseAPI } from "../../utils/supabase-api";

interface CreateRoutineScreenProps {
  onBack: () => void;
  /** Pass both name and created routineId to parent */
  onRoutineCreated: (routineName: string, routineId: number) => void;
}

export function CreateRoutineScreen({ onBack, onRoutineCreated }: CreateRoutineScreenProps) {
  useKeyboardInset();

  const [routineName, setRoutineName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const { userToken } = useAuth();

  const handleCreateRoutine = async () => {
    if (!routineName.trim()) {
      toast.error("Please enter a routine name");
      return;
    }
    if (!userToken) {
      toast.error("Please sign in to create routines");
      return;
    }

    try {
      setIsCreating(true);
      // Create in DB now
      const newRoutine = await supabaseAPI.createUserRoutine(routineName);
      if (!newRoutine) throw new Error("Failed to create routine");

      const routineId = newRoutine.routine_template_id;
      // Navigate to ExerciseSetup (empty)
      onRoutineCreated(routineName, routineId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create routine";
      toast.error(msg);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="bg-background flex flex-col pt-safe">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white/80 backdrop-blur-sm">
        <TactileButton variant="secondary" size="sm" onClick={onBack}>
          <ArrowLeft size={20} />
        </TactileButton>
        <h1 className="absolute left-1/2 -translate-x-1/2 font-medium text-[var(--warm-brown)] tracking-wide">
        NAME YOUR WORKOUT
        </h1>
        <div className="w-10" />
      </div>

      {/* Content */}
      <div className="px-4 py-8 space-y-8">
        <div>
          <Input
            value={routineName}
            onChange={(e) => setRoutineName(e.target.value)}
            placeholder="Routine Name"
            className="bg-[var(--input-background)] border-[var(--border)] text-[var(--warm-brown)] placeholder:text-[var(--warm-brown)]/60 h-12 text-base rounded-xl focus:border-[var(--warm-coral)] focus:ring-[var(--warm-coral)]/20"
            maxLength={50}
            autoFocus
            disabled={isCreating}
          />
        </div>

        <div>
          <TactileButton
            onClick={handleCreateRoutine}
            disabled={!routineName.trim() || isCreating}
            className="w-full h-14 bg-[var(--warm-coral)] hover:bg-[var(--warm-coral)]/90 text-white font-medium text-base rounded-full disabled:opacity-50 disabled:cursor-not-allowed border-0"
          >
            <div className="flex items-center justify-center gap-2">
              <Plus size={20} />
              {isCreating ? "CREATING..." : "ADD ROUTINE"}
            </div>
          </TactileButton>
        </div>
      </div>
    </div>
  );
}
