import { Card, CardContent, CardHeader } from "../ui/card";
import { CircularProgress } from "../CircularProgress";
import { TrendChart } from "../TrendChart";
import { Progress } from "../ui/progress";
import { TrendingUp, Calendar, Target, Award, Zap, Medal, Trophy } from "lucide-react";
import { Badge } from "../ui/badge";
import { supabaseAPI, Workout } from "../../utils/supabase/supabase-api";
import { useState, useEffect } from "react";
import { useScrollToTop } from "../../hooks/useScrollToTop";
import { useKeyboardInset } from "../../hooks/useKeyboardInset";

const weeklyData = [
  { week: "W1", workouts: 3 },
  { week: "W2", workouts: 4 },
  { week: "W3", workouts: 2 },
  { week: "W4", workouts: 5 },
  { week: "W5", workouts: 4 },
  { week: "W6", workouts: 6 }
];

const achievements = [
  {
    id: "1",
    title: "Consistency Champion",
    description: "5 workout streak achieved!",
    icon: Zap,
    color: "var(--warm-coral)",
    bgColor: "var(--warm-coral)/10",
    date: "2 days ago"
  },
  {
    id: "2",
    title: "Volume Milestone", 
    description: "Lifted 25,000 lbs this month",
    icon: Trophy,
    color: "var(--warm-sage)",
    bgColor: "var(--warm-sage)/10",
    date: "1 week ago"
  },
  {
    id: "3",
    title: "Personal Best",
    description: "New bench press record: 225 lbs",
    icon: Medal,
    color: "var(--warm-peach)",
    bgColor: "var(--warm-peach)/10", 
    date: "2 weeks ago"
  }
];

export function ProgressScreen() {
  // Scroll to top when component mounts
  const scrollRef = useScrollToTop();
  // Keyboard-aware scrolling
  useKeyboardInset();
  
  const [recentWorkouts, setRecentWorkouts] = useState<Workout[]>([]);
  const [workoutStats, setWorkoutStats] = useState({
    thisWeekCount: 0,
    totalMinutes: 0,
    monthlyCount: 16,
    monthlyTarget: 20
  });
  const [isLoading, setIsLoading] = useState(false);

  // Fetch recent workouts and compute stats
  useEffect(() => {
    const fetchProgressData = async () => {
      setIsLoading(true);
      try {
        const workouts = await supabaseAPI.getRecentWorkouts();
        setRecentWorkouts(workouts);
        
        // Compute stats from workouts
        const now = new Date();
        const thisWeekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
        
        const thisWeekWorkouts = workouts.filter(workout => 
          new Date(workout.started_at) >= thisWeekStart
        );
        
        const totalMinutes = workouts.reduce((sum, workout) => 
          sum + (workout.duration_minutes || 0), 0
        );
        
        setWorkoutStats({
          thisWeekCount: thisWeekWorkouts.length,
          totalMinutes,
          monthlyCount: Math.min(workouts.length, 20), // Cap at target for demo
          monthlyTarget: 20
        });
      } catch (error) {
        console.error("Failed to fetch progress data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProgressData();
  }, []);

  return (
    <div ref={scrollRef} className="pt-safe p-6 space-y-6 max-w-md mx-auto pb-20">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <TrendingUp size={24} className="text-[var(--warm-sage)]" />
          <h1 className="text-2xl font-medium text-[var(--warm-brown)]">Progress</h1>
        </div>
        <p className="text-[var(--warm-brown)]/70">Track your fitness journey</p>
      </div>

      {/* Main Stat Cards with Circular Progress */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-white/80 backdrop-blur-sm">
          <CardContent className="p-6 flex flex-col items-center">
            {isLoading ? (
              <div className="text-[var(--warm-brown)]/60">Loading...</div>
            ) : (
              <CircularProgress 
                value={workoutStats.thisWeekCount} 
                max={6} 
                size={100} 
                label="Workouts"
                sublabel="This Week"
                color="var(--warm-coral)"
              />
            )}
          </CardContent>
        </Card>
        
        <Card className="bg-white/80 backdrop-blur-sm">
          <CardContent className="p-6 flex flex-col items-center">
            {isLoading ? (
              <div className="text-[var(--warm-brown)]/60">Loading...</div>
            ) : (
              <CircularProgress 
                value={workoutStats.totalMinutes} 
                max={400} 
                size={100} 
                label="Minutes"
                sublabel="Total Time"
                color="var(--warm-sage)"
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Progress */}
      <Card className="bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar size={20} className="text-[var(--warm-peach)]" />
            <h2 className="font-medium text-[var(--warm-brown)]">This Month</h2>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Target vs Completed */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-[var(--warm-brown)]/70">Workouts Progress</span>
              <Badge className="bg-[var(--warm-sage)]/10 text-[var(--warm-sage)]">
                {workoutStats.monthlyCount} / {workoutStats.monthlyTarget}
              </Badge>
            </div>
            <Progress value={(workoutStats.monthlyCount / workoutStats.monthlyTarget) * 100} className="h-2" />
          </div>

          {/* Streak */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-[var(--warm-brown)]/70">Current Streak</span>
              <Badge className="bg-[var(--warm-coral)]/10 text-[var(--warm-coral)]">5 days</Badge>
            </div>
            <Progress value={71} className="h-2" />
          </div>

          {/* Volume */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-[var(--warm-brown)]/70">Total Volume</span>
              <Badge className="bg-[var(--warm-peach)]/10 text-[var(--warm-brown)]">24,500 lbs</Badge>
            </div>
            <Progress value={82} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Achievements */}
      <Card className="bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Award size={20} className="text-[var(--warm-mint)]" />
            <h2 className="font-medium text-[var(--warm-brown)]">Recent Achievements</h2>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {achievements.map((achievement) => (
            <div key={achievement.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--soft-gray)]/50 transition-colors">
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ backgroundColor: achievement.bgColor }}
              >
                <achievement.icon size={20} style={{ color: achievement.color }} />
              </div>
              <div className="flex-1">
                <div className="font-medium text-[var(--warm-brown)]">{achievement.title}</div>
                <div className="text-sm text-[var(--warm-brown)]/60">{achievement.description}</div>
              </div>
              <div className="text-xs text-[var(--warm-brown)]/40">
                {achievement.date}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Trend Chart */}
      <Card className="bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp size={20} className="text-[var(--warm-coral)]" />
            <h2 className="font-medium text-[var(--warm-brown)]">Weekly Trend</h2>
          </div>
        </CardHeader>
        <CardContent>
          <TrendChart data={weeklyData} height={120} />
          <div className="mt-4 text-center">
            <div className="text-sm text-[var(--warm-brown)]/60">
              You're trending upward! Keep up the great work.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}