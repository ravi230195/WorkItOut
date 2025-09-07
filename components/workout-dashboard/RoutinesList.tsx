import { AlertCircle, Clock3 as Clock, TrendingUp } from "lucide-react";
import { TactileButton } from "../TactileButton";
import { Section } from "../layouts";
import ListItem from "../ui/ListItem";
import { UserRoutine } from "../../utils/supabase/supabase-api";
import { RoutineAccess } from "../../hooks/useAppNavigation";
import { RoutinesView } from "./types";

const avatarPalette = [
  { bg: "bg-soft-gray", iconBg: "bg-warm-coral", emoji: "🏋️" },
  { bg: "bg-[var(--warm-cream)]", iconBg: "bg-[var(--warm-brown)]", emoji: "🏃" },
  { bg: "bg-soft-gray", iconBg: "bg-[var(--warm-sage)]", emoji: "🧘" },
  { bg: "bg-[var(--warm-cream)]", iconBg: "bg-warm-coral", emoji: "🤸" },
  { bg: "bg-soft-gray", iconBg: "bg-[var(--warm-brown)]", emoji: "🔥" },
];

interface RoutinesListProps {
  routines: UserRoutine[];
  routinesError: string | null;
  isLoading: boolean;
  reloadRoutines: () => void;
  view: RoutinesView;
  exerciseCounts: Record<number, number>;
  loadingCounts: boolean;
  canEdit: boolean;
  onSelectRoutine: (id: number, name: string, access?: RoutineAccess) => void;
  openActions: (routine: UserRoutine, e: React.MouseEvent) => void;
}

export default function RoutinesList({
  routines,
  routinesError,
  isLoading,
  reloadRoutines,
  view,
  exerciseCounts,
  loadingCounts,
  canEdit,
  onSelectRoutine,
  openActions,
}: RoutinesListProps) {
  return (
    <Section
      variant="plain"
      padding="none"
      className="space-y-3"
      loading={isLoading}
      loadingBehavior="replace"
    >
      {!isLoading && (
        <>
          {routinesError ? (
            <Section
              variant="card"
              title="Error Loading Routines"
              actions={
                <TactileButton onClick={reloadRoutines} variant="secondary" className="px-4 py-2 text-sm">
                  Try Again
                </TactileButton>
              }
            >
              <div className="text-center py-4">
                <div className="w-12 h-12 mx-auto mb-3 bg-destructive-light rounded-full flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-destructive" />
                </div>
                <p className="text-destructive text-sm">{routinesError}</p>
              </div>
            </Section>
          ) : routines.length === 0 ? (
            <Section variant="card" className="text-center">
              <p className="text-warm-brown/60 text-sm">
                {view === RoutinesView.My ? "Start by adding a new routine" : "No sample routines found"}
              </p>
            </Section>
          ) : (
            <div className="space-y-3">
              {routines.map((routine, idx) => {
                const palette = avatarPalette[idx % avatarPalette.length];
                const muscleGroups = ((routine as any).muscle_group_summary as string | undefined)?.trim() || "—";
                const exerciseCount = exerciseCounts[routine.routine_template_id] ?? 0;
                const timeMin = exerciseCount > 0 ? exerciseCount * 10 : null;
                const access = view === RoutinesView.My ? RoutineAccess.Editable : RoutineAccess.ReadOnly;
                return (
                  <button
                    key={routine.routine_template_id}
                    onClick={() =>
                      onSelectRoutine(routine.routine_template_id, routine.name, access)
                    }
                    className="w-full rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-all text-left"
                  >
                    <ListItem
                      leading={
                        <div className={`w-8 h-8 ${palette.iconBg} rounded-lg grid place-items-center text-primary-foreground text-lg`}>
                          <span>{palette.emoji}</span>
                        </div>
                      }
                      leadingClassName={`w-12 h-12 rounded-xl flex items-center justify-center ${palette.bg}`}
                      primary={routine.name}
                      secondary={muscleGroups}
                      tertiary={
                        <div className="mt-2 flex items-center gap-4 text-warm-brown/70">
                          <span className="inline-flex items-center gap-1">
                            <Clock size={14} />
                            {loadingCounts ? "—" : timeMin !== null ? `${timeMin} min` : "—"}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <TrendingUp size={14} />
                            {loadingCounts ? "—" : `${exerciseCount} exercise${exerciseCount === 1 ? "" : "s"}`}
                          </span>
                        </div>
                      }
                      primaryClassName="font-medium text-warm-brown text-[clamp(16px,4.5vw,19px)]"
                      secondaryClassName="text-[clamp(11px,3.2vw,12px)] text-warm-brown/60"
                      tertiaryClassName="text-[clamp(11px,3.2vw,12px)]"
                      className="p-4"
                      rightIcon={canEdit ? "kebab" : undefined}
                      onRightIconClick={(e) => openActions(routine, e)}
                    />
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </Section>
  );
}
