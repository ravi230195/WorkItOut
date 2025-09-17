import { useState, useEffect, type CSSProperties, type ReactNode } from "react";
import clsx from "clsx";
import type { LucideIcon } from "lucide-react";
import {
  Bell,
  ChevronRight,
  GraduationCap,
  Info,
  LifeBuoy,
  LogOut,
  Settings2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "../AuthContext";
import { AppScreen, ScreenHeader } from "../layouts";
import { supabaseAPI, type Profile } from "../../utils/supabase/supabase-api";
import { logger } from "../../utils/logging";

interface SettingItemData {
  label: string;
  description?: string;
  icon: LucideIcon;
  accentStyle: CSSProperties;
}

interface ProfileScreenProps {
  bottomBar?: ReactNode;
}

interface SettingItemProps extends SettingItemData {
  onClick?: () => void;
  disabled?: boolean;
  rightSlot?: ReactNode;
}

const ACCOUNT_AND_SETTINGS_ITEMS: SettingItemData[] = [
  {
    label: "My Account",
    description: "Profile, email & membership",
    icon: UserRound,
    accentStyle: {
      background: "linear-gradient(135deg, rgba(224,122,95,0.28) 0%, rgba(242,204,143,0.22) 100%)",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6)",
    },
  },
  {
    label: "App Settings",
    description: "Appearance & preferences",
    icon: Settings2,
    accentStyle: {
      background: "linear-gradient(135deg, rgba(242,204,143,0.28) 0%, rgba(167,196,160,0.18) 100%)",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6)",
    },
  },
  {
    label: "Device Settings",
    description: "Health data & permissions",
    icon: Smartphone,
    accentStyle: {
      background: "linear-gradient(135deg, rgba(167,196,160,0.28) 0%, rgba(129,178,154,0.22) 100%)",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6)",
    },
  },
  {
    label: "Notifications",
    description: "Reminders & push alerts",
    icon: Bell,
    accentStyle: {
      background: "linear-gradient(135deg, rgba(224,122,95,0.24) 0%, rgba(244,232,193,0.18) 100%)",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6)",
    },
  },
  {
    label: "Privacy Settings",
    description: "Security & data controls",
    icon: ShieldCheck,
    accentStyle: {
      background: "linear-gradient(135deg, rgba(129,178,154,0.26) 0%, rgba(224,122,95,0.18) 100%)",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6)",
    },
  },
];

const SUPPORT_ITEMS: SettingItemData[] = [
  {
    label: "Help & Support",
    description: "Get help or ask a question",
    icon: LifeBuoy,
    accentStyle: {
      background: "linear-gradient(135deg, rgba(167,196,160,0.28) 0%, rgba(242,204,143,0.22) 100%)",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6)",
    },
  },
  {
    label: "Tutorials",
    description: "Guided walkthroughs",
    icon: GraduationCap,
    accentStyle: {
      background: "linear-gradient(135deg, rgba(242,204,143,0.28) 0%, rgba(224,122,95,0.18) 100%)",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6)",
    },
  },
  {
    label: "About",
    description: "Learn about WorkItOut",
    icon: Info,
    accentStyle: {
      background: "linear-gradient(135deg, rgba(224,122,95,0.26) 0%, rgba(212,164,235,0.18) 100%)",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6)",
    },
  },
  {
    label: "Getting Started",
    description: "First steps & quick tips",
    icon: Sparkles,
    accentStyle: {
      background: "linear-gradient(135deg, rgba(224,122,95,0.22) 0%, rgba(167,196,160,0.22) 100%)",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6)",
    },
  },
];

const APP_VERSION = typeof import.meta !== "undefined" && import.meta.env?.VITE_APP_VERSION
  ? String(import.meta.env.VITE_APP_VERSION)
  : "1.0.0";

const APP_BUILD_LABEL = typeof import.meta !== "undefined" && import.meta.env?.VITE_APP_BUILD
  ? String(import.meta.env.VITE_APP_BUILD)
  : "Build 1234";

