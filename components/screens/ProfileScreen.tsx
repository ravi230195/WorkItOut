// components/screens/ProfileScreen.tsx
import { useState, useEffect } from "react";
import { Card, CardContent } from "../ui/card";
import { TactileButton } from "../TactileButton";
import { Avatar, AvatarFallback } from "../ui/avatar";
import {
  Bell,
  BookOpen,
  ChevronRight,
  Info,
  LifeBuoy,
  LogOut,
  PlayCircle,
  Shield,
  Smartphone,
  User,
} from "lucide-react";
import { useAuth } from "../AuthContext";
import { supabaseAPI, Profile } from "../../utils/supabase/supabase-api";
import { toast } from "sonner";
import { AppScreen, Section, ScreenHeader, Stack } from "../layouts";
import { logger } from "../../utils/logging";
import type { LucideIcon } from "lucide-react";

interface ProfileScreenProps {
  bottomBar?: React.ReactNode;
  onNavigateToMyAccount?: () => void;
  onNavigateToDeviceSettings?: () => void;
}

export function ProfileScreen({
  bottomBar,
  onNavigateToMyAccount,
  onNavigateToDeviceSettings,
}: ProfileScreenProps) {

  const { userToken, signOut: authSignOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const navigationSections: Array<{
    title: string;
    items: Array<{
      label: string;
      description?: string;
      icon: LucideIcon;
      onPress?: () => void;
    }>;
  }> = [
    {
      title: "Account & Settings",
      items: [
        {
          label: "My Account",
          description: "Profile details and connected services",
          icon: User,
          onPress: onNavigateToMyAccount,
        },
        {
          label: "Device Settings",
          description: "Manage Health Connect and devices",
          icon: Smartphone,
          onPress: onNavigateToDeviceSettings,
        },
        {
          label: "Notifications",
          description: "Choose reminders that keep you on track",
          icon: Bell,
        },
        {
          label: "Privacy Settings",
          description: "Control data sharing and visibility",
          icon: Shield,
        },
      ],
    },
    {
      title: "Support",
      items: [
        {
          label: "Help & Support",
          description: "Get help or ask a question",
          icon: LifeBuoy,
        },
        {
          label: "Tutorials",
          description: "Quick tips to learn the app",
          icon: BookOpen,
        },
        {
          label: "About",
          description: "Our mission and release notes",
          icon: Info,
        },
        {
          label: "Getting Started",
          description: "Guided setup for new members",
          icon: PlayCircle,
        },
      ],
    },
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
      header={
        <ScreenHeader
          title="Profile"
          showBorder={false}
          denseSmall
          titleClassName="text-[17px] font-bold text-black"
        />
      }
      maxContent="responsive"
      showHeaderBorder={false}
      showBottomBarBorder={false}
      bottomBar={bottomBar}
      bottomBarSticky
      headerInScrollArea
    >
      <Stack gap="fluid">
        <Section variant="plain" padding="none">
          <Card className="border border-border bg-card/80 backdrop-blur-sm shadow-sm">
            <CardContent className="p-6 text-center">
              <Avatar className="w-20 h-20 mx-auto mb-4 bg-primary text-black shadow-lg shadow-primary/30">
                <AvatarFallback className="bg-primary text-black text-lg font-semibold">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>

              {isLoading ? (
                <div className="text-sm text-black/60">Loading profile...</div>
              ) : (
                <>
                  <h1 className="text-[clamp(20px,5vw,26px)] font-semibold text-black mb-1">
                    {getDisplayName()}
                  </h1>
                  <p className="text-sm text-black/60">
                    Keep your profile up to date to personalize your plan.
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </Section>

        {navigationSections.map((section) => (
          <Section key={section.title} variant="plain" padding="none">
            <div className="rounded-3xl border border-border bg-card/80 backdrop-blur-sm p-5 shadow-sm">
              <p className="text-md font-bold uppercase tracking-[0.12em] text-black mb-4">
                {section.title}
              </p>
              <div className="space-y-3">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <CardContent key={item.label} className="px-0 pt-1 pb-1">
                      <button
                        type="button"
                        onClick={item.onPress}
                        disabled={!item.onPress}
                        className="w-full rounded-2xl px-4 py-3 text-left transition hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40 disabled:cursor-default disabled:opacity-60"
                      >
                        <div className="flex items-start gap-3">
                          <Icon size={18} className="mt-1 text-black" />
                          <div className="flex-1 leading-none">
                            <p className="text-sm uppercase font-medium text-black leading-tight">
                              {item.label}
                            </p>
                            {item.description && (
                              <p className="text-xs text-black/60 leading-tight m-0">
                                {item.description}
                              </p>
                            )}
                          </div>
                          <ChevronRight size={18} className="text-black/30 self-center" />
                        </div>
                      </button>
                    </CardContent>
                  );
                })}
              </div>
            </div>
          </Section>
        ))}

        <Section variant="plain" padding="none">
          <div className="space-y-4">
            <TactileButton
              variant="secondary"
              className="w-full flex items-center justify-center gap-2 rounded-2xl border-0 font-medium text-black"
              onClick={handleSignOut}
              disabled={isSigningOut}
            >
              {isSigningOut ? (
                <div className="w-4 h-4 animate-spin border-2 border-current border-t-transparent rounded-full" />
              ) : (
                <LogOut size={16} />
              )}
              {isSigningOut ? "Signing Out..." : "Logout"}
            </TactileButton>

            <div className="text-center text-xs text-black/50">
              App Version: 1.0.0 (Build 1234)
            </div>
          </div>
        </Section>
      </Stack>
    </AppScreen>
  );
}