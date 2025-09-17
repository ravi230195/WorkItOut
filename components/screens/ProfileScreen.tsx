// components/screens/ProfileScreen.tsx
import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Bell,
  BookOpen,
  ChevronRight,
  Info,
  LifeBuoy,
  LogOut,
  Settings,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UserRound,
} from "lucide-react";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { AppScreen, ScreenHeader, Stack } from "../layouts";
import { useAuth } from "../AuthContext";
import { supabaseAPI, type Profile } from "../../utils/supabase/supabase-api";
import { toast } from "sonner";
import packageJson from "../../package.json";

interface ProfileScreenProps {
  bottomBar?: React.ReactNode;
}

type ProfileMenuAccent =
  | "coral"
  | "peach"
  | "sage"
  | "mint"
  | "lavender"
  | "neutral";

interface ProfileMenuItem {
  label: string;
  description?: string;
  icon: LucideIcon;
  accent: ProfileMenuAccent;
}

interface ProfileMenuSection {
  title: string;
  items: ProfileMenuItem[];
}

const ACCENT_STYLES: Record<ProfileMenuAccent, { container: string; icon: string; badge: string }> = {
  coral: {
    container: "border-warm-coral/30 bg-warm-coral/10 hover:bg-warm-coral/15",
    icon: "text-warm-coral",
    badge: "bg-warm-coral/20",
  },
  peach: {
    container: "border-warm-peach/40 bg-warm-peach/10 hover:bg-warm-peach/15",
    icon: "text-warm-peach",
    badge: "bg-warm-peach/20",
  },
  sage: {
    container: "border-warm-sage/30 bg-warm-sage/10 hover:bg-warm-sage/15",
    icon: "text-warm-sage",
    badge: "bg-warm-sage/20",
  },
  mint: {
    container: "border-warm-mint/30 bg-warm-mint/10 hover:bg-warm-mint/15",
    icon: "text-warm-mint",
    badge: "bg-warm-mint/20",
  },
  lavender: {
    container: "border-warm-lavender/30 bg-warm-lavender/10 hover:bg-warm-lavender/15",
    icon: "text-warm-lavender",
    badge: "bg-warm-lavender/20",
  },
  neutral: {
    container: "border-border/40 bg-card/80 hover:bg-card",
    icon: "text-black",
    badge: "bg-black/10",
  },
};

const PROFILE_MENU_SECTIONS: ProfileMenuSection[] = [
  {
    title: "Account & Settings",
    items: [
      {
        label: "My Account",
        description: "Profile, email & password",
        icon: UserRound,
        accent: "coral",
      },
      {
        label: "App Settings",
        description: "Theme, preferences & privacy",
        icon: Settings,
        accent: "peach",
      },
      {
        label: "Device Settings",
        description: "Sync & connected services",
        icon: Smartphone,
        accent: "sage",
      },
      {
        label: "Notifications",
        description: "Reminders & progress alerts",
        icon: Bell,
        accent: "lavender",
      },
      {
        label: "Privacy Settings",
        description: "Security & data controls",
        icon: ShieldCheck,
        accent: "mint",
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
        accent: "mint",
      },
      {
        label: "Tutorials",
        description: "Tips and walkthroughs",
        icon: BookOpen,
        accent: "sage",
      },
      {
        label: "About",
        description: "Learn more about the app",
        icon: Info,
        accent: "peach",
      },
      {
        label: "Getting Started",
        description: "Set goals and start tracking",
        icon: Sparkles,
        accent: "lavender",
      },
    ],
  },
];

const APP_VERSION = packageJson.version;

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
      await supabaseAPI.signOut();
      authSignOut();
      toast.success("Signed out successfully");
    } catch (error) {
      console.error("Sign out failed:", error);
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

  const buildNumber = useMemo(() => import.meta.env.VITE_APP_BUILD ?? "1234", []);

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
      maxContent="sm"
      showHeaderBorder={false}
      showBottomBarBorder={false}
      bottomBar={bottomBar}
      bottomBarSticky
      contentClassName="relative pb-8"
      headerInScrollArea
    >
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-warm-cream/60 via-background to-background" />

      <Stack gap="fluid" className="w-full">
        <section className="rounded-3xl border border-white/30 bg-gradient-to-br from-warm-coral/40 via-warm-peach/30 to-warm-cream/30 p-6 shadow-md shadow-warm-coral/20">
          <div className="flex flex-col items-center text-center gap-4">
            <Avatar className="w-20 h-20 bg-white/70 text-black">
              <AvatarFallback className="text-lg font-semibold text-black">
                {getInitials()}
              </AvatarFallback>
            </Avatar>

            {isLoading ? (
              <p className="text-sm text-black/70">Loading profile…</p>
            ) : (
              <div className="space-y-2">
                <h1 className="text-xl font-semibold text-black">{getDisplayName()}</h1>
                {(profile?.height_cm || profile?.weight_kg) && (
                  <p className="text-sm text-black/70">
                    {[profile?.height_cm ? `${profile.height_cm} cm` : null, profile?.weight_kg ? `${profile.weight_kg} kg` : null]
                      .filter(Boolean)
                      .join(" • ")}
                  </p>
                )}
              </div>
            )}
          </div>
        </section>

        {PROFILE_MENU_SECTIONS.map((section) => (
          <section key={section.title} className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-black/40">
              {section.title}
            </p>

            <div className="space-y-2">
              {section.items.map((item) => {
                const accent = ACCENT_STYLES[item.accent];
                const Icon = item.icon;

                return (
                  <button
                    key={item.label}
                    type="button"
                    className={`group flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors ${accent.container}`}
                  >
                    <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${accent.badge}`}>
                      <Icon className={`h-5 w-5 ${accent.icon}`} />
                    </span>

                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-black">{item.label}</div>
                      {item.description && (
                        <div className="text-xs text-black/60">{item.description}</div>
                      )}
                    </div>

                    <ChevronRight className="h-4 w-4 text-black/40 transition-transform group-hover:translate-x-0.5" />
                  </button>
                );
              })}
            </div>
          </section>
        ))}

        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-black/40">
            Account
          </p>

          <button
            type="button"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className={`group flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors ${ACCENT_STYLES.coral.container} disabled:opacity-70`}
          >
            <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${ACCENT_STYLES.coral.badge}`}>
              <LogOut className={`h-5 w-5 ${ACCENT_STYLES.coral.icon}`} />
            </span>

            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-black">
                {isSigningOut ? "Signing out…" : "Logout"}
              </div>
              <div className="text-xs text-black/60">Sign out of your account</div>
            </div>

            {isSigningOut ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent text-warm-coral" />
            ) : (
              <ChevronRight className="h-4 w-4 text-black/40 transition-transform group-hover:translate-x-0.5" />
            )}
          </button>
        </div>

        <div className="pt-2 text-center text-xs font-semibold uppercase tracking-[0.28em] text-black/40">
          App Version: {APP_VERSION}
          {buildNumber ? ` (Build ${buildNumber})` : ""}
        </div>
      </Stack>
    </AppScreen>
  );
}
