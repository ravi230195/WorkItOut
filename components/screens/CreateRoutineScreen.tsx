// components/screens/CreateRoutineScreen.tsx
import { useState } from "react";
import { Plus } from "lucide-react";
import { Input } from "../ui/input";
import { TactileButton } from "../TactileButton";
import { useAuth } from "../AuthContext";
import { toast } from "sonner";
import { supabaseAPI } from "../../utils/supabase/supabase-api";
import { AppScreen, ScreenHeader, Section, Stack, Spacer } from "../layouts";

interface CreateRoutineScreenProps {
  onBack: () => void;
  /** Pass both name and created routineId to parent */
  onRoutineCreated: (routineName: string, routineId: number) => void;
}

export default function CreateRoutineScreen({
  onBack,
  onRoutineCreated,
}: CreateRoutineScreenProps) {

  const [routineName, setRoutineName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const { userToken } = useAuth();

  const handleCreateRoutine = async () => {
    const name = routineName.trim();
    if (!name) {
      toast.error("Please enter a routine name");
      return;
    }
    if (!userToken) {
      toast.error("Please sign in to create routines");
      return;
    }

    try {
      setIsCreating(true);
      const newRoutine = await supabaseAPI.createUserRoutine(name);
      if (!newRoutine) throw new Error("Failed to create routine");
      onRoutineCreated(name, newRoutine.routine_template_id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create routine";
      toast.error(msg);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <AppScreen
      header={<ScreenHeader title="Create Routine" 
      onBack={onBack} 
      showBorder={false} 
      denseSmall 
      titleClassName="text-[17px] font-bold"/>}
      // Wider on tablets; let AppScreen own horizontal gutters
      maxContent="responsive"
      padContent={false}
      showHeaderBorder={false}
      showBottomBarBorder={false}
      bottomBar={null}
      bottomBarSticky
      contentClassName=""
    >
      <Stack gap="fluid">
        <Spacer y="sm" />

        {/* Input card */}
        <Section variant="card" padding="md" className="space-y-3">
          <Input
            value={routineName}
            onChange={(e) => setRoutineName(e.target.value)}
            placeholder="Routine Name"
            className="bg-input-background border-border text-warm-brown placeholder:text-warm-brown/60 h-12 md:h-12 text-base md:text-lg rounded-xl focus:border-warm-coral focus:ring-warm-coral/20"
            maxLength={50}
            autoFocus
            disabled={isCreating}
          />
        </Section>

        <Spacer y="sm" />

        {/* Primary action (full width on phone, comfy on tablet) */}
        <Section variant="plain" padding="none">
          <TactileButton
            onClick={handleCreateRoutine}
            disabled={!routineName.trim() || isCreating}
            className="w-full h-12 md:h-14 bg-primary hover:bg-primary-hover text-primary-foreground font-medium text-sm md:text-base rounded-full disabled:opacity-50 disabled:cursor-not-allowed border-0"
          >
            <div className="flex items-center justify-center gap-2">
              <Plus size={20} />
              {isCreating ? "CREATING..." : "ADD ROUTINE"}
            </div>
          </TactileButton>
        </Section>
      </Stack>
    </AppScreen>
  );
}