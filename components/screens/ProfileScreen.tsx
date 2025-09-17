// components/screens/ProfileScreen.tsx
import { useState, useEffect, useMemo } from "react";
import { TactileButton } from "../TactileButton";
import { Avatar, AvatarFallback } from "../ui/avatar";
import type { LucideIcon } from "lucide-react";
import {
  Bell,
  BookOpen,
  ChevronRight,
  Cog,
  HelpCircle,
  Info,
  LogOut,
  Rocket,
  Shield,
  Smartphone,
  UserRound,
} from "lucide-react";
import { useAuth } from "../AuthContext";
import { supabaseAPI, Profile } from "../../utils/supabase/supabase-api";
import { toast } from "sonner";
import { AppScreen, ScreenHeader } from "../layouts";
import { logger } from "../../utils/logging";

interface ProfileScreenProps {
  bottomBar?: React.ReactNode;
}

interface ProfileAction {
  label: string;
  icon: LucideIcon;
  onClick?: () => void;
  disabled?: boolean;
}

export function ProfileScreen({ bottomBar }: ProfileScreenProps) {
  const { userToken, signOut: authSignOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const accountAndSettings = useMemo<ProfileAction[]>(
    () => [
      { label: "My Account", icon: UserRound },
      { label: "App Settings", icon: Cog },
      { label: "Device Settings", icon: Smartphone },
      { label: "Notifications", icon: Bell },
      { label: "Privacy Settings", icon: Shield },
    ],
    []
  );

  const supportAndGuidance = useMemo<ProfileAction[]>(
    () => [
      { label: "Help & Support", icon: HelpCircle },
      { label: "Tutorials", icon: BookOpen },
      { label: "About", icon: Info },
      { label: "Getting Started", icon: Rocket },
    ],
    []
  );

  useEffect(() => {
    const fetchProfile = async () => {
      if (!userToken) return;

      setIsLoadingProfile(true);
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
        setIsLoadingProfile(false);
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
          titleClassName="text-[17px] font-semibold tracking-tight"
        />
      }
      maxContent="sm"
      showHeaderBorder={false}
      showBottomBarBorder={false}
      bottomBar={bottomBar}
      bottomBarSticky
      contentClassName="bg-background"
      headerInScrollArea
    >
      <div className="flex flex-col gap-10 pb-6">
        <section>
          <div className="flex overflow-hidden rounded-3xl border border-primary/15 bg-white/80 shadow-sm backdrop-blur">
            <span
              aria-hidden
              className="block w-20 bg-gradient-to-b from-primary-light via-primary to-primary"
            />
            <div className="flex flex-1 flex-col gap-6 px-6 py-8">
              <div className="flex items-center gap-4">
                <Avatar className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/20">
                  <AvatarFallback className="text-base font-semibold text-primary">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  {isLoadingProfile ? (
                    <p className="text-sm text-black/70">Loading profile...</p>
                  ) : (
                    <>
                      <h1 className="text-lg font-semibold text-black">{getDisplayName()}</h1>
                      <p className="text-sm text-black/60">Keep moving forward.</p>
                    </>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-black/40">
                <span>Member Profile</span>
                <span className="hidden h-2 w-[1px] bg-black/20 sm:block" aria-hidden />
                <span className="hidden text-black/40 sm:inline">Personal Settings</span>
              </div>
            </div>
          </div>
        </section>

        <ProfileSection title="Account & Settings" items={accountAndSettings} />

        <ProfileSection title="Support" items={supportAndGuidance} />

        <section className="mt-4 space-y-3">
          <TactileButton
            variant="sage"
            className="w-full flex items-center justify-center gap-2 rounded-2xl border-0 text-sm font-semibold"
            onClick={handleSignOut}
            disabled={isSigningOut}
          >
            {isSigningOut ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <LogOut size={16} />
            )}
            {isSigningOut ? "Signing Out..." : "Logout"}
          </TactileButton>

          <p className="text-center text-[11px] uppercase tracking-[0.2em] text-black/40">
            App Version 1.0.0 (Build 1234)
          </p>
        </section>
      </div>
    </AppScreen>
  );
}

interface ProfileSectionProps {
  title: string;
  items: ProfileAction[];
}

function ProfileSection({ title, items }: ProfileSectionProps) {
  return (
    <section className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-black/40">
        {title}
      </p>
      <div className="overflow-hidden rounded-3xl border border-primary/10 bg-white/70 shadow-sm backdrop-blur">
        <div className="divide-y divide-primary/10">
          {items.map((item) => (
            <ProfileListItem key={item.label} {...item} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ProfileListItem({ label, icon: Icon, onClick, disabled }: ProfileAction) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15 text-primary">
        <Icon size={18} />
      </span>
      <span className="flex-1 text-sm font-medium text-black">{label}</span>
      <ChevronRight size={18} className="text-black/30 transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}
