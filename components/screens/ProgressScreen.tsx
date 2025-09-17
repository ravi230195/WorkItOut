// components/screens/ProgressScreen.tsx
import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Progress } from "../ui/progress";
import {
  Activity,
  Award,
  BarChart3,
  Bike,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDot,
  Dumbbell,
  Flame,
  Footprints,
  HandFist,
  HeartPulse,
  Medal,
  MoveVertical,
  Orbit,
  Rocket,
  Sailboat,
  Sparkles,
  StretchHorizontal,
  TrendingUp,
  Trophy,
  Waves,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "../ui/badge";
import MetricCard from "../progress/MetricCard";
import { supabaseAPI, Workout, Profile } from "../../utils/supabase/supabase-api";
import { AppScreen, Section, Stack } from "../layouts";
import { logger } from "../../utils/logging";
import { useAuth } from "../AuthContext";
import { useStepTracking } from "../../hooks/useStepTracking";
import { useWorkoutTracking } from "../../hooks/useWorkoutTracking";
import type { ActivityCategory, TimeRange, MuscleGroup } from "../../src/types/progress";
import ProgressDetailSection from "../../src/components/progress/ProgressDetailSection";

type MetricCategory = 'strength' | 'cardio' | 'measurements';

interface ProgressScreenProps {
  bottomBar?: React.ReactNode;
}

// Type definitions for progress data
interface StepsData {
  current: number;
  target: number;
  progress: number;
  remaining: number;
  achieved: boolean;
  dailyBreakdown?: Array<{
    day: string;
    steps: number;
    target: number;
    achieved: boolean;
  }>;
  weeklyBreakdown?: Array<{
    week: string;
    steps: number;
    target: number;
    achieved: boolean;
  }>;
}

interface RoutineData {
  current: number;
  target: number;
  progress: number;
  remaining: number;
  achieved: boolean;
  types?: Array<{
    name: string;
    count: number;
    icon: any;
    color: string;
    target: number;
  }>;
  dailyBreakdown?: Array<{
    day: string;
    timeSpent: number;
    target: number;
    achieved: boolean;
  }>;
  weeklyBreakdown?: Array<{
    week: string;
    timeSpent: number;
    target: number;
    achieved: boolean;
  }>;
}

interface PeriodData {
  steps: StepsData;
  routines: RoutineData;
  calories?: {
    current: number;
    target: number;
    progress: number;
    remaining: number;
  };
}

// Mock user data (in real app, this would come from auth context)
const userData = {
  name: "Alex",
  streak: 5,
  isOnTrack: true
};

// Mock routine activities for today
const todaysRoutines = [
  { name: "Morning Cardio", duration: 30, type: "Cardio" },
  { name: "Strength Training", duration: 45, type: "Strength" },
  { name: "Yoga Session", duration: 20, type: "Flexibility" }
];

const METRIC_OPTIONS: Array<{ value: MetricCategory; label: string }> = [
  { value: 'strength', label: 'Strength' },
  { value: 'cardio', label: 'Cardio' },
  { value: 'measurements', label: 'Measurements' },
];

const MUSCLE_GROUP_FOCUS_OPTIONS: Array<{ value: string; label: string; icon: LucideIcon }> = [
  { value: 'all', label: 'All', icon: Sparkles },
  { value: 'chest', label: 'Chest', icon: HeartPulse },
  { value: 'back', label: 'Back', icon: StretchHorizontal },
  { value: 'legs', label: 'Legs', icon: Footprints },
  { value: 'arms', label: 'Arms', icon: HandFist },
  { value: 'shoulders', label: 'Shoulders', icon: MoveVertical },
  { value: 'core', label: 'Core', icon: CircleDot },
];

const CARDIO_FOCUS_OPTIONS: Array<{ value: string; label: string; icon: LucideIcon }> = [
  { value: 'all', label: 'All', icon: Sparkles },
  { value: 'running', label: 'Running', icon: Activity },
  { value: 'cycling', label: 'Cycling', icon: Bike },
  { value: 'swimming', label: 'Swimming', icon: Waves },
  { value: 'rowing', label: 'Rowing', icon: Sailboat },
  { value: 'elliptical', label: 'Elliptical', icon: Orbit },
  { value: 'hiit', label: 'HIIT', icon: Flame },
  { value: 'walking', label: 'Walking', icon: Footprints },
];

// Fallback/static data used until live aggregates load
const progressData: Record<'day' | 'week' | 'month' | 'year', PeriodData> = {
  day: {
    steps: {
      current: 7750,
      target: 10000,
      progress: 77.5,
      remaining: 2250,
      achieved: false
    },
    routines: {
      current: 3,
      target: 1,
      progress: 100,
      remaining: 0,
      achieved: true
    },
    calories: {
      current: 320,
      target: 400,
      progress: 80,
      remaining: 80
    }
  },
  week: {
    steps: {
      current: 54320,
      target: 70000,
      progress: 77.6,
      remaining: 15680,
      achieved: false,
      dailyBreakdown: [
        { day: "Mon", steps: 8200, target: 10000, achieved: false },
        { day: "Tue", steps: 9100, target: 10000, achieved: false },
        { day: "Wed", steps: 7800, target: 10000, achieved: false },
        { day: "Thu", steps: 8900, target: 10000, achieved: false },
        { day: "Fri", steps: 7600, target: 10000, achieved: false },
        { day: "Sat", steps: 11200, target: 10000, achieved: true },
        { day: "Sun", steps: 1520, target: 10000, achieved: false }
      ]
    },
    routines: {
      current: 4,
      target: 5,
      progress: 80,
      remaining: 1,
      achieved: false,
      dailyBreakdown: [
        { day: "Mon", timeSpent: 45, target: 30, achieved: true },
        { day: "Tue", timeSpent: 60, target: 30, achieved: true },
        { day: "Wed", timeSpent: 25, target: 30, achieved: false },
        { day: "Thu", timeSpent: 40, target: 30, achieved: true },
        { day: "Fri", timeSpent: 35, target: 30, achieved: true },
        { day: "Sat", timeSpent: 50, target: 30, achieved: true },
        { day: "Sun", timeSpent: 0, target: 30, achieved: false }
      ]
    }
  },
  month: {
    steps: {
      current: 190351,
      target: 300000,
      progress: 63.5,
      remaining: 109649,
      achieved: false,
      weeklyBreakdown: [
        { week: "W1", steps: 68000, target: 70000, achieved: false },
        { week: "W2", steps: 72000, target: 70000, achieved: true },
        { week: "W3", steps: 65000, target: 70000, achieved: false },
        { week: "W4", steps: 55351, target: 70000, achieved: false }
      ]
    },
    routines: {
      current: 16,
      target: 20,
      progress: 80,
      remaining: 4,
      achieved: false,
      types: [
        { name: "Walking", count: 121, icon: Footprints, color: "text-black", target: 150 },
        { name: "Running", count: 62, icon: Activity, color: "text-black", target: 80 },
        { name: "Cycling", count: 33, icon: Activity, color: "text-black", target: 40 },
        { name: "Strength", count: 45, icon: Dumbbell, color: "text-black", target: 50 }
      ],
      weeklyBreakdown: [
        { week: "W1", timeSpent: 180, target: 150, achieved: true },
        { week: "W2", timeSpent: 210, target: 150, achieved: true },
        { week: "W3", timeSpent: 140, target: 150, achieved: false },
        { week: "W4", timeSpent: 165, target: 150, achieved: true }
      ]
    }
  },
  year: {
    steps: {
      current: 2150000,
      target: 3650000,
      progress: 58.9,
      remaining: 1500000,
      achieved: false
    },
    routines: {
      current: 180,
      target: 240,
      progress: 75,
      remaining: 60,
      achieved: false
    }
  }
};

// Fallback monthly data for year view (replaced by live aggregates when available)
const monthlyYearDataFallback = [
  { month: "Jan", steps: 280000, stepsTarget: 300000, stepsAchieved: false, routines: 18, routinesTarget: 20, routinesAchieved: false },
  { month: "Feb", steps: 310000, stepsTarget: 300000, stepsAchieved: true, routines: 22, routinesTarget: 20, routinesAchieved: true },
  { month: "Mar", steps: 295000, stepsTarget: 300000, stepsAchieved: false, routines: 19, routinesTarget: 20, routinesAchieved: false },
  { month: "Apr", steps: 320000, stepsTarget: 300000, stepsAchieved: true, routines: 21, routinesTarget: 20, routinesAchieved: true },
  { month: "May", steps: 305000, stepsTarget: 300000, stepsAchieved: true, routines: 20, routinesTarget: 20, routinesAchieved: true },
  { month: "Jun", steps: 290000, stepsTarget: 300000, stepsAchieved: false, routines: 18, routinesTarget: 20, routinesAchieved: false },
  { month: "Jul", steps: 315000, stepsTarget: 300000, stepsAchieved: true, routines: 23, routinesTarget: 20, routinesAchieved: true },
  { month: "Aug", steps: 300000, stepsTarget: 300000, stepsAchieved: true, routines: 20, routinesTarget: 20, routinesAchieved: true },
  { month: "Sep", steps: 285000, stepsTarget: 300000, stepsAchieved: false, routines: 17, routinesTarget: 20, routinesAchieved: false },
  { month: "Oct", steps: 325000, stepsTarget: 300000, stepsAchieved: true, routines: 24, routinesTarget: 20, routinesAchieved: true },
  { month: "Nov", steps: 310000, stepsTarget: 300000, stepsAchieved: true, routines: 21, routinesTarget: 20, routinesAchieved: true },
  { month: "Dec", steps: 295000, stepsTarget: 300000, stepsAchieved: false, routines: 19, routinesTarget: 20, routinesAchieved: false }
];

// Fallback calendar data for year view (replaced by live aggregates when available)
const generateYearCalendarDataFallback = () => {
  const data: Record<string, { steps: boolean; routines: boolean }> = {};
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  
  // Generate random data for demonstration
  for (let month = 0; month < 12; month++) {
    const daysInMonth = new Date(currentYear, month + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${month + 1}/${day}`;
      data[dateKey] = {
        steps: Math.random() > 0.3, // 70% chance of steps
        routines: Math.random() > 0.4 // 60% chance of routines
      };
    }
  }
  return data;
};

// Local state for live aggregates
import { fetchStepsByDay, fetchWorkoutsByDay, weekStart, weekEnd, monthStart, monthEnd } from "../../hooks/useHealthAggregates";

const yearCalendarDataFallback = generateYearCalendarDataFallback();

export function ProgressScreen({ bottomBar }: ProgressScreenProps) {
  const [recentWorkouts, setRecentWorkouts] = useState<Workout[]>([]);
  const [workoutStats, setWorkoutStats] = useState({
    thisWeekCount: 0,
    totalMinutes: 0,
    monthlyCount: 16,
    monthlyTarget: 20,
  });
  const [isLoading, setIsLoading] = useState(false);
  // New top controls
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [selectedRange, setSelectedRange] = useState<'week' | '3m' | '6m'>('week');
  const [selectedMetric, setSelectedMetric] = useState<MetricCategory>('cardio');
  const [selectedStrengthFocus, setSelectedStrengthFocus] = useState<MuscleGroup>('all');
  const [selectedCardioFocus, setSelectedCardioFocus] = useState<string>('all');
  const [isMetricMenuOpen, setIsMetricMenuOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const { userToken } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const metricDropdownRef = useRef<HTMLDivElement | null>(null);
  // Live health data
  const { steps, goal: stepGoal, isLoading: stepsLoading, forceRefreshStepData } = useStepTracking(true);
  const { count: workoutCount, totalMinutes: workoutMinutes, isLoading: workoutsLoading, refresh: refreshWorkouts } = useWorkoutTracking();

  // Fetch user profile for display name
  useEffect(() => {
    const fetchProfile = async () => {
      if (!userToken) return;
      try {
        const profileData = await supabaseAPI.getMyProfile();
        setProfile(profileData);
      } catch (error) {
        logger.error("Failed to fetch profile for Progress screen:", error);
      }
    };
    fetchProfile();
  }, [userToken]);

  useEffect(() => {
    const fetchProgressData = async () => {
      setIsLoading(true);
      try {
        // Mock data for now since supabaseAPI.getRecentWorkouts doesn't exist
        const mockWorkouts: Workout[] = [];
        setRecentWorkouts(mockWorkouts);

        // Compute stats from workouts
        const now = new Date();
        const thisWeekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());

        const thisWeekWorkouts = mockWorkouts.filter(workout =>
          new Date(workout.started_at) >= thisWeekStart
        );

        const totalMinutes = mockWorkouts.reduce((sum, workout) =>
          sum + (workout.duration_minutes || 0), 0
        );

        setWorkoutStats({
          thisWeekCount: thisWeekWorkouts.length,
          totalMinutes,
          monthlyCount: Math.min(mockWorkouts.length, 20),
          monthlyTarget: 20
        });
      } catch (error) {
        logger.error("Failed to fetch progress data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProgressData();
    // Kick off fresh native reads for steps/workouts
    forceRefreshStepData().catch(() => {});
    refreshWorkouts().catch(() => {});
  }, []);

  // Dynamic aggregates state
  const [periodData, setPeriodData] = useState<Partial<Record<'day'|'week'|'month'|'year', PeriodData>>>({});
  const [monthlyYearData, setMonthlyYearData] = useState<Array<{ month: string; steps: number; stepsTarget: number; stepsAchieved: boolean; routines: number; routinesTarget: number; routinesAchieved: boolean }>>(monthlyYearDataFallback);
  const [yearCalendarData, setYearCalendarData] = useState<Record<string, { steps: boolean; routines: boolean }>>(yearCalendarDataFallback);

  // Compute current period data from live Health aggregates
  useEffect(() => {
    const compute = async () => {
      try {
        if (selectedPeriod === 'day') {
          // Day view already uses live hooks for steps/workouts; still compute to drive badges
          const stepsCurrent = steps ?? 0;
          const target = stepGoal || 10000;
          const stepsData: StepsData = {
            current: stepsCurrent,
            target,
            progress: Math.min(100, Math.max(0, (stepsCurrent / Math.max(1, target)) * 100)),
            remaining: Math.max(0, target - stepsCurrent),
            achieved: stepsCurrent >= target,
          };
          const routinesCurrent = workoutCount;
          const routinesTarget = 1;
          const routinesData: RoutineData = {
            current: routinesCurrent,
            target: routinesTarget,
            progress: Math.min(100, Math.max(0, (routinesCurrent / Math.max(1, routinesTarget)) * 100)),
            remaining: Math.max(0, routinesTarget - routinesCurrent),
            achieved: routinesCurrent >= routinesTarget,
          };
          setPeriodData(prev => ({ ...prev, day: { steps: stepsData, routines: routinesData } }));
          return;
        }

        if (selectedPeriod === 'week') {
          const now = new Date();
          const s = weekStart(now);
          const e = weekEnd(now);
          const stepsByDay = await fetchStepsByDay(s, e);
          const wByDay = await fetchWorkoutsByDay(s, e);

          const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
          const dailySteps = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(s); d.setDate(s.getDate() + i);
            const key = `${d.getMonth()+1}/${d.getDate()}`;
            const stepsVal = stepsByDay[key]?.steps || 0;
            return { day: dayNames[d.getDay()], steps: stepsVal, target: stepGoal, achieved: stepsVal >= stepGoal };
          });
          const stepsCurrent = dailySteps.reduce((sum, d) => sum + d.steps, 0);
          const stepsTarget = stepGoal * 7;
          const stepsData: StepsData = {
            current: stepsCurrent,
            target: stepsTarget,
            progress: Math.min(100, Math.max(0, (stepsCurrent / Math.max(1, stepsTarget)) * 100)),
            remaining: Math.max(0, stepsTarget - stepsCurrent),
            achieved: stepsCurrent >= stepsTarget,
            dailyBreakdown: dailySteps,
          };

          const dailyRoutines = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(s); d.setDate(s.getDate() + i);
            const key = `${d.getMonth()+1}/${d.getDate()}`;
            const minutes = Math.round(wByDay[key]?.minutes || 0);
            const perDayTarget = 30; // 30 min/day target
            return { day: dayNames[d.getDay()], timeSpent: minutes, target: perDayTarget, achieved: minutes >= perDayTarget };
          });
          const routinesCount = Object.values(wByDay).reduce((sum, v) => sum + (v?.count || 0), 0);
          const routinesTarget = 5; // 5 workouts/week target
          const routinesData: RoutineData = {
            current: routinesCount,
            target: routinesTarget,
            progress: Math.min(100, Math.max(0, (routinesCount / Math.max(1, routinesTarget)) * 100)),
            remaining: Math.max(0, routinesTarget - routinesCount),
            achieved: routinesCount >= routinesTarget,
            dailyBreakdown: dailyRoutines,
          };

          setPeriodData(prev => ({ ...prev, week: { steps: stepsData, routines: routinesData } }));
          return;
        }

        if (selectedPeriod === 'month') {
          const now = new Date();
          const s = monthStart(now);
          const e = monthEnd(now);
          const stepsByDay = await fetchStepsByDay(s, e);
          const wByDay = await fetchWorkoutsByDay(s, e);

          // Build weekly buckets within month (partial weeks adjusted)
          const weeks: Array<{ start: Date; end: Date; label: string; days: number }> = [];
          let wS = weekStart(s);
          while (wS <= e) {
            const wE = weekEnd(wS);
            const startIn = wS < s ? s : wS;
            const endIn = wE > e ? e : wE;
            const days = Math.floor((new Date(endIn.getFullYear(), endIn.getMonth(), endIn.getDate()).getTime() - new Date(startIn.getFullYear(), startIn.getMonth(), startIn.getDate()).getTime())/86400000) + 1;
            weeks.push({ start: startIn, end: endIn, label: `W${weeks.length+1}`, days });
            wS = new Date(wS.getFullYear(), wS.getMonth(), wS.getDate() + 7);
          }

          const weeklySteps = weeks.map(w => {
            let total = 0;
            for (let d = new Date(w.start); d <= w.end; d = new Date(d.getFullYear(), d.getMonth(), d.getDate()+1)) {
              const key = `${d.getMonth()+1}/${d.getDate()}`;
              total += stepsByDay[key]?.steps || 0;
            }
            const target = stepGoal * w.days; // adjust for partial weeks
            return { week: w.label, steps: total, target, achieved: total >= target };
          });

          const weeklyMinutes = weeks.map(w => {
            let minutes = 0;
            for (let d = new Date(w.start); d <= w.end; d = new Date(d.getFullYear(), d.getMonth(), d.getDate()+1)) {
              const key = `${d.getMonth()+1}/${d.getDate()}`;
              minutes += Math.round(wByDay[key]?.minutes || 0);
            }
            const target = Math.round(150 * (w.days/7)); // 150 min/week adjusted
            return { week: w.label, timeSpent: minutes, target, achieved: minutes >= target };
          });

          const stepsCurrent = weeklySteps.reduce((s, w) => s + w.steps, 0);
          const stepsTarget = Array.from({length: (e.getDate())}, (_, i) => 0).reduce((acc) => acc, 0) + stepGoal * e.getDate();

          const stepsData: StepsData = {
            current: stepsCurrent,
            target: stepsTarget,
            progress: Math.min(100, Math.max(0, (stepsCurrent / Math.max(1, stepsTarget)) * 100)),
            remaining: Math.max(0, stepsTarget - stepsCurrent),
            achieved: stepsCurrent >= stepsTarget,
            weeklyBreakdown: weeklySteps,
          } as any;

          const routinesCount = Object.values(wByDay).reduce((sum, v) => sum + (v?.count || 0), 0);
          const routinesTarget = weeks.length * 5; // 5/week
          const routinesData: RoutineData = {
            current: routinesCount,
            target: routinesTarget,
            progress: Math.min(100, Math.max(0, (routinesCount / Math.max(1, routinesTarget)) * 100)),
            remaining: Math.max(0, routinesTarget - routinesCount),
            achieved: routinesCount >= routinesTarget,
            weeklyBreakdown: weeklyMinutes,
          } as any;

          setPeriodData(prev => ({ ...prev, month: { steps: stepsData, routines: routinesData } }));
          return;
        }

        if (selectedPeriod === 'year') {
          const year = selectedYear;
          const start = new Date(year, 0, 1, 0, 0, 0, 0);
          const end = new Date(year, 11, 31, 23, 59, 59, 999);
          const stepsByDay = await fetchStepsByDay(start, end);
          const wByDay = await fetchWorkoutsByDay(start, end);

          const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
          const monthly = months.map((m, idx) => {
            const daysInMonth = new Date(year, idx+1, 0).getDate();
            let stepsSum = 0;
            let workoutsCount = 0;
            for (let d = 1; d <= daysInMonth; d++) {
              const key = `${idx+1}/${d}`;
              stepsSum += stepsByDay[key]?.steps || 0;
              workoutsCount += wByDay[key]?.count || 0;
            }
            const stepsTarget = stepGoal * daysInMonth;
            const routinesTarget = Math.ceil(daysInMonth / 7) * 5; // 5/week
            return {
              month: m,
              steps: stepsSum,
              stepsTarget,
              stepsAchieved: stepsSum >= stepsTarget,
              routines: workoutsCount,
              routinesTarget,
              routinesAchieved: workoutsCount >= routinesTarget,
            };
          });
          setMonthlyYearData(monthly);

          // Calendar flags for current selected year
          const cal: Record<string, { steps: boolean; routines: boolean }> = {};
          for (let m = 0; m < 12; m++) {
            const dim = new Date(year, m+1, 0).getDate();
            for (let d = 1; d <= dim; d++) {
              const key = `${m+1}/${d}`;
              cal[key] = {
                steps: (stepsByDay[key]?.steps || 0) > 0,
                routines: (wByDay[key]?.count || 0) > 0,
              };
            }
          }
          setYearCalendarData(cal);

          // Also compute high-level aggregates for year header cards
          const stepsTotal = monthly.reduce((s, m) => s + m.steps, 0);
          const stepsTargetYear = monthly.reduce((s, m) => s + m.stepsTarget, 0);
          const stepsData: StepsData = {
            current: stepsTotal,
            target: stepsTargetYear,
            progress: Math.min(100, Math.max(0, (stepsTotal / Math.max(1, stepsTargetYear)) * 100)),
            remaining: Math.max(0, stepsTargetYear - stepsTotal),
            achieved: stepsTotal >= stepsTargetYear,
          } as any;
          const workoutsTotal = monthly.reduce((s, m) => s + m.routines, 0);
          const workoutsTargetYear = monthly.reduce((s, m) => s + m.routinesTarget, 0);
          const routinesData: RoutineData = {
            current: workoutsTotal,
            target: workoutsTargetYear,
            progress: Math.min(100, Math.max(0, (workoutsTotal / Math.max(1, workoutsTargetYear)) * 100)),
            remaining: Math.max(0, workoutsTargetYear - workoutsTotal),
            achieved: workoutsTotal >= workoutsTargetYear,
          } as any;
          setPeriodData(prev => ({ ...prev, year: { steps: stepsData, routines: routinesData } }));
          return;
        }
      } catch (e) {
        logger.error('Failed computing health aggregates for period', selectedPeriod, e);
      }
    };

    compute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPeriod, selectedYear, stepGoal]);

  // Get current period data (prefer live aggregates)
  const currentData = periodData[selectedPeriod] || progressData[selectedPeriod];

  // Get period-specific title
  const getPeriodTitle = () => {
    switch (selectedPeriod) {
      case 'day': return 'Today';
      case 'week': return 'This Week';
      case 'month': return 'This Month';
      case 'year': return 'This Year';
      default: return 'This Month';
    }
  };

  // Get month name
  const getMonthName = (monthIndex: number) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                   'July', 'August', 'September', 'October', 'November', 'December'];
    return months[monthIndex];
  };

  // First name only for personalization
  const getFirstName = () => {
    if (profile?.first_name && profile.first_name.trim() !== "") {
      return profile.first_name.split(" ")[0];
    }
    if (profile?.display_name && profile.display_name.trim() !== "") {
      return profile.display_name.split(" ")[0];
    }
    return null;
  };

  // Dynamic motivational message based on current progress/consistency
  const getMotivationMessage = () => {
    const name = getFirstName();
    const stepsP = currentData?.steps?.progress ?? 0;
    const routinesP = currentData?.routines?.progress ?? 0;
    const score = (stepsP + routinesP) / 2;

    const you = name ?? "there";
    if (score >= 90) return `On fire, ${you}! Keep pushing 🔥`;
    if (score >= 75) return `Great momentum, ${you}! Almost there 💪`;
    if (score >= 50) return `Nice work, ${you}! Keep it going 👏`;
    if (score >= 25) return `You got this, ${you}! Small steps add up 🚶`;
    return `New day, ${you}. Let's get moving 💫`;
  };

  // Navigate months
  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (selectedMonth === 0) {
        setSelectedMonth(11);
        setSelectedYear(selectedYear - 1);
      } else {
        setSelectedMonth(selectedMonth - 1);
      }
    } else {
      if (selectedMonth === 11) {
        setSelectedMonth(0);
        setSelectedYear(selectedYear + 1);
      } else {
        setSelectedMonth(selectedMonth + 1);
      }
    }
  };

  // Render steps visualization based on period
  const renderStepsVisualization = () => {
    if (selectedPeriod === 'week' && currentData.steps.dailyBreakdown) {
      return (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-black">Daily Breakdown</h3>
          <div className="flex gap-3">
            {currentData.steps.dailyBreakdown.map((day, index) => (
              <div key={index} className="flex-1 text-center">
                <div className="text-xs font-medium text-black mb-2">{day.day}</div>
                <div className="relative">
                  <div 
                    className={`w-full rounded-lg transition-all duration-300 ${
                      day.achieved ? 'bg-warm-sage' : 'bg-warm-sage/20'
                    }`}
                    style={{
                      height: `${Math.max(20, (day.steps / Math.max(...currentData.steps.dailyBreakdown!.map(d => d.steps))) * 80)}px`
                    }}
                  />
                  {day.achieved && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-warm-sage rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full" />
                    </div>
                  )}
                </div>
                <div className="text-xs font-medium text-black mt-2">
                  {(day.steps / 1000).toFixed(0)}k
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    } else if (selectedPeriod === 'month' && currentData.steps.weeklyBreakdown) {
      return (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-black">Weekly Breakdown</h3>
          <div className="flex gap-3">
            {currentData.steps.weeklyBreakdown.map((week, index) => (
              <div key={index} className="flex-1 text-center">
                <div className="text-xs font-medium text-black mb-2">{week.week}</div>
                <div className="relative">
                  <div 
                    className={`w-full rounded-lg transition-all duration-300 ${
                      week.achieved ? 'bg-warm-sage' : 'bg-warm-sage/20'
                    }`}
                    style={{
                      height: `${Math.max(20, (week.steps / Math.max(...currentData.steps.weeklyBreakdown!.map(w => w.steps))) * 80)}px`
                    }}
                  />
                  {week.achieved && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-warm-sage rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full" />
                    </div>
                  )}
                </div>
                <div className="text-xs font-medium text-black mt-2">
                  {(week.steps / 1000).toFixed(0)}k
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }
    
    return null;
  };
  
  const renderMeasurementsCard = () => {
    return (
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-warm-peach/20 rounded-full flex items-center justify-center">
              <BarChart3 size={24} className="text-warm-peach" />
            </div>
            <h2 className="font-bold text-warm-brown text-xl">Body Measurements</h2>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-warm-brown/70">Track changes over time for weight, waist, chest and more.</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl border border-white/30 bg-white/60">
              <div className="text-xs text-warm-brown/60">Latest Weight</div>
              <div className="text-warm-brown font-semibold">—</div>
            </div>
            <div className="p-3 rounded-xl border border-white/30 bg-white/60">
              <div className="text-xs text-warm-brown/60">Latest Waist</div>
              <div className="text-warm-brown font-semibold">—</div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Render routine visualization for week view
  const renderRoutineVisualization = () => {
    if (selectedPeriod === 'week' && currentData.routines.dailyBreakdown) {
      return (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-black">Daily Routine Time</h3>
          <div className="flex gap-3">
            {currentData.routines.dailyBreakdown.map((day, index) => (
              <div key={index} className="flex-1 text-center">
                <div className="text-xs font-medium text-black mb-2">{day.day}</div>
                <div className="relative">
                  <div 
                    className={`w-full rounded-lg transition-all duration-300 ${
                      day.achieved ? 'bg-warm-coral' : 'bg-warm-coral/20'
                    }`}
                    style={{
                      height: `${Math.max(20, (day.timeSpent / Math.max(...currentData.routines.dailyBreakdown!.map(d => d.timeSpent))) * 80)}px`
                    }}
                  />
                  {day.achieved && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-warm-coral rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full" />
                    </div>
                  )}
                </div>
                <div className="text-xs font-medium text-black mt-2">
                  {day.timeSpent}m
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }
    
    return null;
  };

  // Render routine types based on period
  const renderRoutineTypes = () => {
    if (selectedPeriod === 'month' && currentData.routines.types) {
      return (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-black">Routine Types</h3>
          <div className="space-y-2">
            {currentData.routines.types.map((type, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-white/60 rounded-xl hover:bg-white/80 transition-all duration-200 border border-white/20">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 ${type.color} bg-current/10 rounded-full flex items-center justify-center`}>
                    <type.icon size={18} />
                  </div>
                  <span className="font-semibold text-black">{type.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-black">{type.count} times</span>
                  <ChevronRight size={16} className="text-black" />
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }
    
    return null;
  };

  // Render weekly targets for month view
  const renderWeeklyTargets = () => {
    if (selectedPeriod === 'month' && currentData.steps.weeklyBreakdown && currentData.routines.weeklyBreakdown) {
      return (
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-black">Weekly Steps Targets</h3>
            <div className="flex gap-3">
              {currentData.steps.weeklyBreakdown.map((week, index) => (
                <div key={index} className="flex-1 text-center">
                  <div className="text-xs font-medium text-black mb-2">{week.week}</div>
                  <div className="relative">
                    <div 
                      className={`w-full rounded-lg transition-all duration-300 ${
                        week.achieved ? 'bg-warm-sage' : 'bg-warm-sage/20'
                      }`}
                      style={{
                        height: `${Math.max(20, (week.steps / Math.max(...currentData.steps.weeklyBreakdown!.map(w => w.steps))) * 80)}px`
                      }}
                    />
                    {week.achieved && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-warm-sage rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full" />
                      </div>
                    )}
                  </div>
                  <div className="text-xs font-medium text-black mt-2">
                    {(week.steps / 1000).toFixed(0)}k
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-black">Weekly Routine Targets</h3>
            <div className="flex gap-3">
              {currentData.routines.weeklyBreakdown.map((week, index) => (
                <div key={index} className="flex-1 text-center">
                  <div className="text-xs font-medium text-black mb-2">{week.week}</div>
                  <div className="relative">
                    <div 
                      className={`w-full rounded-lg transition-all duration-300 ${
                        week.achieved ? 'bg-warm-coral' : 'bg-warm-coral/20'
                      }`}
                      style={{
                        height: `${Math.max(20, (week.timeSpent / Math.max(...currentData.routines.weeklyBreakdown!.map(w => w.timeSpent))) * 80)}px`
                      }}
                    />
                    {week.achieved && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-warm-coral rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full" />
                      </div>
                    )}
                  </div>
                  <div className="text-xs font-medium text-black mt-2">
                    {week.timeSpent}m
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }
    
    return null;
  };

  // Render year monthly breakdown with horizontal scroll (uses live monthlyYearData when available)
  const renderYearMonthlyBreakdown = () => {
    if (selectedPeriod === 'year') {
      return (
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-black">Monthly Steps Targets</h3>
            <div className="overflow-x-auto">
              <div className="flex gap-2 min-w-max">
                {(monthlyYearData || monthlyYearDataFallback).map((month, index) => (
                  <div key={index} className="w-16 text-center">
                    <div className="text-xs font-medium text-black mb-2">{month.month}</div>
                    <div className="relative">
                      <div 
                        className={`w-full rounded-lg transition-all duration-300 ${
                          month.stepsAchieved ? 'bg-warm-sage' : 'bg-warm-sage/20'
                        }`}
                        style={{
                          height: `${Math.max(20, (month.steps / Math.max(...(monthlyYearData || monthlyYearDataFallback).map(m => m.steps))) * 80)}px`
                        }}
                      />
                      {month.stepsAchieved && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-warm-sage rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full" />
                        </div>
                      )}
                    </div>
                    <div className="text-xs font-medium text-black mt-2">
                      {(month.steps / 1000).toFixed(0)}k
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-black">Monthly Routine Targets</h3>
            <div className="overflow-x-auto">
              <div className="flex gap-2 min-w-max">
                {(monthlyYearData || monthlyYearDataFallback).map((month, index) => (
                  <div key={index} className="w-16 text-center">
                    <div className="text-xs font-medium text-black mb-2">{month.month}</div>
                    <div className="relative">
                      <div 
                        className={`w-full rounded-lg transition-all duration-300 ${
                          month.routinesAchieved ? 'bg-warm-coral' : 'bg-warm-coral/20'
                        }`}
                        style={{
                          height: `${Math.max(20, (month.routines / Math.max(...(monthlyYearData || monthlyYearDataFallback).map(m => m.routines))) * 80)}px`
                        }}
                      />
                      {month.routinesAchieved && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-warm-coral rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full" />
                        </div>
                      )}
                    </div>
                    <div className="text-xs font-medium text-black mt-2">
                      {month.routines}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    return null;
  };

  // Render year calendar view
  const renderYearCalendar = () => {
    if (selectedPeriod === 'year') {
      const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
      const firstDayOfMonth = new Date(selectedYear, selectedMonth, 1).getDay();
      
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-black">Activity Calendar</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigateMonth('prev')}
                className="p-1 rounded-full hover:bg-white/20 transition-colors"
              >
                <ChevronRight size={16} className="text-black rotate-180" />
              </button>
              <span className="text-sm font-medium text-black min-w-[80px] text-center">
                {getMonthName(selectedMonth)} {selectedYear}
              </span>
              <button
                onClick={() => navigateMonth('next')}
                className="p-1 rounded-full hover:bg-white/20 transition-colors"
              >
                <ChevronRight size={16} className="text-black" />
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-7 gap-1">
            {/* Day headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-xs font-medium text-black text-center p-1">
                {day}
              </div>
            ))}
            
            {/* Empty cells for days before month starts */}
            {Array.from({ length: firstDayOfMonth }, (_, index) => (
              <div key={`empty-${index}`} className="w-8 h-8" />
            ))}
            
            {/* Days of the month */}
            {Array.from({ length: daysInMonth }, (_, dayIndex) => {
              const day = dayIndex + 1;
              const dateKey = `${selectedMonth + 1}/${day}`;
              const dayData = (yearCalendarData || yearCalendarDataFallback)[dateKey];
              
              if (!dayData) return <div key={day} className="w-8 h-8" />;
              
              const hasSteps = dayData.steps;
              const hasRoutines = dayData.routines;
              
              return (
                <div key={day} className="relative w-8 h-8 flex items-center justify-center">
                  <span className="text-xs text-black">{day}</span>
                  {hasSteps && (
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-warm-sage rounded-full" />
                  )}
                  {hasRoutines && (
                    <div className="absolute bottom-0 right-1/2 transform translate-x-1/2 w-2 h-2 bg-warm-coral rounded-full" />
                  )}
                </div>
              );
            })}
          </div>
          
          <div className="flex items-center gap-4 text-xs text-black justify-center">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-warm-sage rounded-full" />
              <span>Steps</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-warm-coral rounded-full" />
              <span>Routines</span>
            </div>
          </div>
        </div>
      );
    }
    
    return null;
  };

  // Render today's routines for day view
  const renderTodaysRoutines = () => {
    if (selectedPeriod === 'day') {
      return (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-black">Today's Workouts</h3>
          <div className="p-4 bg-white/60 rounded-xl border border-white/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-warm-coral/20 rounded-full flex items-center justify-center">
                <Dumbbell size={18} className="text-black" />
              </div>
              <div>
                <span className="font-semibold text-black">{workoutsLoading ? 'Loading…' : `${workoutCount} workout${workoutCount === 1 ? '' : 's'}`}</span>
                <div className="text-xs text-black">{workoutsLoading ? '' : `${workoutMinutes} min total`}</div>
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    return null;
  };

  const resolvedCategory: ActivityCategory =
    selectedMetric === 'measurements' ? 'body' : selectedMetric;
  const resolvedTimeRange: TimeRange =
    selectedRange === 'week' ? 'week' : selectedRange === '3m' ? 'threeMonths' : 'sixMonths';

  const handleMetricSelect = (value: MetricCategory) => {
    setSelectedMetric(value);
    if (value === 'strength') {
      setSelectedStrengthFocus('all');
    } else if (value === 'cardio') {
      setSelectedCardioFocus('all');
    }
    setIsMetricMenuOpen(false);
  };

  useEffect(() => {
    if (!isMetricMenuOpen) return;

    const handleOutsideClick = (event: MouseEvent | TouchEvent) => {
      if (metricDropdownRef.current && !metricDropdownRef.current.contains(event.target as Node)) {
        setIsMetricMenuOpen(false);
      }
    };

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMetricMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    document.addEventListener('keydown', handleEsc);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isMetricMenuOpen]);

  const renderFocusChipRow = (
    options: Array<{ value: string; label: string; icon: LucideIcon }>,
    activeValue: string,
    onSelect: (value: string) => void,
  ) => (
    <Section variant="plain" padding="none">
      <div className="px-1">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {options.map(({ value, label, icon: Icon }) => {
            const isActive = activeValue === value;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={isActive}
                onClick={() => onSelect(value)}
                className={`flex items-center gap-2 flex-shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-[var(--brand-orange)] text-white shadow-sm'
                    : 'bg-white/80 text-[var(--brand-orange-strong)] border border-white/50 hover:bg-[var(--brand-orange-subtle)]/80'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </Section>
  );

  return (
    <AppScreen
      header={null}
      maxContent="responsive"
      showHeaderBorder={false}
      showBottomBarBorder={false}
      bottomBar={bottomBar}
      bottomBarSticky
      contentClassName=""
      headerInScrollArea={true}
    >
      <Stack gap="fluid">
        {/* Motivational greeting with first name */}
        {(
          <Section variant="plain" padding="none">
            <div className="px-1">
              <h2 className="text-2xl font-bold text-black">{getMotivationMessage()}</h2>
            </div>
          </Section>
        )}

        {/* Metric Dropdown (orange) */}
        <Section variant="plain" padding="none">
          <div className="px-1">
            <span className="sr-only" id="metric-focus-label">Metric Focus</span>
            <div ref={metricDropdownRef} className="relative w-full">
              <button
                type="button"
                aria-labelledby="metric-focus-label"
                aria-haspopup="listbox"
                aria-expanded={isMetricMenuOpen}
                onClick={() => setIsMetricMenuOpen((open) => !open)}
                className="group flex w-full items-center justify-between gap-4 rounded-3xl bg-[var(--brand-orange-soft)] px-5 py-4 text-left text-black transition"
                style={{
                  boxShadow: "0 12px 24px -12px rgba(224, 122, 95, 0.5)",
                  border: "1px solid var(--brand-orange)",
                  borderRadius: "1.5rem",
                }}
              >
                <span className="text-lg font-semibold tracking-wide text-black">
                  {METRIC_OPTIONS.find((option) => option.value === selectedMetric)?.label ?? 'Select'}
                </span>
                <ChevronDown
                  className={`h-5 w-5 transition-transform duration-200 ${isMetricMenuOpen ? 'rotate-180' : ''}`}
                  style={{ color: "#1f1f1f", opacity: 0.6 }}
                />
              </button>
              {isMetricMenuOpen && (
                <div
                  className="absolute inset-x-0 top-full z-20 mt-3 overflow-hidden rounded-3xl border bg-white/95 shadow-2xl backdrop-blur"
                  style={{ borderColor: "var(--brand-orange-subtle)", boxShadow: "0 18px 30px -18px rgba(224, 122, 95, 0.3)" }}
                >
                  <ul
                    role="listbox"
                    aria-labelledby="metric-focus-label"
                    className="divide-y divide-white/40"
                  >
                    {METRIC_OPTIONS.map((option) => (
                      <li key={option.value}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={selectedMetric === option.value}
                          onClick={() => handleMetricSelect(option.value)}
                          className={`flex w-full items-center justify-between px-5 py-3 text-sm font-medium transition-colors duration-150 ${
                            selectedMetric === option.value
                              ? 'bg-[var(--brand-orange-subtle)] text-black'
                              : 'text-black/70 hover:bg-[var(--brand-orange-subtle)] hover:text-black'
                          }`}
                        >
                          <span>{option.label}</span>
                          {selectedMetric === option.value && (
                            <Check className="h-4 w-4" style={{ color: "var(--brand-orange-strong)" }} />
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </Section>

        {/* Range Toggle: Week / 3 Month / 6 Months */}
        <Section variant="plain" padding="none">
          <div className="flex bg-white/60 rounded-2xl p-1 border border-white/20">
            {([
              { key: 'week', label: 'Week' },
              { key: '3m', label: '3 Month' },
              { key: '6m', label: '6 Months' },
            ] as const).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setSelectedRange(key)}
                className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  selectedRange === key
                    ? 'bg-warm-sage text-black shadow-md'
                    : 'text-black hover:text-black hover:bg-white/40'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </Section>

        {selectedMetric === 'strength' &&
          renderFocusChipRow(MUSCLE_GROUP_FOCUS_OPTIONS, selectedStrengthFocus, setSelectedStrengthFocus)}
        {selectedMetric === 'cardio' &&
          renderFocusChipRow(CARDIO_FOCUS_OPTIONS, selectedCardioFocus, setSelectedCardioFocus)}

        <ProgressDetailSection
          category={resolvedCategory}
          timeRange={resolvedTimeRange}
          defaultCompare={selectedMetric !== 'measurements'}
          strengthFocus={selectedMetric === 'strength' ? (selectedStrengthFocus as MuscleGroup) : undefined}
          cardioFocus={selectedMetric === 'cardio' ? selectedCardioFocus : undefined}
        />

        {/* Steps Overview Card - only when selected */}
        {(selectedMetric === 'cardio') && selectedPeriod !== 'month' && selectedPeriod !== 'year' && (
          <Section variant="plain" padding="none">
            <MetricCard
              icon={Footprints}
              iconClassName="text-warm-sage"
              iconBgClassName="bg-warm-sage/20"
              title={`${getPeriodTitle()} Steps`}
              subtitle={`Goal: ${(selectedPeriod==='day' ? stepGoal : currentData.steps.target).toLocaleString()}`}
              rightNode={selectedPeriod === 'day' ? (
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${((stepsLoading ? false : steps >= stepGoal)) ? 'bg-warm-sage' : 'bg-warm-sage/20'}`}>
                  {((stepsLoading ? false : steps >= stepGoal)) ? (
                    <Check size={20} className="text-white" />
                  ) : (
                    <div className="w-4 h-4 border-2 border-warm-sage rounded-sm" />
                  )}
                </div>
              ) : (
                <Badge className={`${currentData.steps.achieved ? 'bg-warm-sage' : 'bg-warm-sage/20'} text-warm-sage border-warm-sage/30 px-3 py-1 text-sm font-semibold`}>
                  {currentData.steps.progress.toFixed(0)}%
                </Badge>
              )}
              valueNode={<span className="text-4xl font-bold text-warm-brown">{(selectedPeriod==='day' ? steps : currentData.steps.current).toLocaleString()}</span>}
              helperNode={<span className="text-sm font-medium text-warm-brown/60">{selectedPeriod==='day' ? (stepsLoading ? 'Loading…' : steps < stepGoal ? `${(stepGoal - steps).toLocaleString()} remaining` : 'Goal achieved! 🎉') : currentData.steps.remaining > 0 ? `${currentData.steps.remaining.toLocaleString()} remaining` : 'Goal achieved! 🎉'}</span>}
              progress={selectedPeriod==='day' ? Math.min(100, Math.max(0, (steps / Math.max(1, stepGoal)) * 100)) : currentData.steps.progress}
              progressTrackClassName="bg-warm-sage/20"
              progressColorVar="hsl(var(--warm-sage))"
            >
              {renderStepsVisualization()}
            </MetricCard>
          </Section>
        )}

        {/* Workouts Overview Card - only when selected */}
        {(selectedMetric === 'strength') && selectedPeriod !== 'month' && selectedPeriod !== 'year' && (
          <Section variant="plain" padding="none">
            <MetricCard
              icon={Dumbbell}
              iconClassName="text-warm-coral"
              iconBgClassName="bg-warm-coral/20"
              title={`${getPeriodTitle()} Workouts`}
              subtitle={`Goal: ${selectedPeriod==='day' ? 1 : currentData.routines.target} ${selectedPeriod==='day' ? 'workout' : 'routines'}`}
              rightNode={selectedPeriod === 'day' ? (
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${(workoutsLoading ? false : workoutCount >= 1) ? 'bg-warm-coral' : 'bg-warm-coral/20'}`}>
                  {(workoutsLoading ? false : workoutCount >= 1) ? (
                    <Check size={20} className="text-white" />
                  ) : (
                    <div className="w-4 h-4 border-2 border-warm-coral rounded-sm" />
                  )}
                </div>
              ) : (
                <Badge className={`${currentData.routines.achieved ? 'bg-warm-coral' : 'bg-warm-coral/20'} text-warm-coral border-warm-coral/30 px-3 py-1 text-sm font-semibold`}>
                  {currentData.routines.progress.toFixed(0)}%
                </Badge>
              )}
              valueNode={selectedPeriod !== 'day' ? (
                <span className="text-4xl font-bold text-warm-brown">{currentData.routines.current}</span>
              ) : undefined}
              helperNode={selectedPeriod !== 'day' ? (
                <span className="text-sm font-medium text-warm-brown/60">{currentData.routines.remaining > 0 ? `${currentData.routines.remaining} more to go` : 'Target exceeded! 🚀'}</span>
              ) : undefined}
              progress={selectedPeriod !== 'day' ? currentData.routines.progress : undefined}
              progressTrackClassName="bg-warm-coral/20"
              progressColorVar="hsl(var(--warm-coral))"
            >
              {renderTodaysRoutines()}
              {renderRoutineVisualization()}
              {renderRoutineTypes()}
            </MetricCard>
          </Section>
        )}

        {/* Measurements Overview Card - only when selected */}
        {(selectedMetric === 'measurements') && (
          <Section variant="plain" padding="none">
            {renderMeasurementsCard()}
          </Section>
        )}

        {/* Month View - Routine Types (show only if types exist) */}
        {selectedPeriod === 'month' && (currentData.routines.types && currentData.routines.types.length > 0) && (
          <Section variant="plain" padding="none">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-warm-coral/20 rounded-full flex items-center justify-center">
                    <Dumbbell size={24} className="text-black" />
                  </div>
                  <h2 className="font-bold text-black text-xl">Routine Types</h2>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {renderRoutineTypes()}
              </CardContent>
            </Card>
          </Section>
        )}

        {/* Year View - Monthly Breakdown */}
        {selectedPeriod === 'year' && (
          <Section variant="plain" padding="none">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-warm-peach/20 rounded-full flex items-center justify-center">
                    <BarChart3 size={24} className="text-black" />
                  </div>
                  <h2 className="font-bold text-black text-xl">Monthly Breakdown</h2>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {renderYearMonthlyBreakdown()}
              </CardContent>
            </Card>
          </Section>
        )}

        {/* Year View - Calendar */}
        {selectedPeriod === 'year' && (
          <Section variant="plain" padding="none">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-warm-mint/20 rounded-full flex items-center justify-center">
                    <Calendar size={24} className="text-black" />
                  </div>
                  <h2 className="font-bold text-black text-xl">Activity Calendar</h2>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {renderYearCalendar()}
              </CardContent>
            </Card>
          </Section>
        )}
      </Stack>
    </AppScreen>
  );
}
