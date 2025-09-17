// components/screens/ProfileScreen.tsx
import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Bell,
  BookOpen,
  ChevronRight,
  HelpCircle,
  Info,
  LogOut,
  PlaySquare,
  Settings,
  Shield,
  Smartphone,
  UserRound,
} from "lucide-react";
import { Avatar, AvatarFallback } from "../ui/avatar";
import ListItem from "../ui/ListItem";
import { AppScreen, ScreenHeader, Section, Stack } from "../layouts";
import { useAuth } from "../AuthContext";
import { supabaseAPI, type Profile } from "../../utils/supabase/supabase-api";
import { toast } from "sonner";
import { logger } from "../../utils/logging";
import { cn } from "../ui/utils";
import packageJson from "../../package.json";

const APP_VERSION = packageJson.version ?? "1.0.0";

type AccentTone = "coral" | "peach" | "sage" | "mint" | "cream";

type ProfileActionItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  accent: AccentTone;
  description?: string;
  onSelect?: () => void;
};

type ProfileSectionDefinition = {
  id: string;
  title: string;
  subtitle?: string;
  items: ProfileActionItem[];
};

const accentContainer: Record<AccentTone, string> = {
  coral: "bg-warm-coral/15 text-warm-coral",
  peach: "bg-warm-peach/20 text-warm-peach",
  sage: "bg-warm-sage/20 text-warm-sage",
  mint: "bg-warm-mint/20 text-warm-mint",
  cream: "bg-warm-cream/80 text-black/70",
};

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

  const initials = useMemo(() => {
    const displayName = getDisplayName();
    const segments = displayName.split(" ");
    if (segments.length >= 2) {
      return `${segments[0][0]}${segments[1][0]}`.toUpperCase();
    }
    return displayName.slice(0, 2).toUpperCase();
  }, [profile]);

  const highlightMetrics = useMemo(() => {
    const metrics: Array<{ id: string; label: string; value: string }> = [];
    if (profile?.height_cm) {
      metrics.push({ id: "height", label: "Height", value: `${profile.height_cm} cm` });
    }
    if (profile?.weight_kg) {
      metrics.push({ id: "weight", label: "Weight", value: `${profile.weight_kg} kg` });
    }
    metrics.push({ id: "status", label: "Status", value: "All set to train" });
    return metrics;
  }, [profile?.height_cm, profile?.weight_kg]);

  const sections = useMemo<ProfileSectionDefinition[]>(
    () => [
      {
        id: "account",
        title: "Account",
        subtitle: "Tune how the app feels for you",
        items: [
          {
            id: "account-details",
            label: "My Account",
            icon: UserRound,
            accent: "coral",
            description: "Update your personal details",
          },
          {
            id: "app-settings",
            label: "App Settings",
            icon: Settings,
            accent: "peach",
            description: "Adjust preferences and accessibility",
          },
          {
            id: "device-sync",
            label: "Device Settings",
            icon: Smartphone,
            accent: "cream",
            description: "Connect wearables and sensors",
          },
          {
            id: "notifications",
            label: "Notifications",
            icon: Bell,
            accent: "sage",
            description: "Control reminders and push alerts",
          },
          {
            id: "privacy",
            label: "Privacy",
            icon: Shield,
            accent: "mint",
            description: "Manage data and visibility",
          },
        ],
      },
      {
        id: "support",
        title: "Support",
        subtitle: "Resources whenever you need a hand",
        items: [
          {
            id: "help-center",
            label: "Help & Support",
            icon: HelpCircle,
            accent: "sage",
            description: "Browse FAQs or contact us",
          },
          {
            id: "tutorials",
            label: "Tutorial Library",
            icon: BookOpen,
            accent: "peach",
            description: "Learn features step by step",
          },
          {
            id: "about",
            label: "About WorkItOut",
            icon: Info,
            accent: "cream",
            description: "See what’s new in the app",
          },
          {
            id: "getting-started",
            label: "Getting Started",
            icon: PlaySquare,
            accent: "coral",
            description: "Set up your first plan",
          },
        ],
      },
    ],
    []
  );

  return (
    <AppScreen
      header={
        <ScreenHeader
          title="Profile"
          showBorder={false}
          denseSmall
          titleClassName="text-[17px] font-semibold"
          subtitle={profile ? "Everything about your account in one place" : undefined}
          subtitleClassName="text-[12px] text-black/60"
        />
      }
      maxContent="responsive"
      showHeaderBorder={false}
      showBottomBarBorder={false}
      bottomBar={bottomBar}
      bottomBarSticky
      contentClassName="pb-12"
      scrollAreaClassName="bg-gradient-to-b from-[var(--background)] via-[var(--warm-cream)]/45 to-[var(--warm-peach)]/35"
      headerInScrollArea
    >
      <Stack gap="xl">
        <Section variant="plain" padding="none">
          <ProfileHeroCard
            initials={initials}
            name={getDisplayName()}
            isLoading={isLoading}
            highlights={highlightMetrics}
          />
        </Section>

        {sections.map((section) => (
          <Section key={section.id} variant="plain" padding="none">
            <ProfileMenuGroup section={section} />
          </Section>
        ))}

        <Section variant="plain" padding="none">
          <ProfileLogoutCard onLogout={handleSignOut} isSigningOut={isSigningOut} />
        </Section>

        <Section variant="plain" padding="none" className="pt-2">
          <p className="text-[11px] uppercase tracking-[0.28em] text-black/45 text-center">
            App Version: {APP_VERSION}
          </p>
        </Section>
      </Stack>
    </AppScreen>
  );
}

