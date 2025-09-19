diff --git a/components/screens/WorkoutDashboardScreen.tsx b/components/screens/WorkoutDashboardScreen.tsx
index 7f45d61159fa88fbe6b7f167b598ecac01ef1b6e..f473c72e612fd92ef88d74a4ccb6b292b892c793 100644
--- a/components/screens/WorkoutDashboardScreen.tsx
+++ b/components/screens/WorkoutDashboardScreen.tsx
@@ -1,37 +1,36 @@
 import { useState, useEffect } from "react";
 import { Dumbbell, Ruler } from "lucide-react";
 import { useStepTracking } from "../../hooks/useStepTracking";
 import { supabaseAPI, UserRoutine, Profile } from "../../utils/supabase/supabase-api";
 import { useAuth } from "../AuthContext";
 import ProgressRings from "../circularStat/ProgressRings";
 import { AppScreen, Section, ScreenHeader, Stack, Spacer } from "../layouts";
 import SegmentedToggle from "../segmented/SegmentedToggle";
 import { RoutineAccess } from "../../hooks/useAppNavigation";
 import { logger } from "../../utils/logging";
 import { performanceTimer } from "../../utils/performanceTimer";
-import { loadRoutineExercisesWithSets } from "../../utils/routineLoader";
 import FabSpeedDial from "../FabSpeedDial";
 import RoutinesList from "../workout-dashboard/RoutinesList";
 import RoutineActionSheet from "../workout-dashboard/RoutineActionSheet";
 import { RoutinesView } from "../workout-dashboard/types";
 
 interface WorkoutDashboardScreenProps {
   onCreateRoutine: () => void;
   onEditMeasurements: () => void;
   onSelectRoutine: (routineId: number, routineName: string, access?: RoutineAccess) => void;
   onOverlayChange?: (open: boolean) => void;
   bottomBar?: React.ReactNode;
 }
 
 export default function WorkoutDashboardScreen({
   onCreateRoutine,
   onEditMeasurements,
   onSelectRoutine,
   onOverlayChange,
   bottomBar
 }: WorkoutDashboardScreenProps) {
   const { userToken } = useAuth();
 
   const [view, setView] = useState<RoutinesView>(RoutinesView.My);
   const [routines, setRoutines] = useState<UserRoutine[]>([]);
   const [isLoadingRoutines, setIsLoadingRoutines] = useState(true);
@@ -81,129 +80,200 @@ export default function WorkoutDashboardScreen({
 
   // Load profile for personalized greeting
   useEffect(() => {
     const fetchProfile = async () => {
       if (!userToken) return;
       try {
         const p = await supabaseAPI.getMyProfile();
         setProfile(p);
       } catch (e) {
         logger.error("Failed to load profile for dashboard greeting", e);
       }
     };
     fetchProfile();
   }, [userToken]);
 
   const getFirstName = () => {
     if (profile?.first_name && profile.first_name.trim() !== "") {
       return profile.first_name.split(" ")[0];
     }
     if (profile?.display_name && profile.display_name.trim() !== "") {
       return profile.display_name.split(" ")[0];
     }
     return null;
   };
 
+  const getStoredExerciseCount = (routine: UserRoutine): number | null => {
+    const rawCount = (routine as any).exercise_count ?? (routine as any).exersise_count;
+    const parsed = typeof rawCount === "string" ? Number(rawCount) : rawCount;
+    if (typeof parsed !== "number" || Number.isNaN(parsed) || parsed < 0) {
+      return null;
+    }
+    return parsed;
+  };
+
   // compute exercise counts for each routine (for time display)
   useEffect(() => {
-
     let cancelled = false;
+
     const fetchExerciseCounts = async () => {
-      const timer = performanceTimer.start('fetchExerciseCounts');
+      const timer = performanceTimer.start("fetchExerciseCounts");
 
       if (routines.length === 0) {
         logger.debug("🔍 DGB [WORKOUT_SCREEN] No routines, skipping");
-        setExerciseCounts({});
+        if (!cancelled) {
+          setExerciseCounts({});
+          setLoadingCounts(false);
+        }
         timer.endWithLog();
         return;
       }
-      setLoadingCounts(true);
-      try {
-        const results = await Promise.all(
-          routines.map(async (r) => {
-            const routineTimer = performanceTimer.start(`fetchExerciseCounts - routine ${r.routine_template_id}`);
-
-            logger.debug("🔍 DGB [WORKOUT_SCREEN] Processing routine:", r.routine_template_id, "name:", r.name);
-            const active = await loadRoutineExercisesWithSets(r.routine_template_id, { timer: performanceTimer });
-            //logger.debug("🔍 DGB [WORKOUT_SCREEN] Raw list from API:", active);
-            //logger.debug("🔍 DGB [WORKOUT_SCREEN] List length:", active?.length, "isArray:", Array.isArray(active));
-
-            let needsRecomp = false;
-            if (canEdit) {
-              const summary = (r as any).muscle_group_summary as string | undefined;
-              // Only recompute if there are active exercises AND no summary
-              if (active.length > 0 && (!summary || summary.trim() === "")) {
-                logger.info("🔍 DGB [WORKOUT_SCREEN] Routine needs recompute:", r.routine_template_id, "summary:", summary, "active exercises:", active.length);
-                needsRecomp = true;
-              } else if (active.length === 0) {
-                logger.debug("🔍 DGB [WORKOUT_SCREEN] Routine has 0 active exercises, skipping recompute:", r.routine_template_id, "summary:", summary);
-              }
-            }
 
-            routineTimer.endWithLog();
-            return { id: r.routine_template_id, count: active.length, needsRecompute: needsRecomp };
-          })
-        );
+      if (!cancelled) setLoadingCounts(true);
 
-        const entries = results.map(({ id, count }) => [id, count] as [number, number]);
-        const needsRecompute = results.filter(r => r.needsRecompute).map(r => r.id);
+      try {
+        const countsById = new Map<number, number>();
+        const routinesNeedingFallback: UserRoutine[] = [];
+
+        routines.forEach((routine) => {
+          const stored = getStoredExerciseCount(routine);
+          if (stored != null) {
+            countsById.set(routine.routine_template_id, stored);
+          } else {
+            routinesNeedingFallback.push(routine);
+          }
+        });
 
-        if (!cancelled) setExerciseCounts(Object.fromEntries(entries));
+        if (routinesNeedingFallback.length > 0) {
+          logger.debug(
+            "🔍 DGB [WORKOUT_SCREEN] Fetching exercise counts via fallback for routines:",
+            routinesNeedingFallback.map((r) => r.routine_template_id)
+          );
 
-        // only recompute summaries for "my" data
-        if (canEdit && needsRecompute.length > 0) {
-          const recomputeTimer = performanceTimer.start('fetchExerciseCounts - muscle summary recompute');
+          const fallbackResults = await Promise.all(
+            routinesNeedingFallback.map(async (routine) => {
+              const routineTimer = performanceTimer.start(
+                `fetchExerciseCounts - routine ${routine.routine_template_id}`
+              );
+              try {
+                const exercises = await supabaseAPI.getUserRoutineExercises(
+                  routine.routine_template_id
+                );
+                const count = Array.isArray(exercises) ? exercises.length : 0;
+                return { id: routine.routine_template_id, count };
+              } finally {
+                routineTimer.endWithLog();
+              }
+            })
+          );
 
-          logger.debug("🔍 DGB [WORKOUT_SCREEN] Triggering muscle summary recompute for routines:", needsRecompute);
-          logger.debug("🔍 DGB [WORKOUT_SCREEN] canEdit:", canEdit, "needsRecompute count:", needsRecompute.length);
+          fallbackResults.forEach(({ id, count }) => {
+            countsById.set(id, count);
+          });
+        }
+
+        if (!cancelled) {
+          setExerciseCounts(Object.fromEntries(countsById));
+        }
 
-          const results = await Promise.allSettled(
-            needsRecompute.map((id) => {
-              logger.debug("🔍 DGB [WORKOUT_SCREEN] Calling recomputeAndSaveRoutineMuscleSummary for routine ID:", id);
-              return supabaseAPI.recomputeAndSaveRoutineMuscleSummary(id);
+        if (canEdit) {
+          const routinesRequiringUpdate = routines
+            .filter((routine) => {
+              const summary = ((routine as any).muscle_group_summary as string | undefined)?.trim();
+              const storedCount = getStoredExerciseCount(routine);
+              const count = countsById.get(routine.routine_template_id) ?? storedCount ?? 0;
+              const needsSummary = count > 0 && (!summary || summary.length === 0);
+              const needsCount = storedCount == null;
+              return needsSummary || needsCount;
             })
-          );
-          if (!cancelled) {
-            logger.debug("🔍 DGB [WORKOUT_SCREEN] Muscle summary recompute completed, results:", results);
-            // Since recomputeAndSaveRoutineMuscleSummary returns void, we just check if it succeeded
-            const successfulCount = results.filter(res => res.status === "fulfilled").length;
-            logger.debug("🔍 DGB [WORKOUT_SCREEN] Successful recomputes:", successfulCount, "out of", needsRecompute.length);
-
-            if (successfulCount > 0) {
-              logger.debug("🔍 DGB [WORKOUT_SCREEN] Muscle summary recompute completed successfully");
-              logger.debug("🔍 DGB [WORKOUT_SCREEN] No need to trigger routine state update - let cache handle it");
-              // Don't trigger setRoutines here - it causes infinite loop!
+            .map((routine) => routine.routine_template_id);
+
+          if (routinesRequiringUpdate.length > 0) {
+            const recomputeTimer = performanceTimer.start(
+              "fetchExerciseCounts - muscle summary recompute"
+            );
+
+            logger.debug(
+              "🔍 DGB [WORKOUT_SCREEN] Triggering muscle summary recompute for routines:",
+              routinesRequiringUpdate
+            );
+            logger.debug(
+              "🔍 DGB [WORKOUT_SCREEN] canEdit:",
+              canEdit,
+              "needsRecompute count:",
+              routinesRequiringUpdate.length
+            );
+
+            const results = await Promise.allSettled(
+              routinesRequiringUpdate.map((id) => {
+                logger.debug(
+                  "🔍 DGB [WORKOUT_SCREEN] Calling recomputeAndSaveRoutineMuscleSummary for routine ID:",
+                  id
+                );
+                return supabaseAPI.recomputeAndSaveRoutineMuscleSummary(id);
+              })
+            );
+
+            if (!cancelled) {
+              logger.debug(
+                "🔍 DGB [WORKOUT_SCREEN] Muscle summary recompute completed, results:",
+                results
+              );
+
+              const successfulCount = results.filter((res) => res.status === "fulfilled").length;
+              logger.debug(
+                "🔍 DGB [WORKOUT_SCREEN] Successful recomputes:",
+                successfulCount,
+                "out of",
+                routinesRequiringUpdate.length
+              );
+
+              let updated = false;
+              const updatedCounts = new Map(countsById);
+              results.forEach((res, index) => {
+                if (res.status === "fulfilled" && res.value) {
+                  const recomputed = res.value.exercise_count;
+                  if (typeof recomputed === "number" && !Number.isNaN(recomputed)) {
+                    updatedCounts.set(routinesRequiringUpdate[index], recomputed);
+                    updated = true;
+                  }
+                }
+              });
+
+              if (updated) {
+                setExerciseCounts(Object.fromEntries(updatedCounts));
+              }
             }
-          }
 
-          recomputeTimer.endWithLog();
+            recomputeTimer.endWithLog();
+          }
         }
       } catch (e) {
         logger.error("Failed to load exercise counts / recompute summaries", e);
       } finally {
         if (!cancelled) setLoadingCounts(false);
-        timer.endWithLog(); // Main function timing at INFO level
+        timer.endWithLog();
       }
     };
 
     fetchExerciseCounts();
     return () => {
       cancelled = true;
     };
   }, [routines, canEdit]);
 
   useEffect(() => {
     return () => {
       if (actionRoutine) onOverlayChange?.(false);
     };
     // eslint-disable-next-line react-hooks/exhaustive-deps
   }, []);
 
   const openActions = (routine: UserRoutine, e: React.MouseEvent) => {
     if (!canEdit) return; // hide in sample view
     e.stopPropagation();
     setActionRoutine(routine);
     onOverlayChange?.(true);
   };
   const closeActions = () => {
     setActionRoutine(null);
     onOverlayChange?.(false);
diff --git a/components/workout-dashboard/RoutinesList.tsx b/components/workout-dashboard/RoutinesList.tsx
index b81796fbc92b58f84c6796e169c3ffee3e332043..96f276cf131c1c7fa9630ecf7700462031e880e0 100644
--- a/components/workout-dashboard/RoutinesList.tsx
+++ b/components/workout-dashboard/RoutinesList.tsx
@@ -55,51 +55,57 @@ export default function RoutinesList({
               title="Error Loading Routines"
               actions={
                 <TactileButton onClick={reloadRoutines} variant="secondary" className="px-4 py-2 text-sm rounded-xl border-0 font-medium">
                   Try Again
                 </TactileButton>
               }
             >
               <div className="text-center py-4">
                 <div className="w-12 h-12 mx-auto mb-3 bg-destructive-light rounded-full flex items-center justify-center">
                   <AlertCircle className="w-5 h-5 text-black" />
                 </div>
                 <p className="text-black text-sm">{routinesError}</p>
               </div>
             </Section>
           ) : routines.length === 0 ? (
             <Section variant="card" className="text-center">
               <p className="text-black text-sm">
                 {view === RoutinesView.My ? "Start by adding a new routine" : "No sample routines found"}
               </p>
             </Section>
           ) : (
             <div className="space-y-3">
               {routines.map((routine, idx) => {
                 const palette = avatarPalette[idx % avatarPalette.length];
                 const muscleGroups = ((routine as any).muscle_group_summary as string | undefined)?.trim() || "—";
-                const exerciseCount = exerciseCounts[routine.routine_template_id] ?? 0;
+                const storedCount = (routine as any).exercise_count ?? (routine as any).exersise_count;
+                const parsedStored = typeof storedCount === "string" ? Number(storedCount) : storedCount;
+                const exerciseCount =
+                  exerciseCounts[routine.routine_template_id] ??
+                  (typeof parsedStored === "number" && !Number.isNaN(parsedStored) && parsedStored >= 0
+                    ? parsedStored
+                    : 0);
                 const timeMin = exerciseCount > 0 ? exerciseCount * 10 : null;
                 const access = view === RoutinesView.My ? RoutineAccess.Editable : RoutineAccess.ReadOnly;
                 return (
                   <button
                     key={routine.routine_template_id}
                     onClick={() =>
                       onSelectRoutine(routine.routine_template_id, routine.name, access)
                     }
                     className="w-full rounded-2xl border border-border card-modern shadow-xl hover:shadow-xl transition-all text-left"
                     style={{border: "2px solid var(--border)"}}
                   >
                     <ListItem
                       leading={
                         <div className={`w-8 h-8 ${palette.iconBg} rounded-lg grid place-items-center text-black text-lg`}>
                           <span>{palette.emoji}</span>
                         </div>
                       }
                       leadingClassName={`w-12 h-12 rounded-xl flex items-center justify-center ${palette.bg}`}
                       primary={routine.name}
                       secondary={muscleGroups}
                       tertiary={
                         <div className="mt-2 flex items-center gap-4 text-black">
                           <span className="inline-flex items-center gap-1">
                             <Clock size={14} />
                             {loadingCounts ? "—" : timeMin !== null ? `${timeMin} min` : "—"}
diff --git a/test/journalRunner.test.ts b/test/journalRunner.test.ts
index 47e978dcd309c00432d91e7ef220fa95ada85692..cfaf749867194a6c4042ebb62652b31b7a50da57 100644
--- a/test/journalRunner.test.ts
+++ b/test/journalRunner.test.ts
@@ -1,34 +1,37 @@
 jest.mock('../utils/supabase/supabase-api', () => ({
   supabaseAPI: {
     deleteRoutineExercise: jest.fn().mockResolvedValue(undefined),
     deleteExerciseSet: jest.fn().mockResolvedValue(undefined),
     updateExerciseSet: jest.fn().mockResolvedValue(undefined),
     updateExerciseSetOrder: jest.fn().mockResolvedValue(undefined),
     addExerciseToRoutine: jest.fn().mockResolvedValue(undefined),
     addExerciseSetsToRoutine: jest.fn().mockResolvedValue(undefined),
-    recomputeAndSaveRoutineMuscleSummary: jest.fn().mockResolvedValue(undefined),
+    recomputeAndSaveRoutineMuscleSummary: jest.fn().mockResolvedValue({
+      muscle_group_summary: null,
+      exercise_count: 0,
+    }),
   },
 }));
 
 import { runJournal } from '../components/routine-editor/journalRunner';
 import type { SavePlan } from '../components/routine-editor/collapseJournal';
 import type { ExIdMap } from '../components/routine-editor/journalRunner';
 import { supabaseAPI } from '../utils/supabase/supabase-api';
 
 test('runJournal skips creating exercises without set payloads', async () => {
   const plan: SavePlan = {
     deleteExercises: [],
     deleteSets: [],
     updateSets: [],
     orderSets: [],
     createExercises: [
       { tempExId: -1, exerciseId: 1, order: 1, name: 'Test' },
     ],
     createSetsByExercise: {},
   };
   const exMap: ExIdMap = { [-1]: { exerciseId: 1 } };
 
   await runJournal(plan, 1, exMap);
 
   expect(supabaseAPI.addExerciseToRoutine).not.toHaveBeenCalled();
 });
diff --git a/test/routineLoader.test.ts b/test/routineLoader.test.ts
index 7a34ce736455dd5d0987d667a5bd570ea0285357..fb7d501a07e56fb79ade16a865e45bb7c03af19d 100644
--- a/test/routineLoader.test.ts
+++ b/test/routineLoader.test.ts
@@ -1,174 +1,186 @@
 import { loadRoutineExercisesWithSets } from "../utils/routineLoader";
 import { supabaseAPI } from "../utils/supabase/supabase-api";
 import { performanceTimer } from "../utils/performanceTimer";
 
 jest.mock("../utils/supabase/supabase-api", () => ({
   supabaseAPI: {
     getUserRoutineExercisesWithDetails: jest.fn(),
     getExercise: jest.fn(),
     getExerciseSetsForRoutine: jest.fn(),
+    getExerciseSetsForRoutineBulk: jest.fn(),
   },
 }));
 
 const api = supabaseAPI as jest.Mocked<typeof supabaseAPI>;
 
 describe("loadRoutineExercisesWithSets", () => {
   beforeEach(() => {
     jest.clearAllMocks();
+    api.getExerciseSetsForRoutineBulk.mockResolvedValue(new Map());
   });
 
-  test("limits concurrent set fetches", async () => {
+  test("fetches sets for all exercises in a single bulk call", async () => {
     const rows = Array.from({ length: 5 }, (_, i) => ({
       routine_template_exercise_id: i + 1,
       routine_template_id: 1,
       exercise_id: i + 1,
       exercise_name: `Ex${i + 1}`,
       muscle_group: "mg",
       exercise_order: i + 1,
       is_active: true,
     }));
     api.getUserRoutineExercisesWithDetails.mockResolvedValue(rows as any);
     api.getExercise.mockResolvedValue(null as any);
 
-    let active = 0;
-    let maxConcurrent = 0;
-    api.getExerciseSetsForRoutine.mockImplementation(async (id: number) => {
-      active++;
-      maxConcurrent = Math.max(maxConcurrent, active);
-      await new Promise((r) => setTimeout(r, 5));
-      active--;
-      return [
+    const bulkMap = new Map<number, any>();
+    rows.forEach((row) => {
+      bulkMap.set(row.routine_template_exercise_id, [
         {
-          routine_template_exercise_set_id: id * 10,
-          routine_template_exercise_id: id,
-          exercise_id: id,
+          routine_template_exercise_set_id: row.routine_template_exercise_id * 10,
+          routine_template_exercise_id: row.routine_template_exercise_id,
+          exercise_id: row.exercise_id,
           set_order: 1,
           is_active: true,
           planned_reps: 5,
           planned_weight_kg: 10,
         },
-      ];
+      ]);
     });
+    api.getExerciseSetsForRoutineBulk.mockResolvedValue(bulkMap as any);
 
     const res = await loadRoutineExercisesWithSets(1, {
       concurrency: 2,
       timer: performanceTimer,
     });
 
+    expect(api.getExerciseSetsForRoutineBulk).toHaveBeenCalledTimes(1);
+    expect(api.getExerciseSetsForRoutineBulk).toHaveBeenCalledWith(
+      rows.map((r) => r.routine_template_exercise_id)
+    );
+    expect(api.getExerciseSetsForRoutine).not.toHaveBeenCalled();
     expect(res).toHaveLength(5);
-    expect(maxConcurrent).toBeLessThanOrEqual(2);
+    expect(res.every((r) => r.sets.length === 1)).toBe(true);
   });
 
   test("hydrates metadata and sorts sets", async () => {
     const rows = [
       {
         routine_template_exercise_id: 1,
         routine_template_id: 1,
         exercise_id: 10,
         exercise_name: null,
         muscle_group: null,
         exercise_order: 1,
         is_active: true,
       },
       {
         routine_template_exercise_id: 2,
         routine_template_id: 1,
         exercise_id: 20,
         exercise_name: "Name",
         muscle_group: "Group",
         exercise_order: 2,
         is_active: true,
       },
     ];
     api.getUserRoutineExercisesWithDetails.mockResolvedValue(rows as any);
     api.getExercise.mockResolvedValue({
       exercise_id: 10,
       name: "MetaName",
       muscle_group: "MetaGroup",
     } as any);
 
-    api.getExerciseSetsForRoutine.mockImplementation(async (id: number) => {
-      if (id === 1)
-        return [
+    const bulkMap = new Map<number, any>([
+      [
+        1,
+        [
           {
             routine_template_exercise_set_id: 11,
             routine_template_exercise_id: 1,
             exercise_id: 10,
             set_order: 2,
             is_active: true,
             planned_reps: 5,
             planned_weight_kg: 10,
           },
           {
             routine_template_exercise_set_id: 12,
             routine_template_exercise_id: 1,
             exercise_id: 10,
             set_order: 1,
             is_active: true,
             planned_reps: 5,
             planned_weight_kg: 10,
           },
-        ];
-      return [
-        {
-          routine_template_exercise_set_id: 21,
-          routine_template_exercise_id: 2,
-          exercise_id: 20,
-          set_order: 1,
-          is_active: true,
-          planned_reps: 8,
-          planned_weight_kg: 20,
-        },
-      ];
-    });
+        ],
+      ],
+      [
+        2,
+        [
+          {
+            routine_template_exercise_set_id: 21,
+            routine_template_exercise_id: 2,
+            exercise_id: 20,
+            set_order: 1,
+            is_active: true,
+            planned_reps: 8,
+            planned_weight_kg: 20,
+          },
+        ],
+      ],
+    ]);
+    api.getExerciseSetsForRoutineBulk.mockResolvedValue(bulkMap as any);
 
     const res = await loadRoutineExercisesWithSets(1, {
       concurrency: 2,
       timer: performanceTimer,
     });
 
     expect(res[0].name).toBe("MetaName");
     expect(res[0].muscle_group).toBe("MetaGroup");
     expect(res[0].sets.map((s) => s.set_order)).toEqual([1, 2]);
     expect(res[1].name).toBe("Name");
   });
 
   test("handles individual fetch failures", async () => {
     const rows = [
       {
         routine_template_exercise_id: 1,
         routine_template_id: 1,
         exercise_id: 10,
         exercise_name: null,
         muscle_group: "MG",
         exercise_order: 1,
         is_active: true,
       },
       {
         routine_template_exercise_id: 2,
         routine_template_id: 1,
         exercise_id: 20,
         exercise_name: "B",
         muscle_group: "MG2",
         exercise_order: 2,
         is_active: true,
       },
     ];
     api.getUserRoutineExercisesWithDetails.mockResolvedValue(rows as any);
     api.getExercise.mockRejectedValue(new Error("meta fail"));
+    api.getExerciseSetsForRoutineBulk.mockRejectedValue(new Error("bulk fail"));
     api.getExerciseSetsForRoutine.mockImplementation(async (id: number) => {
       if (id === 1) return [];
       throw new Error("set fail");
     });
 
     const res = await loadRoutineExercisesWithSets(1, {
       concurrency: 2,
       timer: performanceTimer,
     });
 
+    expect(api.getExerciseSetsForRoutineBulk).toHaveBeenCalled();
+    expect(api.getExerciseSetsForRoutine).toHaveBeenCalledTimes(2);
     expect(res).toHaveLength(2);
     expect(res[0].name).toBe("");
     expect(res[0].sets).toEqual([]);
     expect(res[1].sets).toEqual([]);
   });
 });
diff --git a/utils/routineLoader.ts b/utils/routineLoader.ts
index b4134e6a7c90ab34f9c9cf5d75d4d92950e38e1e..8bd1bb549c56dec6c10b182fd16a71811428c2a2 100644
--- a/utils/routineLoader.ts
+++ b/utils/routineLoader.ts
@@ -41,77 +41,116 @@ export async function loadRoutineExercisesWithSets(
 
   try {
     const exerciseTimer = timer.start("routineLoader - fetch routine exercises");
     const rows = (await supabaseAPI.getUserRoutineExercisesWithDetails(
       routineId
     )) as SavedExerciseWithDetails[];
     exerciseTimer.endWithLog();
 
     const metaTimer = timer.start("routineLoader - fetch exercise meta");
     const metaById = new Map<number, Exercise>();
     await Promise.all(
       rows.map(async (r) => {
         const hasName = !!normalizeField(r.exercise_name);
         const hasMG = !!normalizeField(r.muscle_group);
         if (hasName && hasMG) return;
         try {
           const meta = await supabaseAPI.getExercise(r.exercise_id);
           if (meta) metaById.set(r.exercise_id, meta as Exercise);
         } catch (err) {
           logger.warn("Failed to fetch exercise meta", r.exercise_id, err);
         }
       })
     );
     metaTimer.endWithLog();
 
-    const batches: SavedExerciseWithDetails[][] = [];
-    for (let i = 0; i < rows.length; i += concurrency) {
-      batches.push(rows.slice(i, i + concurrency));
-    }
+    const toLoadedSets = (setRows?: UserRoutineExerciseSet[]): LoadedSet[] =>
+      (setRows ?? [])
+        .filter((set): set is UserRoutineExerciseSet => !!set && set.is_active !== false)
+        .slice()
+        .sort((a, b) => (a.set_order ?? 0) - (b.set_order ?? 0))
+        .map((s) => ({
+          id: s.routine_template_exercise_set_id,
+          set_order: s.set_order ?? 0,
+          reps: String(s.planned_reps ?? "0"),
+          weight: String(s.planned_weight_kg ?? "0"),
+        }));
+
+    const fetchSetsIndividually = async (): Promise<Map<number, LoadedSet[]>> => {
+      const setsMap = new Map<number, LoadedSet[]>();
+      for (let i = 0; i < rows.length; i += concurrency) {
+        const batch = rows.slice(i, i + concurrency);
+        const setsBatch = await Promise.all(
+          batch.map((r) =>
+            supabaseAPI
+              .getExerciseSetsForRoutine(r.routine_template_exercise_id)
+              .then((setRows) => toLoadedSets(setRows as UserRoutineExerciseSet[]))
+              .catch((err) => {
+                logger.warn(
+                  "Failed to fetch sets for",
+                  r.routine_template_exercise_id,
+                  err
+                );
+                return [] as LoadedSet[];
+              })
+          )
+        );
 
-    const results: LoadedExercise[] = [];
-    for (const batch of batches) {
-      const setsBatch = await Promise.all(
-        batch.map((r) =>
-          supabaseAPI
-            .getExerciseSetsForRoutine(r.routine_template_exercise_id)
-            .then((rows) =>
-              (rows as UserRoutineExerciseSet[])
-                .sort((a, b) => (a.set_order || 0) - (b.set_order || 0))
-                .map((s) => ({
-                  id: s.routine_template_exercise_set_id,
-                  set_order: s.set_order ?? 0,
-                  reps: String(s.planned_reps ?? "0"),
-                  weight: String(s.planned_weight_kg ?? "0"),
-                }))
-            )
-            .catch((err) => {
-              logger.warn("Failed to fetch sets for", r.routine_template_exercise_id, err);
-              return [] as LoadedSet[];
-            })
-        )
-      );
-
-      batch.forEach((r, idx) => {
-        const nameDb = normalizeField(r.exercise_name);
-        const mgDb = normalizeField(r.muscle_group);
-        const meta = !nameDb || !mgDb ? metaById.get(r.exercise_id) : undefined;
-        const name = nameDb || normalizeField(meta?.name);
-        const mg = mgDb || normalizeField(meta?.muscle_group);
-
-        results.push({
-          templateId: r.routine_template_exercise_id,
-          exerciseId: r.exercise_id,
-          name,
-          muscle_group: mg || undefined,
-          sets: setsBatch[idx],
+        batch.forEach((r, idx) => {
+          setsMap.set(r.routine_template_exercise_id, setsBatch[idx]);
         });
-      });
+      }
+      return setsMap;
+    };
+
+    const exerciseIds = rows.map((r) => r.routine_template_exercise_id);
+    let setsByExercise = new Map<number, LoadedSet[]>();
+
+    if (exerciseIds.length > 0) {
+      const bulkTimer = timer.start("routineLoader - fetch routine sets (bulk)");
+      let bulkMap: Map<number, UserRoutineExerciseSet[]> | undefined;
+      try {
+        bulkMap = await supabaseAPI.getExerciseSetsForRoutineBulk(exerciseIds);
+      } catch (err) {
+        logger.warn("Failed to fetch routine sets in bulk; falling back", err);
+      } finally {
+        bulkTimer.endWithLog();
+      }
+
+      if (bulkMap && typeof bulkMap.get === "function") {
+        setsByExercise = new Map(
+          exerciseIds.map((id) => [id, toLoadedSets(bulkMap!.get(id))])
+        );
+      } else {
+        if (bulkMap && typeof (bulkMap as any).get !== "function") {
+          logger.warn("Bulk routine set fetch returned unexpected shape", bulkMap);
+        }
+        const fallbackTimer = timer.start("routineLoader - fetch routine sets (fallback)");
+        try {
+          setsByExercise = await fetchSetsIndividually();
+        } finally {
+          fallbackTimer.endWithLog();
+        }
+      }
     }
 
-    return results;
+    return rows.map((r) => {
+      const nameDb = normalizeField(r.exercise_name);
+      const mgDb = normalizeField(r.muscle_group);
+      const meta = !nameDb || !mgDb ? metaById.get(r.exercise_id) : undefined;
+      const name = nameDb || normalizeField(meta?.name);
+      const mg = mgDb || normalizeField(meta?.muscle_group);
+
+      return {
+        templateId: r.routine_template_exercise_id,
+        exerciseId: r.exercise_id,
+        name,
+        muscle_group: mg || undefined,
+        sets: setsByExercise.get(r.routine_template_exercise_id) ?? [],
+      };
+    });
   } finally {
     mainTimer.endWithLog();
   }
 }
 
 export default loadRoutineExercisesWithSets;
diff --git a/utils/supabase/supabase-api.ts b/utils/supabase/supabase-api.ts
index 34e8bb4a509897dbe9d888003d2d14c235743607..19377995d865fa29de7a1717f38df53386e3e735 100644
--- a/utils/supabase/supabase-api.ts
+++ b/utils/supabase/supabase-api.ts
@@ -1,40 +1,43 @@
 import SupabaseDBRead from "./supabase-db-read";
 import SupabaseDBWrite from "./supabase-db-write";
 import { isHardDeleteEnabled } from "../delete-config";
 
 // Mix the read methods into the write class so one instance exposes both.
 // (Public API remains: `supabaseAPI.method(...)` everywhere.)
 class SupabaseAPI extends SupabaseDBWrite {
   async deleteRoutine(routineTemplateId: number): Promise<void> {
     if (isHardDeleteEnabled()) return this.hardDeleteRoutine(routineTemplateId);
     return super.deleteRoutine(routineTemplateId);
   }
 
-  async deleteRoutineExercise(routineTemplateExerciseId: number): Promise<void> {
-    if (isHardDeleteEnabled()) return this.hardDeleteRoutineExercise(routineTemplateExerciseId);
-    return super.deleteRoutineExercise(routineTemplateExerciseId);
+  async deleteRoutineExercise(
+    routineTemplateExerciseId: number,
+    opts: { skipSummaryUpdate?: boolean } = {}
+  ): Promise<void> {
+    if (isHardDeleteEnabled()) return this.hardDeleteRoutineExercise(routineTemplateExerciseId, opts);
+    return super.deleteRoutineExercise(routineTemplateExerciseId, opts);
   }
 
   async deleteExerciseSet(routineTemplateExerciseSetId: number): Promise<void> {
     if (isHardDeleteEnabled()) return this.hardDeleteExerciseSet(routineTemplateExerciseSetId);
     return super.deleteExerciseSet(routineTemplateExerciseSetId);
   }
 }
 interface SupabaseAPI extends SupabaseDBRead {}
 function applyMixins(derivedCtor: any, baseCtors: any[]) {
   baseCtors.forEach((baseCtor) => {
     Object.getOwnPropertyNames(baseCtor.prototype).forEach((name) => {
       if (name !== "constructor") {
         Object.defineProperty(
           derivedCtor.prototype,
           name,
           Object.getOwnPropertyDescriptor(baseCtor.prototype, name) || Object.create(null)
         );
       }
     });
   });
 }
 applyMixins(SupabaseAPI, [SupabaseDBRead]);
 
 // Small helpers you already had
 export const isExerciseMappingReady = (): boolean => true;
diff --git a/utils/supabase/supabase-db-read.ts b/utils/supabase/supabase-db-read.ts
index ea2c29f2b5fb24890f9b8392e3533fa6f0985246..b516be233773b9fb17abafbed8bd9f67f5e4db08 100644
--- a/utils/supabase/supabase-db-read.ts
+++ b/utils/supabase/supabase-db-read.ts
@@ -134,55 +134,109 @@ export class SupabaseDBRead extends SupabaseBase {
   async getUserRoutineExercisesWithDetails(
     routineTemplateId: number
   ): Promise<Array<UserRoutineExercise & { exercise_name?: string; category?: string }>> {
     const userId = await this.getUserId();
     const url = `${SUPABASE_URL}/rest/v1/user_routine_exercises_data?routine_template_id=eq.${routineTemplateId}&select=*,exercises(name,category)`;
     const key = this.keyRoutineExercisesWithDetails(userId, routineTemplateId);
 
     // Use standardized getOrFetchAndCache like other functions with post-filter for active exercises
     const { data: raw } = await this.getOrFetchAndCache<any[]>(url, key, CACHE_TTL.routineExercisesWithDetails, true,
       (data: any[]) => data.filter(ex => ex.is_active === true)
     );
     
     // Flatten the data after caching
     const flattened = raw.map((ex: any) => ({
       ...ex,
       exercise_name: ex.exercises?.name || "Unknown Exercise",
       category: ex.exercises?.category || "Unknown",
       muscle_group: ex.exercises?.muscle_group || "Unknown",
     }));
 
     return flattened;
   }
 
   // Sets per routine exercise
   async getExerciseSetsForRoutine(routineTemplateExerciseId: number): Promise<UserRoutineExerciseSet[]> {
+    const result = await this.getExerciseSetsForRoutineBulk([routineTemplateExerciseId]);
+    return result.get(routineTemplateExerciseId) ?? [];
+  }
+
+  async getExerciseSetsForRoutineBulk(
+    routineTemplateExerciseIds: number[]
+  ): Promise<Map<number, UserRoutineExerciseSet[]>> {
+    const uniqueIds = Array.from(
+      new Set(
+        routineTemplateExerciseIds.filter(
+          (id): id is number => typeof id === "number" && Number.isFinite(id)
+        )
+      )
+    );
+
+    const setsByExercise = new Map<number, UserRoutineExerciseSet[]>();
+    if (uniqueIds.length === 0) return setsByExercise;
+
     const userId = await this.getUserId();
-    const url = `${SUPABASE_URL}/rest/v1/user_routine_exercises_set_data?routine_template_exercise_id=eq.${routineTemplateExerciseId}&is_active=eq.true&order=set_order`;
-    const key = this.keyRoutineSets(userId, routineTemplateExerciseId);
-    const { data: sets } = await this.getOrFetchAndCache<UserRoutineExerciseSet[]>(url, key, CACHE_TTL.routineSets, true);
-    return sets;
+    const missing: number[] = [];
+
+    for (const id of uniqueIds) {
+      const cached = localCache.get<UserRoutineExerciseSet[]>(
+        this.keyRoutineSets(userId, id),
+        CACHE_TTL.routineSets
+      );
+      if (cached != null) {
+        setsByExercise.set(id, cached);
+      } else {
+        missing.push(id);
+      }
+    }
+
+    if (missing.length === 0) {
+      return setsByExercise;
+    }
+
+    const filter = missing.join(",");
+    const url =
+      `${SUPABASE_URL}/rest/v1/user_routine_exercises_set_data?routine_template_exercise_id=in.(${filter})` +
+      `&is_active=eq.true&order=routine_template_exercise_id.asc,set_order.asc`;
+    const rows = (await this.fetchJson<UserRoutineExerciseSet[]>(url, true)) ?? [];
+
+    const grouped = new Map<number, UserRoutineExerciseSet[]>();
+    for (const row of rows) {
+      if (!row) continue;
+      const id = row.routine_template_exercise_id;
+      if (!grouped.has(id)) grouped.set(id, []);
+      grouped.get(id)!.push(row);
+    }
+
+    for (const id of missing) {
+      const sets = grouped.get(id) ?? [];
+      const normalized = sets.map((set) => ({ ...set }));
+      setsByExercise.set(id, normalized);
+      localCache.set(this.keyRoutineSets(userId, id), normalized, CACHE_TTL.routineSets);
+    }
+
+    return setsByExercise;
   }
 
   // Profile
   async getMyProfile(): Promise<Profile | null> {
     const userId = await this.getUserId();
     const url = `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${userId}&select=*`;
     const key = this.keyProfile(userId);
     const { data: rows } = await this.getOrFetchAndCache<Profile[]>(url, key, CACHE_TTL.profile, true);
     return rows[0] ?? null;
   }
 
   async getBodyMeasurements(limit = 4): Promise<BodyMeasurement[]> {
     const userId = await this.getUserId();
     const url = `${SUPABASE_URL}/rest/v1/user_body_measurements?user_id=eq.${userId}&select=*&order=measured_on.desc&limit=${limit}`;
     const key = this.keyBodyMeasurements(userId);
     const { data: rows } = await this.getOrFetchAndCache<BodyMeasurement[]>(url, key, CACHE_TTL.bodyMeasurements, true);
     return rows;
   }
 
   // Steps goal (creates a default on first read if none exists)
   async getUserStepGoal(): Promise<number> {
     const userId = await this.getUserId();
     const url = `${SUPABASE_URL}/rest/v1/user_steps?user_id=eq.${userId}&select=goal`;
     const key = this.keySteps(userId);
     const { data: rows } = await this.getOrFetchAndCache<{ goal: number }[]>(url, key, CACHE_TTL.steps, true);
diff --git a/utils/supabase/supabase-db-write.ts b/utils/supabase/supabase-db-write.ts
index 44412282929749bdc0e19312e9e042b59deb9d17..3a0720cfa5ffa55ba9229b6ee6ece531a8cfa03c 100644
--- a/utils/supabase/supabase-db-write.ts
+++ b/utils/supabase/supabase-db-write.ts
@@ -408,51 +408,51 @@ export class SupabaseDBWrite extends SupabaseBase {
                     // Only attempt logout if we have a token
                     if (this.userToken) {
                         await this.fetchJson(`${SUPABASE_URL}/auth/v1/logout`, true, "POST");
                     }
                 } catch (error) {
                     // Log the error but don't throw - we still want to clear local state
                     logger.warn("Supabase logout failed, but continuing with local sign out:", error);
                 } finally {
                     // Always clear local token state
                     this.setToken(null);
                 }
             }
         );
     }
 
     // Routines
     async createUserRoutine(name: string): Promise<UserRoutine | null> {
         return performanceTimer.timeAsync(
             `[SUPABASE] createUserRoutine(${name})`,
             async () => {
                 const userId = await this.getUserId();
                 const rows = await this.fetchJson<UserRoutine[]>(
                     `${SUPABASE_URL}/rest/v1/user_routines`,
                     true,
                     "POST",
-                    { user_id: userId, name: name.trim(), version: 1, is_active: true },
+                    { user_id: userId, name: name.trim(), version: 1, is_active: true, exercise_count: 0 },
                     "return=representation"
                 );
                 await this.refreshRoutines(userId);
                 return rows[0] ?? null;
             }
         );
     }
 
     // supabase-db-write.ts
     async renameRoutine(routineTemplateId: number, newName: string): Promise<void> {
         return performanceTimer.timeAsync(
             `[SUPABASE] renameRoutine(${routineTemplateId}, ${newName})`,
             async () => {
                 const userId = await this.getUserId();
 
                 await this.fetchJson(
                     `${SUPABASE_URL}/rest/v1/user_routines?routine_template_id=eq.${routineTemplateId}`,
                     true, "PATCH", { name: newName.trim() }, "return=representation"
                     // ask PostgREST to return the updated row (avoids 204)
                 );
                 await this.refreshRoutines(userId);
             }
         );
     }
 
@@ -463,91 +463,105 @@ export class SupabaseDBWrite extends SupabaseBase {
             async () => {
                 const userId = await this.getUserId();
                 await this.fetchJson(
                     `${SUPABASE_URL}/rest/v1/user_routines?routine_template_id=eq.${routineTemplateId}`,
                     true, "PATCH", { is_active: false }, "return=representation");
                 await this.refreshRoutines(userId);
             }
         );
     }
 
     async hardDeleteRoutine(routineTemplateId: number): Promise<void> {
         return performanceTimer.timeAsync(
             `[SUPABASE] hardDeleteRoutine(${routineTemplateId})`,
             async () => {
                 const userId = await this.getUserId();
 
                 // Load all exercises for this routine (prefer cache)
                 const exercisesUrl = `${SUPABASE_URL}/rest/v1/user_routine_exercises_data?routine_template_id=eq.${routineTemplateId}&is_active=is.true&select=routine_template_exercise_id`;
                 const exercisesKey = this.keyRoutineExercises(userId, routineTemplateId);
                 logger.db("🔍 [DELETE ROUTINE] Cache key:", exercisesKey)
                 const { data: exercises } = await this.getOrFetchAndCache<
                     Array<{ routine_template_exercise_id: number }>
                 >(exercisesUrl, exercisesKey, CACHE_TTL.routineExercises, true);
                 // Delegate deletion of each exercise (and its sets)
                 for (const { routine_template_exercise_id: exId } of exercises) {
-                    await this.hardDeleteRoutineExercise(exId);
+                    await this.hardDeleteRoutineExercise(exId, { skipSummaryUpdate: true });
                 }
 
                 // Delete the routine itself
                 await this.fetchJson(
                     `${SUPABASE_URL}/rest/v1/user_routines?routine_template_id=eq.${routineTemplateId}`,
                     true,
                     "DELETE"
                 );
 
                 // Refresh caches for the now-removed routine
                 await Promise.all([
                     this.refreshRoutines(userId),
                     this.refreshRoutineExercises(userId, routineTemplateId),
                     this.refreshRoutineExercisesWithDetails(userId, routineTemplateId),
                 ]);
             }
         );
     }
 
     // Routine exercises and sets
     async addExerciseToRoutine(
         routineTemplateId: number,
         exerciseId: number,
-        exerciseOrder: number
+        exerciseOrder: number,
+        opts: { skipSummaryUpdate?: boolean } = {}
     ): Promise<UserRoutineExercise | null> {
         return performanceTimer.timeAsync(
             `[SUPABASE] addExerciseToRoutine(${routineTemplateId}, ${exerciseId}, ${exerciseOrder})`,
             async () => {
+                const { skipSummaryUpdate = false } = opts;
                 const userId = await this.getUserId();
                 const rows = await this.fetchJson<UserRoutineExercise[]>(
                     `${SUPABASE_URL}/rest/v1/user_routine_exercises_data`,
                     true,
                     "POST",
                     { routine_template_id: routineTemplateId, exercise_id: exerciseId, exercise_order: exerciseOrder, is_active: true },
                     "return=representation"
                 );
                 await Promise.all([
                     this.refreshRoutineExercises(userId, routineTemplateId),
                     this.refreshRoutineExercisesWithDetails(userId, routineTemplateId),
                 ]);
+
+                if (!skipSummaryUpdate) {
+                    try {
+                        await this.recomputeAndSaveRoutineMuscleSummary(routineTemplateId);
+                    } catch (err) {
+                        logger.warn(
+                            "Failed to recompute routine summary after adding exercise",
+                            routineTemplateId,
+                            err
+                        );
+                    }
+                }
                 return rows[0] ?? null;
             }
         );
     }
 
     async addExerciseSetsToRoutine(
         routineTemplateExerciseId: number,
         exerciseId: number,
         setsData: { reps: number; weight: number; set_order?: number }[]
     ): Promise<UserRoutineExerciseSet[]> {
         return performanceTimer.timeAsync(
             `[SUPABASE] addExerciseSetsToRoutine(${routineTemplateExerciseId}, ${exerciseId}, ${setsData.length} sets)`,
             async () => {
                 const userId = await this.getUserId();
                 const setsToInsert = setsData.map((set, index) => ({
                     routine_template_exercise_id: routineTemplateExerciseId,
                     exercise_id: exerciseId,
                     set_order: set.set_order ?? index + 1,
                     is_active: true,
                     planned_reps: set.reps > 0 ? set.reps : null,
                     planned_weight_kg: set.weight > 0 ? set.weight : null,
                 }));
 
                 const rows = await this.fetchJson<UserRoutineExerciseSet[]>(
                     `${SUPABASE_URL}/rest/v1/user_routine_exercises_set_data`,
@@ -559,118 +573,150 @@ export class SupabaseDBWrite extends SupabaseBase {
 
                 await this.refreshRoutineSets(userId, routineTemplateExerciseId);
                 return rows;
             }
         );
     }
 
     // Helper function to find routine ID for an exercise
     private async findRoutineIdForExercise(routineTemplateExerciseId: number): Promise<number> {
         const url = `${SUPABASE_URL}/rest/v1/user_routine_exercises_data?routine_template_exercise_id=eq.${routineTemplateExerciseId}&select=routine_template_id`;
         const cacheKey = `rtex:${routineTemplateExerciseId}:routine`;
         const { data: lookup } = await this.getOrFetchAndCache<Array<{ routine_template_id: number }>>(
             url,
             cacheKey,
             CACHE_TTL.routineExercises,
             true
         );
         const routineId = lookup[0]?.routine_template_id;
         if (!routineId) {
             throw new Error(`Could not find routine ID for exercise ${routineTemplateExerciseId}`);
         }
         return routineId;
     }
 
     // Soft delete routine exercise (sets is_active = false)
-    async deleteRoutineExercise(routineTemplateExerciseId: number): Promise<void> {
+    async deleteRoutineExercise(
+        routineTemplateExerciseId: number,
+        opts: { skipSummaryUpdate?: boolean } = {}
+    ): Promise<void> {
         return performanceTimer.timeAsync(
             `[SUPABASE] deleteRoutineExercise(${routineTemplateExerciseId})`,
             async () => {
                 const userId = await this.getUserId();
-                
+                const { skipSummaryUpdate = false } = opts;
+
                 // Soft delete the exercise row
                 await this.fetchJson(
                     `${SUPABASE_URL}/rest/v1/user_routine_exercises_data?routine_template_exercise_id=eq.${routineTemplateExerciseId}`,
                     true,
                     "PATCH",
                     { is_active: false },
                     "return=minimal"
                 );
 
                 // Also soft delete all associated sets
                 await this.fetchJson(
                     `${SUPABASE_URL}/rest/v1/user_routine_exercises_set_data?routine_template_exercise_id=eq.${routineTemplateExerciseId}`,
                     true,
                     "PATCH",
                     { is_active: false },
                     "return=minimal"
                 );
 
                 const routineId = await this.findRoutineIdForExercise(routineTemplateExerciseId);
 
                 // Refresh the data
                 await Promise.all([
                     this.refreshRoutineExercises(userId, routineId),        // Routine ID
                     this.refreshRoutineExercisesWithDetails(userId, routineId), // Routine ID
                 ]);
+
+                if (!skipSummaryUpdate) {
+                    try {
+                        await this.recomputeAndSaveRoutineMuscleSummary(routineId);
+                    } catch (err) {
+                        logger.warn(
+                            "Failed to recompute routine summary after deleting exercise",
+                            routineId,
+                            err
+                        );
+                    }
+                }
             }
         );
     }
 
-    async hardDeleteRoutineExercise(routineTemplateExerciseId: number): Promise<void> {
+    async hardDeleteRoutineExercise(
+        routineTemplateExerciseId: number,
+        opts: { skipSummaryUpdate?: boolean } = {}
+    ): Promise<void> {
         return performanceTimer.timeAsync(
             `[SUPABASE] hardDeleteRoutineExercise(${routineTemplateExerciseId})`,
             async () => {
                 const userId = await this.getUserId();
+                const { skipSummaryUpdate = false } = opts;
 
                 // Determine parent routine before deleting rows
                 const routineId = await this.findRoutineIdForExercise(
                     routineTemplateExerciseId
                 );
 
                 // Load all set IDs for this exercise (prefer cache) and delete via helper
                 const setsUrl = `${SUPABASE_URL}/rest/v1/user_routine_exercises_set_data?routine_template_exercise_id=eq.${routineTemplateExerciseId}&is_active=is.true&select=routine_template_exercise_set_id`;
                 const setsKey = this.keyRoutineSets(userId, routineTemplateExerciseId);
 
                 const { data: sets } = await this.getOrFetchAndCache<
                     Array<{ routine_template_exercise_set_id: number }>
                 >(setsUrl, setsKey, CACHE_TTL.routineSets, true);
                 for (const { routine_template_exercise_set_id: setId } of sets) {
                     await this.hardDeleteExerciseSet(setId, routineTemplateExerciseId);
                 }
 
                 // Delete the exercise row itself
                 await this.fetchJson(
                     `${SUPABASE_URL}/rest/v1/user_routine_exercises_data?routine_template_exercise_id=eq.${routineTemplateExerciseId}`,
                     true,
                     "DELETE"
                 );
 
                 await Promise.all([
                     this.refreshRoutineExercises(userId, routineId),
                     this.refreshRoutineExercisesWithDetails(userId, routineId),
                 ]);
+
+                if (!skipSummaryUpdate) {
+                    try {
+                        await this.recomputeAndSaveRoutineMuscleSummary(routineId);
+                    } catch (err) {
+                        logger.warn(
+                            "Failed to recompute routine summary after hard deleting exercise",
+                            routineId,
+                            err
+                        );
+                    }
+                }
             }
         );
     }
 
     // ----- Workout flows -----
     async startWorkout(routineTemplateId: number): Promise<Workout> {
         return performanceTimer.timeAsync(
             `[SUPABASE] startWorkout(${routineTemplateId})`,
             async () => {
                 const userId = await this.getUserId();
                 const rows = await this.fetchJson<Workout[]>(
                     `${SUPABASE_URL}/rest/v1/workouts`,
                     true,
                     "POST",
                     { template_id: routineTemplateId, started_at: new Date().toISOString(), user_id: userId },
                     "return=representation"
                 );
                 return rows[0];
             }
         );
     }
 
     async endWorkout(workoutId: string): Promise<void> {
         return performanceTimer.timeAsync(
             `[SUPABASE] endWorkout(${workoutId})`,
@@ -924,113 +970,151 @@ export class SupabaseDBWrite extends SupabaseBase {
                     "POST",
                     payload,
                     "resolution=merge-duplicates, return=representation"
                 );
                 await this.refreshBodyMeasurements(userId);
                 return rows[0] ?? null;
             }
         );
     }
 
     async deleteBodyMeasurement(measured_on: string): Promise<void> {
         return performanceTimer.timeAsync(
             `[SUPABASE] deleteBodyMeasurement(${measured_on})`,
             async () => {
                 const userId = await this.getUserId();
                 await this.fetchJson(
                     `${SUPABASE_URL}/rest/v1/user_body_measurements?user_id=eq.${userId}&measured_on=eq.${measured_on}`,
                     true,
                     "DELETE"
                 );
                 await this.refreshBodyMeasurements(userId);
             }
         );
     }
 
-    async recomputeAndSaveRoutineMuscleSummary(routineTemplateId: number) {
+    async recomputeAndSaveRoutineMuscleSummary(routineTemplateId: number): Promise<{
+        muscle_group_summary: string | null;
+        exercise_count: number;
+    }> {
         return performanceTimer.timeAsync(
             `[SUPABASE] recomputeAndSaveRoutineMuscleSummary(${routineTemplateId})`,
             async () => {
                 logger.db("🔍 DGB [MUSCLE SUMMARY] Starting recompute for routine:", routineTemplateId);
-                
+
                 // Load active exercises → muscle groups
                 const urlEx =
                     `${SUPABASE_URL}/rest/v1/user_routine_exercises_data` +
                     `?routine_template_id=eq.${routineTemplateId}&is_active=eq.true` +
                     `&select=exercises(muscle_group)`;
-            
+
                 logger.db("🔍 DGB [MUSCLE SUMMARY] Fetching exercises from URL:", urlEx);
                 const rows = await this.fetchJson<Array<{ exercises?: { muscle_group?: string } }>>(urlEx, true);
-                logger.db("🔍 DGB [MUSCLE SUMMARY] Found exercises:", rows.length);
-            
-                // Early exit if no active exercises - nothing to recompute
-                if (rows.length === 0) {
-                    logger.db("🔍 DGB [MUSCLE SUMMARY] No active exercises found, skipping recomputation");
-                    logger.db("🔍 DGB [MUSCLE SUMMARY] No database update or cache refresh needed");
-                    return;
+                const exerciseCount = rows.length;
+                logger.db("🔍 DGB [MUSCLE SUMMARY] Found exercises:", exerciseCount);
+                if (exerciseCount === 0) {
+                    logger.db(
+                        "🔍 DGB [MUSCLE SUMMARY] No active exercises found, clearing summary and count",
+                        routineTemplateId
+                    );
                 }
-            
+
                 // Count frequency of each muscle group
                 const muscleGroupCounts = new Map<string, number>();
                 rows.forEach(r => {
                     const muscleGroup = (r.exercises?.muscle_group ?? "").trim();
                     if (muscleGroup) {
                         muscleGroupCounts.set(muscleGroup, (muscleGroupCounts.get(muscleGroup) || 0) + 1);
                     }
                 });
-            
+
                 logger.db("🔍 DGB [MUSCLE SUMMARY] Muscle group counts:", Object.fromEntries(muscleGroupCounts));
-            
+
                 // Sort by frequency (descending) and take top 3
                 const topMuscleGroups = Array.from(muscleGroupCounts.entries())
-                    .sort(([, a], [, b]) => b - a) // Sort by count descending
-                    .slice(0, 3) // Take top 3
-                    .map(([group]) => group); // Extract just the group names
-            
+                    .sort(([, a], [, b]) => b - a)
+                    .slice(0, 3)
+                    .map(([group]) => group);
+
                 logger.db("🔍 DGB [MUSCLE SUMMARY] Top 3 muscle groups:", topMuscleGroups);
-            
+
                 // Use NULL when no groups (avoids DB pattern/CHECK failures on empty string)
                 const summary = topMuscleGroups.length ? topMuscleGroups.join(" • ") : null;
                 logger.db("🔍 DGB [MUSCLE SUMMARY] Final summary:", summary);
-            
-                // Patch base table
+
+                // Patch base table (retrying with legacy column name if needed)
                 const urlPatch = `${SUPABASE_URL}/rest/v1/user_routines?routine_template_id=eq.${routineTemplateId}`;
                 logger.db("🔍 DGB [MUSCLE SUMMARY] Patching routine with URL:", urlPatch);
-                await this.fetchJson<any[]>(
-                    urlPatch,
-                    true,
-                    "PATCH",
-                    [{ muscle_group_summary: summary }],
-                    "return=representation"
-                );
-            
+
+                let patched = false;
+                let lastError: unknown = null;
+                try {
+                    await this.fetchJson<any[]>(
+                        urlPatch,
+                        true,
+                        "PATCH",
+                        [{ muscle_group_summary: summary, exercise_count: exerciseCount }],
+                        "return=representation"
+                    );
+                    patched = true;
+                } catch (err) {
+                    lastError = err;
+                    logger.warn(
+                        "Failed to patch routine summary with exercise_count column, attempting legacy fallback",
+                        routineTemplateId,
+                        err
+                    );
+                }
+
+                if (!patched) {
+                    try {
+                        await this.fetchJson<any[]>(
+                            urlPatch,
+                            true,
+                            "PATCH",
+                            [{ muscle_group_summary: summary, exersise_count: exerciseCount }],
+                            "return=representation"
+                        );
+                        patched = true;
+                        lastError = null;
+                    } catch (legacyErr) {
+                        lastError = legacyErr;
+                    }
+                }
+
+                if (!patched) {
+                    throw lastError instanceof Error ? lastError : new Error(String(lastError));
+                }
+
                 // Refresh routines cache so UI reflects changes
                 logger.db("🔍 DGB [MUSCLE SUMMARY] Refreshing routines cache...");
                 const userId = await this.getUserId();
                 logger.db("🔍 DGB [MUSCLE SUMMARY] User ID for cache refresh:", userId);
                 await this.refreshRoutines(userId);
                 logger.db("🔍 DGB [MUSCLE SUMMARY] Cache refresh completed");
+
+                return { muscle_group_summary: summary, exercise_count: exerciseCount };
             }
         );
     }
 
     // Used to cleanup test user
     async deleteProfile(userId?: string): Promise<void> {
         const id = userId ?? await this.getUserId();
         await this.fetchJson(
             `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${id}`,
             true,
             "DELETE"
         );
         await this.refreshProfile(id);
     }
     /**
      * Log a message to the database logger table
      * @param level - Log level (INFO, DEBUG, etc.)
      * @param message - Log message
      * @param args - Additional arguments
      */
     async logToDatabase(level: string, message: string, args: any[] = []): Promise<void> {
         return performanceTimer.timeAsync(
             `[SUPABASE] logToDatabase(${level})`,
             async () => {
                 try {
diff --git a/utils/supabase/supabase-types.ts b/utils/supabase/supabase-types.ts
index 01bafc52ccac77d678bc16a2db5098083c599c79..076ea51f8ca3f132f99c076acedc10cdf56bfc48 100644
--- a/utils/supabase/supabase-types.ts
+++ b/utils/supabase/supabase-types.ts
@@ -64,50 +64,53 @@ export interface Exercise {
   export interface AuthResponse {
     access_token?: string;
     session?: {
       access_token: string;
     };
     user?: any;
     error?: {
       message: string;
     };
   }
   
   export interface UserSteps {
     user_step_id: number;
     user_id: string;
     goal: number;
   }
   
   export interface UserRoutine {
     routine_template_id: number;
     user_id: number;
     name: string;
     version: number;
     is_active: boolean;
     created_at: string;
     muscle_group_summary?: string | null;
+    exercise_count?: number | null;
+    // Temporary backwards compatibility with legacy typo column name
+    exersise_count?: number | null;
   }
   
   export interface UserRoutineExercise {
     routine_template_exercise_id: number;
     routine_template_id: number;
     exercise_id: number;
     exercise_order: number;
     is_active: boolean;
     notes?: string;
   }
   
   export interface UserRoutineExerciseSet {
     routine_template_exercise_set_id: number;
     routine_template_exercise_id: number;
     exercise_id: number;
     set_order: number;
     is_active: boolean;
     planned_reps?: number | null;
     planned_weight_kg?: number | null;
     notes?: string;
   }
 
   export interface BodyMeasurement {
     id: number;
     user_id: string;

