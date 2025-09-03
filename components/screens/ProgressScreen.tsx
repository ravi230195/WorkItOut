// components/screens/ProgressScreen.tsx
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Progress } from "../ui/progress";
import { TrendingUp, Calendar, Award, Zap, Medal, Trophy, Footprints, Activity, Target, BarChart3, Star, Flame, Rocket, ChevronRight, Check, Dumbbell } from "lucide-react";
import { Badge } from "../ui/badge";
import { supabaseAPI, Workout } from "../../utils/supabase/supabase-api";
import { AppScreen, Section, ScreenHeader, Stack, Spacer } from "../layouts";
import { logger } from "../../utils/logging";

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

// Comprehensive data for different time periods
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
        { name: "Walking", count: 121, icon: Footprints, color: "text-warm-sage", target: 150 },
        { name: "Running", count: 62, icon: Activity, color: "text-warm-coral", target: 80 },
        { name: "Cycling", count: 33, icon: Activity, color: "text-warm-peach", target: 40 },
        { name: "Strength", count: 45, icon: Dumbbell, color: "text-warm-mint", target: 50 }
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

// Mock monthly data for year view
const monthlyYearData = [
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

// Mock calendar data for year view
const generateYearCalendarData = () => {
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

const yearCalendarData = generateYearCalendarData();

export function ProgressScreen({ bottomBar }: ProgressScreenProps) {
  const [recentWorkouts, setRecentWorkouts] = useState<Workout[]>([]);
  const [workoutStats, setWorkoutStats] = useState({
    thisWeekCount: 0,
    totalMinutes: 0,
    monthlyCount: 16,
    monthlyTarget: 20,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

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
  }, []);

  // Get current period data
  const currentData = progressData[selectedPeriod];

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
          <h3 className="text-sm font-semibold text-warm-brown/80">Daily Breakdown</h3>
          <div className="flex gap-3">
            {currentData.steps.dailyBreakdown.map((day, index) => (
              <div key={index} className="flex-1 text-center">
                <div className="text-xs font-medium text-warm-brown/60 mb-2">{day.day}</div>
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
                <div className="text-xs font-medium text-warm-brown/70 mt-2">
                  {(day.steps / 1000).toFixed(1)}k
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    } else if (selectedPeriod === 'month' && currentData.steps.weeklyBreakdown) {
      return (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-warm-brown/80">Weekly Breakdown</h3>
          <div className="flex gap-3">
            {currentData.steps.weeklyBreakdown.map((week, index) => (
              <div key={index} className="flex-1 text-center">
                <div className="text-xs font-medium text-warm-brown/60 mb-2">{week.week}</div>
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
                <div className="text-xs font-medium text-warm-brown/70 mt-2">
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

  // Render routine visualization for week view
  const renderRoutineVisualization = () => {
    if (selectedPeriod === 'week' && currentData.routines.dailyBreakdown) {
      return (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-warm-brown/80">Daily Routine Time</h3>
          <div className="flex gap-3">
            {currentData.routines.dailyBreakdown.map((day, index) => (
              <div key={index} className="flex-1 text-center">
                <div className="text-xs font-medium text-warm-brown/60 mb-2">{day.day}</div>
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
                <div className="text-xs font-medium text-warm-brown/70 mt-2">
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
          <h3 className="text-sm font-semibold text-warm-brown/80">Routine Types</h3>
          <div className="space-y-2">
            {currentData.routines.types.map((type, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-white/60 rounded-xl hover:bg-white/80 transition-all duration-200 border border-white/20">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 ${type.color} bg-current/10 rounded-full flex items-center justify-center`}>
                    <type.icon size={18} />
                  </div>
                  <span className="font-semibold text-warm-brown">{type.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-warm-brown/70">{type.count} times</span>
                  <ChevronRight size={16} className="text-warm-brown/40" />
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
            <h3 className="text-sm font-semibold text-warm-brown/80">Weekly Steps Targets</h3>
            <div className="flex gap-3">
              {currentData.steps.weeklyBreakdown.map((week, index) => (
                <div key={index} className="flex-1 text-center">
                  <div className="text-xs font-medium text-warm-brown/60 mb-2">{week.week}</div>
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
                  <div className="text-xs font-medium text-warm-brown/70 mt-2">
                    {(week.steps / 1000).toFixed(0)}k
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-warm-brown/80">Weekly Routine Targets</h3>
            <div className="flex gap-3">
              {currentData.routines.weeklyBreakdown.map((week, index) => (
                <div key={index} className="flex-1 text-center">
                  <div className="text-xs font-medium text-warm-brown/60 mb-2">{week.week}</div>
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
                  <div className="text-xs font-medium text-warm-brown/70 mt-2">
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

  // Render year monthly breakdown with horizontal scroll
  const renderYearMonthlyBreakdown = () => {
    if (selectedPeriod === 'year') {
      return (
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-warm-brown/80">Monthly Steps Targets</h3>
            <div className="overflow-x-auto">
              <div className="flex gap-2 min-w-max">
                {monthlyYearData.map((month, index) => (
                  <div key={index} className="w-16 text-center">
                    <div className="text-xs font-medium text-warm-brown/60 mb-2">{month.month}</div>
                    <div className="relative">
                      <div 
                        className={`w-full rounded-lg transition-all duration-300 ${
                          month.stepsAchieved ? 'bg-warm-sage' : 'bg-warm-sage/20'
                        }`}
                        style={{
                          height: `${Math.max(20, (month.steps / Math.max(...monthlyYearData.map(m => m.steps))) * 80)}px`
                        }}
                      />
                      {month.stepsAchieved && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-warm-sage rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full" />
                        </div>
                      )}
                    </div>
                    <div className="text-xs font-medium text-warm-brown/70 mt-2">
                      {(month.steps / 1000).toFixed(0)}k
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-warm-brown/80">Monthly Routine Targets</h3>
            <div className="overflow-x-auto">
              <div className="flex gap-2 min-w-max">
                {monthlyYearData.map((month, index) => (
                  <div key={index} className="w-16 text-center">
                    <div className="text-xs font-medium text-warm-brown/60 mb-2">{month.month}</div>
                    <div className="relative">
                      <div 
                        className={`w-full rounded-lg transition-all duration-300 ${
                          month.routinesAchieved ? 'bg-warm-coral' : 'bg-warm-coral/20'
                        }`}
                        style={{
                          height: `${Math.max(20, (month.routines / Math.max(...monthlyYearData.map(m => m.routines))) * 80)}px`
                        }}
                      />
                      {month.routinesAchieved && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-warm-coral rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full" />
                        </div>
                      )}
                    </div>
                    <div className="text-xs font-medium text-warm-brown/70 mt-2">
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
            <h3 className="text-sm font-semibold text-warm-brown/80">Activity Calendar</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigateMonth('prev')}
                className="p-1 rounded-full hover:bg-white/20 transition-colors"
              >
                <ChevronRight size={16} className="text-warm-brown/60 rotate-180" />
              </button>
              <span className="text-sm font-medium text-warm-brown/80 min-w-[80px] text-center">
                {getMonthName(selectedMonth)} {selectedYear}
              </span>
              <button
                onClick={() => navigateMonth('next')}
                className="p-1 rounded-full hover:bg-white/20 transition-colors"
              >
                <ChevronRight size={16} className="text-warm-brown/60" />
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-7 gap-1">
            {/* Day headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-xs font-medium text-warm-brown/60 text-center p-1">
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
              const dayData = yearCalendarData[dateKey];
              
              if (!dayData) return <div key={day} className="w-8 h-8" />;
              
              const hasSteps = dayData.steps;
              const hasRoutines = dayData.routines;
              
              return (
                <div key={day} className="relative w-8 h-8 flex items-center justify-center">
                  <span className="text-xs text-warm-brown/60">{day}</span>
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
          
          <div className="flex items-center gap-4 text-xs text-warm-brown/60 justify-center">
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
          <h3 className="text-sm font-semibold text-warm-brown/80">Today's Routines</h3>
          <div className="space-y-2">
            {todaysRoutines.map((routine, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-white/60 rounded-xl border border-white/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-warm-coral/20 rounded-full flex items-center justify-center">
                    <Dumbbell size={18} className="text-warm-coral" />
                  </div>
                  <div>
                    <span className="font-semibold text-warm-brown">{routine.name}</span>
                    <div className="text-xs text-warm-brown/60">{routine.type}</div>
                  </div>
                </div>
                <div className="text-sm font-medium text-warm-brown/70">
                  {routine.duration} min
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }
    
    return null;
  };

  return (
    <AppScreen
      header={<ScreenHeader title="Progress"
        showBorder={false}
        denseSmall
        contentHeightPx={74} 
        titleClassName="text-[17px] font-bold"/>}
      maxContent="responsive"
      showHeaderBorder={false}
      showBottomBarBorder={false}
      bottomBar={bottomBar}
      bottomBarSticky
      contentClassName=""
      headerInScrollArea={true}
    >
      <Stack gap="fluid">
        {/* Period Selector */}
        <Section variant="plain" padding="none">
          <div className="flex bg-white/60 rounded-2xl p-1 border border-white/20">
            {(['day', 'week', 'month', 'year'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  selectedPeriod === period
                    ? 'bg-warm-sage text-white shadow-md'
                    : 'text-warm-brown/70 hover:text-warm-brown/90 hover:bg-white/40'
                }`}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </button>
            ))}
          </div>
        </Section>

        {/* Month View - Weekly Targets at Top */}
        {selectedPeriod === 'month' && (
          <Section variant="plain" padding="none">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-warm-peach/20 rounded-full flex items-center justify-center">
                    <BarChart3 size={24} className="text-warm-peach" />
                  </div>
                  <h2 className="font-bold text-warm-brown text-xl">Weekly Targets</h2>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {renderWeeklyTargets()}
              </CardContent>
            </Card>
          </Section>
        )}

        {/* Steps Overview Card - Hidden for Month and Year */}
        {selectedPeriod !== 'month' && selectedPeriod !== 'year' && (
          <Section variant="plain" padding="none">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader className="pb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-warm-sage/20 rounded-full flex items-center justify-center">
                      <Footprints size={24} className="text-warm-sage" />
                    </div>
                    <div>
                      <h2 className="font-bold text-warm-brown text-xl">{getPeriodTitle()} Steps</h2>
                      <p className="text-sm text-warm-brown/60">Goal: {currentData.steps.target.toLocaleString()}</p>
                    </div>
                  </div>
                  {selectedPeriod === 'day' ? (
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      currentData.steps.achieved ? 'bg-warm-sage' : 'bg-warm-sage/20'
                    }`}>
                      {currentData.steps.achieved ? (
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
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Steps Progress */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-4xl font-bold text-warm-brown">
                      {currentData.steps.current.toLocaleString()}
                    </span>
                    <span className="text-sm font-medium text-warm-brown/60">
                      {currentData.steps.remaining > 0 
                        ? `${currentData.steps.remaining.toLocaleString()} remaining`
                        : 'Goal achieved! 🎉'
                      }
                    </span>
                  </div>
                  {/* Progress bar - Always shown for steps */}
                  <Progress
                    value={currentData.steps.progress}
                    className="h-4 bg-warm-sage/20 rounded-full"
                    style={{
                      '--progress-color': 'hsl(var(--warm-sage))'
                    } as React.CSSProperties}
                  />
                </div>

                {/* Dynamic Visualization */}
                {renderStepsVisualization()}
              </CardContent>
            </Card>
          </Section>
        )}

        {/* Routines Overview Card - Hidden for Month and Year */}
        {selectedPeriod !== 'month' && selectedPeriod !== 'year' && (
          <Section variant="plain" padding="none">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader className="pb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-warm-coral/20 rounded-full flex items-center justify-center">
                      <Dumbbell size={24} className="text-warm-coral" />
                    </div>
                    <div>
                      <h2 className="font-bold text-warm-brown text-xl">{getPeriodTitle()} Routines</h2>
                      <p className="text-sm text-warm-brown/60">Goal: {currentData.routines.target} routines</p>
                    </div>
                  </div>
                  {selectedPeriod === 'day' ? (
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      currentData.routines.achieved ? 'bg-warm-coral' : 'bg-warm-coral/20'
                    }`}>
                      {currentData.routines.achieved ? (
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
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Routines Progress - Hidden for Day view */}
                {selectedPeriod !== 'day' && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-4xl font-bold text-warm-brown">
                        {currentData.routines.current}
                      </span>
                      <span className="text-sm font-medium text-warm-brown/60">
                        {currentData.routines.remaining > 0 
                          ? `${currentData.routines.remaining} more to go`
                          : 'Target exceeded! 🚀'
                        }
                      </span>
                    </div>
                    <Progress
                      value={currentData.routines.progress}
                      className="h-4 bg-warm-coral/20 rounded-full"
                      style={{
                        '--progress-color': 'hsl(var(--warm-coral))'
                      } as React.CSSProperties}
                    />
                  </div>
                )}

                {/* Today's Routines for Day View */}
                {renderTodaysRoutines()}

                {/* Dynamic Routine Visualization */}
                {renderRoutineVisualization()}

                {/* Dynamic Routine Types */}
                {renderRoutineTypes()}
              </CardContent>
            </Card>
          </Section>
        )}

        {/* Month View - Routine Types */}
        {selectedPeriod === 'month' && (
          <Section variant="plain" padding="none">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-warm-coral/20 rounded-full flex items-center justify-center">
                    <Dumbbell size={24} className="text-warm-coral" />
                  </div>
                  <h2 className="font-bold text-warm-brown text-xl">Routine Types</h2>
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
                    <BarChart3 size={24} className="text-warm-peach" />
                  </div>
                  <h2 className="font-bold text-warm-brown text-xl">Monthly Breakdown</h2>
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
                    <Calendar size={24} className="text-warm-mint" />
                  </div>
                  <h2 className="font-bold text-warm-brown text-xl">Activity Calendar</h2>
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
