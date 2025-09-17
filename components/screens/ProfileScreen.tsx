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
  Settings,
  Shield,
  Smartphone,
  User,
} from "lucide-react";
import { useAuth } from "../AuthContext";
import { supabaseAPI, Profile } from "../../utils/supabase/supabase-api";
import { toast } from "sonner";
import { AppScreen, Section, ScreenHeader, Stack } from "../layouts";
import { logger } from "../../utils/logging";
import ListItem from "../ui/ListItem";
import type { LucideIcon } from "lucide-react";

interface ProfileScreenProps {
  bottomBar?: React.ReactNode;
}

export function ProfileScreen({ bottomBar }: ProfileScreenProps) {

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
      iconClassName: string;
    }>;
  }> = [
    {
      title: "Account & Settings",
      items: [
        {
          label: "My Account",
          description: "Profile details and connected services",
          icon: User,
          iconClassName: "bg-warm-peach/20 border border-warm-peach/30 text-black",
        },
        {
          label: "App Settings",
          description: "Customize notifications and themes",
          icon: Settings,
          iconClassName: "bg-warm-sage/20 border border-warm-sage/30 text-black",
        },
        {
          label: "Device Settings",
          description: "Manage Health Connect and devices",
          icon: Smartphone,
          iconClassName: "bg-warm-mint/20 border border-warm-mint/30 text-black",
        },
        {
          label: "Notifications",
          description: "Choose reminders that keep you on track",
          icon: Bell,
          iconClassName: "bg-warm-coral/20 border border-warm-coral/30 text-black",
        },
        {
          label: "Privacy Settings",
          description: "Control data sharing and visibility",
          icon: Shield,
          iconClassName: "bg-warm-cream/40 border border-warm-cream/60 text-black",
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
          iconClassName: "bg-warm-sage/20 border border-warm-sage/30 text-black",
        },
        {
          label: "Tutorials",
          description: "Quick tips to learn the app",
          icon: BookOpen,
          iconClassName: "bg-warm-mint/20 border border-warm-mint/30 text-black",
        },
        {
          label: "About",
          description: "Our mission and release notes",
          icon: Info,
          iconClassName: "bg-warm-peach/20 border border-warm-peach/30 text-black",
        },
        {
          label: "Getting Started",
          description: "Guided setup for new members",
          icon: PlayCircle,
          iconClassName: "bg-warm-cream/40 border border-warm-cream/60 text-black",
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
          titleClassName="text-[17px] font-bold"
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
          <Card className="border border-border bg-card shadow-sm">
            <CardContent className="p-6 text-center space-y-3">
              <Avatar className="w-20 h-20 mx-auto bg-primary/10 text-primary">
                <AvatarFallback className="bg-primary text-black text-lg">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>

              {isLoading ? (
                <div className="text-sm text-black/60">Loading profile...</div>
              ) : (
                <>
                  <h1 className="text-[clamp(20px,4.8vw,24px)] font-semibold text-black">
                    {getDisplayName()}
                  </h1>
                  <p className="text-sm text-black/60 max-w-md mx-auto">
                    Keep your profile up to date to personalize your plan.
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </Section>

        {navigationSections.map((section) => (
          <Section key={section.title} variant="plain" padding="none">
            <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-border/60">
                <h2 className="text-sm font-semibold text-black">{section.title}</h2>
              </div>
              <div className="divide-y divide-border/60">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <ListItem
                      key={item.label}
                      as="button"
                      className="w-full px-5 text-left transition-colors hover:bg-soft-gray/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      leading={
                        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${item.iconClassName}`}>
                          <Icon size={18} className="text-black" />
                        </div>
                      }
                      leadingClassName=""
                      primary={item.label}
                      primaryClassName="text-sm font-medium text-black"
                      secondary={item.description}
                      secondaryClassName="text-xs text-black/60"
                      trailing={<ChevronRight size={18} className="text-black/40" />}
                    />
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
              className="w-full flex items-center justify-center gap-2 rounded-2xl border-0 font-medium"
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