import { useState, useEffect } from "react";
import { MoreHorizontal, FileText, AlertCircle, Plus } from "lucide-react";
import { TactileButton } from "./TactileButton";
import { supabaseAPI, UserRoutine } from "../utils/supabase-api";
import { useAuth } from "./AuthContext";
import { toast } from "sonner";

interface RoutinesScreenProps {
  onCreateRoutine: () => void;
  onSelectRoutine: (routineId: number, routineName: string) => void;
}

export function RoutinesScreen({ onCreateRoutine, onSelectRoutine }: RoutinesScreenProps) {
  const [routines, setRoutines] = useState<UserRoutine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userToken } = useAuth();

  useEffect(() => {
    const fetchRoutines = async () => {
      try {
        setError(null);
        
        if (!userToken) {
          console.log("No user token, skipping routine fetch");
          setIsLoading(false);
          return;
        }

        console.log("Fetching user routines...");
        const routineData = await supabaseAPI.getUserRoutines();
        console.log("Fetched routines:", routineData);
        
        // Filter for active routines
        const activeRoutines = routineData.filter(routine => routine.is_active);
        setRoutines(activeRoutines);
      } catch (error) {
        console.error("Failed to fetch routines:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        setError(errorMessage);
        toast.error("Failed to load routines");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoutines();
  }, [userToken]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--soft-gray)] via-[var(--background)] to-[var(--warm-cream)]/30">
      {/* Header */}
      <div className="safe-area-top pb-6 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-medium text-[var(--warm-brown)] mb-2">
            MY ROUTINES
          </h1>
          <p className="text-[var(--warm-brown)]/60">
            Your workout templates and routines
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 safe-area-bottom">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin mx-auto mb-4 w-8 h-8 border-2 border-[var(--warm-coral)] border-t-transparent rounded-full"></div>
            <p className="text-[var(--warm-brown)]/60">Loading routines...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-lg font-medium text-[var(--warm-brown)] mb-2">
              Error Loading Routines
            </h3>
            <p className="text-red-600 mb-4 text-sm max-w-sm mx-auto">
              {error}
            </p>
            <div className="flex gap-3 justify-center">
              <TactileButton
                onClick={() => window.location.reload()}
                variant="secondary"
                className="px-6 py-2"
              >
                Try Again
              </TactileButton>
              <TactileButton
                onClick={onCreateRoutine}
                className="bg-[var(--warm-coral)] hover:bg-[var(--warm-coral)]/90 text-white px-6 py-2 font-medium"
              >
                Create Routine
              </TactileButton>
            </div>
          </div>
        ) : routines.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[var(--warm-brown)]/60 text-lg">
              Start by adding new routine
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {routines.map((routine) => (
              <div
                key={routine.routine_template_id}
                onClick={() => onSelectRoutine(routine.routine_template_id, routine.name)}
                className="bg-white/80 backdrop-blur-sm rounded-2xl border border-[var(--border)] p-4 shadow-sm hover:shadow-md transition-all cursor-pointer hover:bg-white/90"
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
                    >
                      <MoreHorizontal size={16} />
                    </TactileButton>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Add Routine Button */}
      <div className="fixed right-4 z-50" style={{ bottom: 'max(80px, calc(80px + env(safe-area-inset-bottom)))' }}>
        <TactileButton
          onClick={onCreateRoutine}
          className="w-14 h-14 bg-[var(--warm-coral)] hover:bg-[var(--warm-coral)]/90 text-white rounded-full shadow-lg btn-tactile flex items-center justify-center"
        >
          <Plus size={24} />
        </TactileButton>
      </div>
    </div>
  );
}