function SettingItem({
  label,
  description,
  icon: Icon,
  accentStyle,
  onClick,
  disabled,
  rightSlot,
}: SettingItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "relative flex w-full items-center gap-3 rounded-2xl border border-white/60 bg-white/70 px-4 py-3 text-left",
        "shadow-[0_16px_36px_rgba(224,122,95,0.08)] transition-all duration-200 backdrop-blur-xl",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40",
        disabled ? "cursor-default opacity-60" : "cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_20px_42px_rgba(224,122,95,0.12)]"
      )}
    >
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/60 text-black shadow-inner"
        style={accentStyle}
      >
        <Icon className="h-5 w-5" strokeWidth={1.8} />
      </div>
      <div className="flex-1">
        <div className="text-sm font-medium text-black">{label}</div>
        {description ? (
          <div className="text-xs text-black/60">{description}</div>
        ) : null}
      </div>
      <div className="flex h-5 w-5 items-center justify-center text-black/40">
        {rightSlot ?? <ChevronRight className="h-4 w-4" strokeWidth={2.5} />}
      </div>
    </button>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className="px-1 text-[11px] font-semibold uppercase tracking-[0.32em] text-black/45">
      {children}
    </div>
  );
}

function ProfileHero({
  isLoading,
  displayName,
  initials,
  heightCm,
  weightKg,
}: {
  isLoading: boolean;
  displayName: string;
  initials: string;
  heightCm?: number | null;
  weightKg?: number | null;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/60 bg-white/70 px-6 py-8 text-center shadow-[0_28px_48px_rgba(224,122,95,0.12)] backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[rgba(224,122,95,0.16)] via-transparent to-[rgba(129,178,154,0.16)]" />
      <div className="relative z-10 flex flex-col items-center gap-5">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--primary)] text-2xl font-semibold text-white shadow-[0_16px_36px_rgba(224,122,95,0.35)]">
          {initials}
        </div>

        {isLoading ? (
          <div className="text-sm text-black/70">Loading profile…</div>
        ) : (
          <div className="space-y-1">
            <h1 className="text-xl font-semibold text-black">{displayName}</h1>
            <p className="text-sm text-black/60">Manage how WorkItOut knows you.</p>
          </div>
        )}

        {(heightCm ?? null) !== null && (weightKg ?? null) !== null ? (
          <div className="mt-1 flex items-center gap-3 text-[11px] uppercase tracking-[0.28em] text-black/45">
            <span>{heightCm} cm</span>
            <span className="h-1 w-1 rounded-full bg-black/30" />
            <span>{weightKg} kg</span>
          </div>
        ) : null}
      </div>
    </div>
  );
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
    return "Your profile";
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
          titleClassName="text-[17px] font-semibold tracking-[0.18em] uppercase text-black/70"
        />
      }
      maxContent="responsive"
      showHeaderBorder={false}
      showBottomBarBorder={false}
      bottomBar={bottomBar}
      bottomBarSticky
      scrollAreaClassName="bg-gradient-to-b from-[var(--soft-gray)] via-[var(--background)] to-[var(--warm-cream)]/60"
      contentClassName="space-y-8 pb-24 safe-area-bottom"
      headerInScrollArea
    >
      <ProfileHero
        isLoading={isLoading}
        displayName={getDisplayName()}
        initials={getInitials()}
        heightCm={profile?.height_cm}
        weightKg={profile?.weight_kg}
      />

      <section className="space-y-3">
        <SectionTitle>Account & Settings</SectionTitle>
        <div className="space-y-2">
          {ACCOUNT_AND_SETTINGS_ITEMS.map((item) => (
            <SettingItem key={item.label} {...item} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <SectionTitle>Support</SectionTitle>
        <div className="space-y-2">
          {SUPPORT_ITEMS.map((item) => (
            <SettingItem key={item.label} {...item} />
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <SettingItem
          label={isSigningOut ? "Signing out…" : "Logout"}
          description="Switch accounts or exit"
          icon={LogOut}
          accentStyle={{
            background: "linear-gradient(135deg, rgba(224,122,95,0.32) 0%, rgba(242,204,143,0.24) 100%)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6)",
          }}
          onClick={handleSignOut}
          disabled={isSigningOut}
          rightSlot={
            isSigningOut ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
            ) : (
              <ChevronRight className="h-4 w-4 text-[var(--primary)]" strokeWidth={2.5} />
            )
          }
        />
      </section>

      <footer className="pt-2 text-center text-[11px] font-semibold uppercase tracking-[0.32em] text-black/35">
        APP VERSION: {APP_VERSION} ({APP_BUILD_LABEL.toUpperCase()})
      </footer>
    </AppScreen>
  );
}