function ProfileHeroCard({
  initials,
  name,
  isLoading,
  highlights,
}: {
  initials: string;
  name: string;
  isLoading: boolean;
  highlights: Array<{ id: string; label: string; value: string }>;
}) {
  return (
    <div className="relative overflow-hidden rounded-[32px] border border-white/50 bg-white/80 px-8 py-10 text-center shadow-[0_28px_60px_-45px_rgba(224,122,95,0.75)] backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -top-16 right-10 h-36 w-36 rounded-full bg-warm-peach/40 blur-3xl" />
        <div className="absolute bottom-0 left-4 h-32 w-32 rounded-full bg-warm-sage/30 blur-3xl" />
      </div>

      <div className="relative flex flex-col items-center gap-4 text-black">
        <Avatar className="size-20 border-4 border-white/70 shadow-lg">
          <AvatarFallback className="bg-primary/90 text-lg font-semibold text-black">
            {initials}
          </AvatarFallback>
        </Avatar>

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-black/70">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Loading profile…
          </div>
        ) : (
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">{name}</h1>
            <p className="text-sm text-black/60">Tailor your experience, review your details, and stay aligned.</p>
          </div>
        )}

        {highlights.length > 0 && (
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            {highlights.map((metric) => (
              <div
                key={metric.id}
                className="rounded-full border border-white/60 bg-white/70 px-4 py-2 text-left shadow-sm"
              >
                <p className="text-[11px] uppercase tracking-[0.2em] text-black/45">{metric.label}</p>
                <p className="text-sm font-semibold text-black">{metric.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileMenuGroup({ section }: { section: ProfileSectionDefinition }) {
  return (
    <div className="space-y-3">
      <div className="px-1">
        <p className="text-[11px] uppercase tracking-[0.32em] text-black/45 font-semibold">
          {section.title}
        </p>
        {section.subtitle && (
          <p className="text-xs text-black/55 mt-1">{section.subtitle}</p>
        )}
      </div>

      <div className="overflow-hidden rounded-[28px] border border-white/60 bg-white/75 shadow-[0_24px_50px_-40px_rgba(224,122,95,0.6)] backdrop-blur-xl">
        <div className="divide-y divide-white/60">
          {section.items.map((item) => (
            <ProfileActionRow key={item.id} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ProfileActionRow({ item }: { item: ProfileActionItem }) {
  const Icon = item.icon;

  const handleClick = () => {
    if (item.onSelect) {
      item.onSelect();
      return;
    }

    toast.message(item.label, {
      description: "Coming soon",
    });
  };

  return (
    <ListItem
      as="button"
      type="button"
      onClick={handleClick}
      className="w-full px-5 transition-all duration-200 hover:bg-white/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-coral/40 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-60"
      leading={<Icon size={18} />}
      leadingClassName={cn(
        "w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm",
        accentContainer[item.accent]
      )}
      primary={item.label}
      primaryClassName="text-[15px] font-semibold text-[var(--foreground)]"
      secondary={item.description}
      secondaryClassName="text-xs text-black/55"
      trailing={<ChevronRight size={18} className="text-black/30" />}
    />
  );
}

function ProfileLogoutCard({
  onLogout,
  isSigningOut,
}: {
  onLogout: () => void;
  isSigningOut: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-white/50 bg-gradient-to-br from-warm-peach/35 via-warm-coral/30 to-warm-rose/30 shadow-[0_32px_70px_-45px_rgba(224,122,95,0.85)] backdrop-blur-xl">
      <ListItem
        as="button"
        onClick={onLogout}
        disabled={isSigningOut}
        className="w-full px-5 transition-all duration-200 hover:bg-warm-cream/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-coral/45 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-60"
        leading={
          isSigningOut ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <LogOut size={18} />
          )
        }
        leadingClassName="w-12 h-12 rounded-2xl flex items-center justify-center bg-white/70 text-black shadow-sm"
        primary={isSigningOut ? "Signing Out" : "Logout"}
        primaryClassName="text-[15px] font-semibold text-[var(--foreground)]"
        trailing={<ChevronRight size={18} className="text-black/30" />}
        type="button"
      />
    </div>
  );
}
