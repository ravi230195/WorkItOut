import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "./ui/card";
import { TactileButton } from "./TactileButton";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Badge } from "./ui/badge";
import {
  User,
  Trophy,
  Target,
  Zap,
  Calendar,
  Settings,
  LogOut,
  Dumbbell,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "./AuthContext";
import { supabaseAPI, Profile } from "../utils/supabase-api";
import { toast } from "sonner";

interface PersonalBest {
  exercise: string;
  weight: number;
  reps: number;
  date: string;
}

export function ProfileScreen() {
  const { userToken, signOut: authSignOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Personal bests (these could be loaded from Supabase in the future)
  const personalBests: PersonalBest[] = [
    { exercise: "Bench Press", weight: 225, reps: 5, date: "2 weeks ago" },
    { exercise: "Squat", weight: 315, reps: 3, date: "1 week ago" },
    { exercise: "Deadlift", weight: 405, reps: 1, date: "3 days ago" },
  ];

  // Fetch profile data on mount
  useEffect(() => {
    const fetchProfile = async () => {
      if (!userToken) return;
      
      setIsLoading(true);
      try {
        const profileData = await supabaseAPI.getMyProfile();
        setProfile(profileData);
      } catch (error) {
        console.error("Failed to fetch profile:", error);
        if (error instanceof Error && error.message === "UNAUTHORIZED") {
          toast.error("Session expired. Please sign in.");
        } else {
          toast.error("Failed to load profile data.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [userToken]);

  const handleSignOut = async () => {
    if (isSigningOut) return;
    
    setIsSigningOut(true);
    try {
      // Call Supabase sign out
      await supabaseAPI.signOut();
      
      // Clear local auth state
      authSignOut();
      
      toast.success("Signed out successfully");
    } catch (error) {
      console.error("Sign out failed:", error);
      // Still clear local state even if API call fails
      authSignOut();
      toast.success("Signed out successfully");
    } finally {
      setIsSigningOut(false);
    }
  };

  const getDisplayName = () => {
    if (profile?.display_name) {
      return profile.display_name;
    }
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    }
    if (profile?.first_name) {
      return profile.first_name;
    }
    return "User";
  };

  const getInitials = () => {
    const displayName = getDisplayName();
    const names = displayName.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return displayName.slice(0, 2).toUpperCase();
  };

  return (
    <div className="p-6 space-y-6 max-w-md mx-auto pb-24">
      {/* Profile Header */}
      <Card className="bg-gradient-to-r from-[var(--warm-coral)]/10 to-[var(--warm-peach)]/10 border-[var(--warm-coral)]/20">
        <CardContent className="p-6 text-center">
          <Avatar className="w-20 h-20 mx-auto mb-4 bg-[var(--warm-coral)] text-white">
            <AvatarFallback className="bg-[var(--warm-coral)] text-white text-lg">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          
          {isLoading ? (
            <div className="text-[var(--warm-brown)]/60">Loading profile...</div>
          ) : (
            <>
              <h1 className="text-xl font-medium text-[var(--warm-brown)] mb-2">
                {getDisplayName()}
              </h1>
              {profile?.height_cm && profile?.weight_kg && (
                <div className="flex justify-center gap-4 text-sm text-[var(--warm-brown)]/60">
                  <span>{profile.height_cm} cm</span>
                  <span>•</span>
                  <span>{profile.weight_kg} kg</span>
                </div>
              )}
            </>
          )}
          
          <div className="flex justify-center gap-2 mt-4">
            <Badge variant="secondary" className="bg-[var(--warm-sage)]/20 text-[var(--warm-sage)] border-[var(--warm-sage)]/30">
              <Zap size={12} className="mr-1" />
              Intermediate
            </Badge>
            <Badge variant="secondary" className="bg-[var(--warm-peach)]/20 text-[var(--warm-peach)] border-[var(--warm-peach)]/30">
              <Target size={12} className="mr-1" />
              5 Week Streak
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Stats Overview */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-white/80 backdrop-blur-sm">
          <CardContent className="p-4 text-center">
            <div className="w-8 h-8 rounded-full bg-[var(--warm-coral)]/20 flex items-center justify-center mx-auto mb-2">
              <Dumbbell size={16} className="text-[var(--warm-coral)]" />
            </div>
            <div className="text-lg font-medium text-[var(--warm-brown)]">124</div>
            <div className="text-xs text-[var(--warm-brown)]/60">Workouts</div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm">
          <CardContent className="p-4 text-center">
            <div className="w-8 h-8 rounded-full bg-[var(--warm-sage)]/20 flex items-center justify-center mx-auto mb-2">
              <Calendar size={16} className="text-[var(--warm-sage)]" />
            </div>
            <div className="text-lg font-medium text-[var(--warm-brown)]">186</div>
            <div className="text-xs text-[var(--warm-brown)]/60">Days Active</div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm">
          <CardContent className="p-4 text-center">
            <div className="w-8 h-8 rounded-full bg-[var(--warm-peach)]/20 flex items-center justify-center mx-auto mb-2">
              <TrendingUp size={16} className="text-[var(--warm-peach)]" />
            </div>
            <div className="text-lg font-medium text-[var(--warm-brown)]">+12%</div>
            <div className="text-xs text-[var(--warm-brown)]/60">Strength</div>
          </CardContent>
        </Card>
      </div>

      {/* Personal Bests */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Trophy size={20} className="text-[var(--warm-coral)]" />
          <h2 className="text-lg text-[var(--warm-brown)]">Personal Bests</h2>
        </div>
        
        <div className="space-y-2">
          {personalBests.map((pb, index) => (
            <Card key={index} className="bg-white/80 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium text-[var(--warm-brown)]">
                      {pb.exercise}
                    </h3>
                    <p className="text-sm text-[var(--warm-brown)]/60">
                      {pb.date}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-[var(--warm-brown)]">
                      {pb.weight} lbs
                    </div>
                    <div className="text-sm text-[var(--warm-brown)]/60">
                      {pb.reps} reps
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <TactileButton
          variant="secondary"
          className="w-full flex items-center justify-center gap-2"
        >
          <Settings size={16} />
          Settings
        </TactileButton>

        <TactileButton
          variant="sage"
          className="w-full flex items-center justify-center gap-2"
          onClick={handleSignOut}
          disabled={isSigningOut}
        >
          {isSigningOut ? (
            <div className="w-4 h-4 animate-spin border-2 border-current border-t-transparent rounded-full" />
          ) : (
            <LogOut size={16} />
          )}
          {isSigningOut ? "Signing Out..." : "Sign Out"}
        </TactileButton>
      </div>

      {/* App Info */}
      <Card className="bg-gradient-to-r from-[var(--warm-sage)]/10 to-[var(--warm-mint)]/10 border-[var(--warm-sage)]/20">
        <CardContent className="p-4 text-center">
          <div className="text-sm text-[var(--warm-brown)]/60">
            Workout Tracker v1.0
          </div>
          <div className="text-xs text-[var(--warm-brown)]/40 mt-1">
            Powered by Supabase
          </div>
        </CardContent>
      </Card>
    </div>
  );
}