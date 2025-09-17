// components/screens/ProfileScreen.tsx
import { useState, useEffect } from "react";
import { Card, CardContent } from "../ui/card";
import { TactileButton } from "../TactileButton";
import { Avatar, AvatarFallback } from "../ui/avatar";
import ListItem from "../ui/ListItem";
import type { LucideIcon } from "lucide-react";
import {
  Bell,
  BookOpen,
  Info,
  LifeBuoy,
  LogOut,
  Rocket,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  User2,
} from "lucide-react";
import { useAuth } from "../AuthContext";
import { supabaseAPI, Profile } from "../../utils/supabase/supabase-api";
import { toast } from "sonner";
import { AppScreen, Section, ScreenHeader, Stack } from "../layouts";
import { logger } from "../../utils/logging";

type AccentTone = "coral" | "peach" | "sage" | "mint" | "lavender";

type SectionItem = {
  label: string;
  description: string;
  icon: LucideIcon;
  accent: AccentTone;
};

type ProfileSection = {
  title: string;
  subtitle: string;
  gradient: string;
  items: SectionItem[];
};

const accentToneClasses: Record<AccentTone, string> = {
  coral: "bg-warm-coral/25 text-black",
  peach: "bg-warm-peach/30 text-black",
  sage: "bg-warm-sage/30 text-black",
  mint: "bg-warm-mint/30 text-black",
  lavender: "bg-warm-lavender/30 text-black",
};

const PROFILE_SECTIONS: ProfileSection[] = [
  {
    title: "Account & Settings",
    subtitle: "Manage your personal details, preferences, and privacy controls.",
    gradient: "from-warm-cream/60 via-warm-peach/25 to-warm-mint/20",
    items: [
      {
        label: "My Account",
        description: "Edit your profile info and contact details.",
        icon: User2,
        accent: "coral",
      },
      {
        label: "App Settings",
        description: "Customize themes, tracking, and reminders.",
        icon: SlidersHorizontal,
        accent: "peach",
      },
      {
        label: "Device Settings",
        description: "Connect wearables and manage integrations.",
        icon: Smartphone,
        accent: "sage",
      },
      {
        label: "Notifications",
        description: "Choose what updates you want to receive.",
        icon: Bell,
        accent: "mint",
      },
      {
        label: "Privacy Settings",
        description: "Control data sharing and visibility preferences.",
        icon: ShieldCheck,
        accent: "lavender",
      },
    ],
  },
  {
    title: "Support",
    subtitle: "Get answers, tutorials, and inspiration for your journey.",
    gradient: "from-warm-cream/55 via-warm-mint/20 to-warm-rose/15",
    items: [
      {
        label: "Help & Support",
        description: "Find FAQs or reach out to our team.",
        icon: LifeBuoy,
        accent: "mint",
      },
      {
        label: "Tutorials",
        description: "Learn tips to make the most of WorkItOut.",
        icon: BookOpen,
        accent: "peach",
      },
      {
        label: "About",
        description: "Discover what's new in the latest update.",
        icon: Info,
        accent: "sage",
      },
      {
        label: "Getting Started",
        description: "Set up your routines in a guided flow.",
        icon: Rocket,
        accent: "coral",
      },
    ],
  },
];

interface ProfileScreenProps {
  bottomBar?: React.ReactNode;
}

export function ProfileScreen({ bottomBar }: ProfileScreenProps) {
  const { userToken, signOut: authSignOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

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

  const appVersion = import.meta.env.VITE_APP_VERSION ?? "1.0.0";
  const buildNumber = import.meta.env.VITE_APP_BUILD ?? "1234";

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
      contentClassName=""
      headerInScrollArea={true}
    >
      <Stack gap="fluid">
        <Section variant="plain" padding="none">
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-warm-peach/35 via-warm-cream/50 to-warm-mint/30 shadow-md">
            <CardContent className="p-6 text-center text-black">
              <div className="absolute inset-x-0 -top-12 h-40 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
              <div className="relative">
                <Avatar className="w-20 h-20 mx-auto mb-4 bg-primary text-black shadow-lg shadow-white/20">
                  <AvatarFallback className="bg-primary text-black text-xl font-semibold">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>

                {isLoading ? (
                  <div className="text-black/80">Loading profile...</div>
                ) : (
                  <>
                    <h1 className="text-2xl font-semibold text-black mb-1">
                      {getDisplayName()}
                    </h1>
                    <p className="text-sm text-black/70">
                      Tailor your experience and keep your journey personal.
                    </p>
                    {profile?.height_cm && profile?.weight_kg && (
                      <div className="mt-4 inline-flex items-center gap-3 rounded-full bg-white/40 px-4 py-2 text-sm text-black/80">
                        <span>{profile.height_cm} cm</span>
                        <span className="text-black/40">•</span>
                        <span>{profile.weight_kg} kg</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </Section>

        {PROFILE_SECTIONS.map((section) => (
          <Section key={section.title} variant="plain" padding="none">
            <div className="space-y-3">
              <div className="px-1">
                <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-black/60">
                  {section.title}
                </h2>
                <p className="mt-1 text-sm text-black/60">
                  {section.subtitle}
                </p>
              </div>

              <div
                className={`rounded-3xl border border-border/40 bg-gradient-to-br ${section.gradient} shadow-sm overflow-hidden backdrop-blur-sm`}
              >
                <div className="divide-y divide-border/40">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <ListItem
                        key={item.label}
                        as="button"
                        leading={<Icon size={18} />}
                        leadingClassName={`w-12 h-12 rounded-2xl flex items-center justify-center ${accentToneClasses[item.accent]}`}
                        primary={item.label}
                        primaryClassName="text-base font-semibold text-black"
                        secondary={item.description}
                        secondaryClassName="text-sm text-black/70"
                        rightIcon="chevron"
                        className="px-4 transition-all duration-200 hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </Section>
        ))}

        <Section variant="plain" padding="none">
          <div className="rounded-3xl border border-border/40 bg-card/70 px-6 py-6 text-center shadow-sm backdrop-blur-sm">
            <TactileButton
              variant="sage"
              className="w-full flex items-center justify-center gap-2 rounded-2xl border-0 font-semibold"
              onClick={handleSignOut}
              disabled={isSigningOut}
            >
              {isSigningOut ? (
                <div className="w-4 h-4 animate-spin border-2 border-current border-t-transparent rounded-full" />
              ) : (
                <LogOut size={16} />
              )}
              {isSigningOut ? "Signing Out..." : "Log Out"}
            </TactileButton>
          </div>
        </Section>

        <Section variant="plain" padding="none">
          <div className="text-center text-xs uppercase tracking-[0.25em] text-black/50">
            App Version: {appVersion} (Build {buildNumber})
          </div>
        </Section>
      </Stack>
    </AppScreen>
  );
}