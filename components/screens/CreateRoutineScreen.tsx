import { useState } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import { Input } from "../ui/input";
import { TactileButton } from "../TactileButton";
import { useAuth } from "../AuthContext";
import { toast } from "sonner";
import { useKeyboardInset } from "../../hooks/useKeyboardInset";

interface CreateRoutineScreenProps {
  onBack: () => void;
  onRoutineCreated: (routineName: string) => void;
}

export function CreateRoutineScreen({ onBack, onRoutineCreated }: CreateRoutineScreenProps) {
  // Keyboard-aware scrolling
  useKeyboardInset();
  
  const [routineName, setRoutineName] = useState("");
  const { userToken } = useAuth();

  const handleCreateRoutine = () => {
    if (!routineName.trim()) {
      toast.error("Please enter a routine name");
      return;
    }

    if (!userToken) {
      toast.error("Please sign in to create routines");
      return;
    }

    // Don't create the routine in database yet - just proceed with the name
    // The routine will be created when the first exercise is successfully added
    toast.success(`Routine "${routineName}" ready - now add exercises`);
    onRoutineCreated(routineName);
  };

  return (
    <div className="bg-background flex flex-col pt-safe">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white/80 backdrop-blur-sm">
        <TactileButton 
          variant="secondary"
          size="sm"
          onClick={onBack}
        >
          <ArrowLeft size={20} />
        </TactileButton>
        <h1 className="font-medium text-[var(--warm-brown)] tracking-wide">NAME YOUR WORKOUT</h1>
        <div className="w-10" /> {/* Spacer for centering */}
      </div>

      {/* Content */}
      <div className="px-4 py-8 space-y-8">
        {/* Name Input */}
        <div>
          <Input
            value={routineName}
            onChange={(e) => setRoutineName(e.target.value)}
            placeholder="Routine Name"
            className="bg-[var(--input-background)] border-[var(--border)] text-[var(--warm-brown)] placeholder:text-[var(--warm-brown)]/60 h-12 text-base rounded-xl focus:border-[var(--warm-coral)] focus:ring-[var(--warm-coral)]/20"
            maxLength={50}
            autoFocus
          />
        </div>

        {/* Add Exercises Button */}
        <div>
          <TactileButton
            onClick={handleCreateRoutine}
            disabled={!routineName.trim()}
            className="w-full h-14 bg-[var(--warm-coral)] hover:bg-[var(--warm-coral)]/90 text-white font-medium text-base rounded-full disabled:opacity-50 disabled:cursor-not-allowed border-0"
          >
            <div className="flex items-center justify-center gap-2">
              <Plus size={20} />
              ADD EXERCISES
            </div>
          </TactileButton>
        </div>
      </div>
    </div>
  );
}