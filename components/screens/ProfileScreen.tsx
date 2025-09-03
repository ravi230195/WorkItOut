// components/screens/ProfileScreen.tsx
import { useState, useEffect } from "react";
import { Card, CardContent } from "../ui/card";
import { TactileButton } from "../TactileButton";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Badge } from "../ui/badge";
import {
  Trophy,
  Target,
  Zap,
  Calendar,
  Settings,
  LogOut,
  Dumbbell,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "../AuthContext";
import { supabaseAPI, Profile } from "../../utils/supabase/supabase-api";
import { toast } from "sonner";
import { AppScreen, Section, ScreenHeader, Stack } from "../layouts";
import { logger, getLogLevel, setLogLevel, getAvailableLogLevels, type LogLevel } from "../../utils/logging";
import SettingsSheet from "../sheets/SettingsSheet";

interface PersonalBest {
  exercise: string;
  weight: number;
  reps: number;
  date: string;
}

interface ProfileScreenProps {
  bottomBar?: React.ReactNode;
}

export function ProfileScreen({ bottomBar }: ProfileScreenProps) {

  const { userToken, signOut: authSignOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const personalBests: PersonalBest[] = [
    { exercise: "Bench Press", weight: 225, reps: 5, date: "2 weeks ago" },
    { exercise: "Squat", weight: 315, reps: 3, date: "1 week ago" },
    { exercise: "Deadlift", weight: 405, reps: 1, date: "3 days ago" },
  ];

  useEffect(() => {
    const fetchProfile = async () => {
      if (!userToken) return;

      setIsLoading(true);
      try {
        const profileData = await supabaseAPI.getMyProfile();
        setProfile(profileData);
      } catch (error) {
        logger.error("Failed to fetch profile:", error);
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
      await supabaseAPI.signOut();
      authSignOut();
      toast.success("Signed out successfully");
    } catch (error) {
      logger.error("Sign out failed:", error);
      authSignOut();
      toast.success("Signed out successfully");
    } finally {
      setIsSigningOut(false);
    }
  };

  const getDisplayName = () => {
    if (profile?.display_name) return profile.display_name;
    if (profile?.first_name && profile?.last_name)
      return `${profile.first_name} ${profile.last_name}`;
    if (profile?.first_name) return profile.first_name;
    return "User";
  };

  const getInitials = () => {
    const displayName = getDisplayName();
    const names = displayName.split(" ");
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return displayName.slice(0, 2).toUpperCase();
  };

  return (
    <AppScreen
      header={<ScreenHeader title="Profile" 
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
        {/* Profile Header */}
        <Section variant="plain" padding="none">
          <Card className="bg-gradient-to-r from-warm-coral/10 to-warm-peach/10 border-warm-coral/20">
            <CardContent className="p-6 text-center">
              <Avatar className="w-20 h-20 mx-auto mb-4 bg-primary text-primary-foreground">
                <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>

              {isLoading ? (
                <div className="text-warm-brown/60">Loading profile...</div>
              ) : (
                <>
                  <h1 className="text-xl font-medium text-warm-brown mb-2">
                    {getDisplayName()}
                  </h1>
                  {profile?.height_cm && profile?.weight_kg && (
                    <div className="flex justify-center gap-4 text-sm text-warm-brown/60">
                      <span>{profile.height_cm} cm</span>
                      <span>•</span>
                      <span>{profile.weight_kg} kg</span>
                    </div>
                  )}
                </>
              )}

              <div className="flex justify-center gap-2 mt-4">
                <Badge
                  variant="secondary"
                  className="bg-warm-sage/20 text-warm-sage border-warm-sage/30"
                >
                  <Zap size={12} className="mr-1" />
                  Intermediate
                </Badge>
                <Badge
                  variant="secondary"
                  className="bg-warm-peach/20 text-warm-peach border-warm-peach/30"
                >
                  <Target size={12} className="mr-1" />
                  5 Week Streak
                </Badge>
              </div>
            </CardContent>
          </Card>
        </Section>

        {/* Stats Overview */}
        <Section variant="plain" padding="none">
          <div className="grid grid-cols-3 gap-3">
            <Card className="bg-card/80 backdrop-blur-sm">
              <CardContent className="p-4 text-center">
                <div className="w-8 h-8 rounded-full bg-warm-coral/20 flex items-center justify-center mx-auto mb-2">
                  <Dumbbell size={16} className="text-warm-coral" />
                </div>
                <div className="text-lg font-medium text-warm-brown">124</div>
                <div className="text-xs text-warm-brown/60">Workouts</div>
              </CardContent>
            </Card>

            <Card className="bg-card/80 backdrop-blur-sm">
              <CardContent className="p-4 text-center">
                <div className="w-8 h-8 rounded-full bg-warm-sage/20 flex items-center justify-center mx-auto mb-2">
                  <Calendar size={16} className="text-warm-sage" />
                </div>
                <div className="text-lg font-medium text-warm-brown">186</div>
                <div className="text-xs text-warm-brown/60">Days Active</div>
              </CardContent>
            </Card>

            <Card className="bg-card/80 backdrop-blur-sm">
              <CardContent className="p-4 text-center">
                <div className="w-8 h-8 rounded-full bg-warm-peach/20 flex items-center justify-center mx-auto mb-2">
                  <TrendingUp size={16} className="text-warm-peach" />
                </div>
                <div className="text-lg font-medium text-warm-brown">+12%</div>
                <div className="text-xs text-warm-brown/60">Strength</div>
              </CardContent>
            </Card>
          </div>
        </Section>

        {/* Personal Bests */}
        <Section variant="plain" padding="none">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Trophy size={20} className="text-warm-coral" />
              <h2 className="text-lg text-warm-brown">Personal Bests</h2>
            </div>

            <div className="space-y-2">
              {personalBests.map((pb, index) => (
                <Card key={index} className="bg-card/80 backdrop-blur-sm">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-medium text-warm-brown">
                          {pb.exercise}
                        </h3>
                        <p className="text-sm text-warm-brown/60">{pb.date}</p>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-warm-brown">
                          {pb.weight} lbs
                        </div>
                        <div className="text-sm text-warm-brown/60">
                          {pb.reps} reps
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </Section>

        {/* Logging Control */}
        <Section variant="plain" padding="none">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Settings size={20} className="text-warm-brown" />
              <h2 className="text-lg text-warm-brown">Logging Level</h2>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              {getAvailableLogLevels().map((level) => (
                <TactileButton
                  key={level}
                  variant={getLogLevel() === level ? "primary" : "secondary"}
                  className="text-sm"
                  onClick={() => {
                    setLogLevel(level);
                    toast.success(`Log level set to: ${level}`);
                  }}
                >
                  {level.toUpperCase()}
                </TactileButton>
              ))}
            </div>
            
            <div className="text-xs text-warm-brown/60 text-center">
              Current: {getLogLevel().toUpperCase()}
            </div>
          </div>
        </Section>

        {/* Action Buttons */}
        <Section variant="plain" padding="none">
          <div className="space-y-3">
            <TactileButton
              variant="secondary"
              className="w-full flex items-center justify-center gap-2"
              onClick={() => setSettingsOpen(true)}
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
        </Section>

        {/* App Info */}
        <Section variant="plain" padding="none">
          <Card className="bg-gradient-to-r from-warm-sage/10 to-warm-mint/10 border-warm-sage/20">
            <CardContent className="p-4 text-center">
              <div className="text-sm text-warm-brown/60">
                Workout Tracker v1.0
              </div>
              <div className="text-xs text-warm-brown/40 mt-1">
                Powered by Supabase
              </div>
            </CardContent>
          </Card>
        </Section>
      </Stack>
      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </AppScreen>
  );
}