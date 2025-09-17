import { useState, useEffect, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { TactileButton } from "../TactileButton";
import { Avatar, AvatarFallback } from "../ui/avatar";
import {
  User,
  Settings,
  LogOut,
  Smartphone,
  Bell,
  Eye,
  HelpCircle,
  BookOpen,
  Info,
  GraduationCap,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../AuthContext";
import { supabaseAPI, type Profile } from "../../utils/supabase/supabase-api";
import { toast } from "sonner";
import { AppScreen, ScreenHeader, Section, Stack, Spacer } from "../layouts";
import ListItem from "../ui/ListItem";

type ItemTone = "coral" | "sage";

interface MenuItem {
  icon: LucideIcon;
  label: string;
  subtitle?: string;
  onClick?: () => void;
}

interface ProfileScreenProps {
  bottomBar?: ReactNode;
  onNavigateToMyAccount?: () => void;
  onNavigateToAppSettings?: () => void;
}

const toneStyles: Record<
  ItemTone,
  {
    leadingBg: string;
    leadingColor: string;
    border: string;
    hoverBg: string;
    focusRing: string;
    chevron: string;
    shadow: string;
  }
> = {
  coral: {
    leadingBg: "bg-[hsl(var(--warm-coral-hsl)/0.16)]",
    leadingColor: "text-[hsl(var(--warm-coral-hsl))]",
    border: "border-[color:hsl(var(--warm-coral-hsl)/0.32)]",
    hoverBg: "hover:bg-[hsl(var(--warm-coral-hsl)/0.08)]",
    focusRing: "focus-visible:ring-[hsl(var(--warm-coral-hsl)/0.32)]",
    chevron: "text-[hsl(var(--warm-coral-hsl)/0.55)]",
    shadow: "shadow-[0_18px_40px_rgba(214,118,107,0.18)]",
  },
  sage: {
    leadingBg: "bg-[hsl(var(--warm-sage-hsl)/0.18)]",
    leadingColor: "text-[hsl(var(--warm-sage-hsl))]",
    border: "border-[color:hsl(var(--warm-sage-hsl)/0.28)]",
    hoverBg: "hover:bg-[hsl(var(--warm-sage-hsl)/0.08)]",
    focusRing: "focus-visible:ring-[hsl(var(--warm-sage-hsl)/0.3)]",
    chevron: "text-[hsl(var(--warm-sage-hsl)/0.55)]",
    shadow: "shadow-[0_18px_40px_rgba(130,170,141,0.18)]",
  },
};

function ProfileMenuRow({
  item,
  tone,
}: {
  item: MenuItem;
  tone: ItemTone;
}) {
  const Icon = item.icon;
  const palette = toneStyles[tone];

  return (
    <ListItem
      as="button"
      type="button"
      onClick={item.onClick}
      leading={<Icon size={18} />}
      leadingClassName={`w-12 h-12 rounded-xl border border-white/40 bg-white/60 backdrop-blur-sm grid place-items-center ${palette.leadingBg} ${palette.leadingColor}`}
      primary={item.label}
      primaryClassName="text-[color:var(--warm-brown)] font-semibold tracking-[0.14em] text-[13px] uppercase"
      secondary={item.subtitle}
      secondaryClassName="text-sm text-[color:var(--warm-brown)]/70"
      trailing={<ChevronRight className={`size-4 ${palette.chevron}`} />}
      className={`w-full rounded-2xl border-2 px-4 py-0 text-left transition-all duration-200 card-modern bg-[color:var(--background)]/85 backdrop-blur-sm hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 ${palette.border} ${palette.hoverBg} ${palette.focusRing} ${palette.shadow}`}
    />
  );
}

export function ProfileScreen({
  bottomBar,
  onNavigateToMyAccount,
  onNavigateToAppSettings,
}: ProfileScreenProps) {
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
    const names = displayName.split(" ");
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return displayName.slice(0, 2).toUpperCase();
  };

  const accountItems: MenuItem[] = [
    {
      icon: User,
      label: "MY ACCOUNT",
      onClick: onNavigateToMyAccount,
    },
    {
      icon: Settings,
      label: "APP SETTINGS",
      onClick: onNavigateToAppSettings,
    },
    {
      icon: Smartphone,
      label: "DEVICE SETTINGS",
      onClick: () => toast.info("Device settings coming soon"),
    },
    {
      icon: Bell,
      label: "NOTIFICATIONS",
      onClick: () => toast.info("Notification settings coming soon"),
    },
    {
      icon: Eye,
      label: "PRIVACY SETTINGS",
      onClick: () => toast.info("Privacy settings coming soon"),
    },
  ];

  const supportItems: MenuItem[] = [
    {
      icon: HelpCircle,
      label: "HELP & SUPPORT",
      subtitle: "Get help or ask a question",
      onClick: () => toast.info("Support coming soon"),
    },
    {
      icon: BookOpen,
      label: "TUTORIALS",
      onClick: () => toast.info("Tutorials coming soon"),
    },
    {
      icon: Info,
      label: "ABOUT",
      onClick: () => toast.info("About page coming soon"),
    },
    {
      icon: GraduationCap,
      label: "GETTING STARTED",
      onClick: () => toast.info("Getting started guide coming soon"),
    },
  ];

  const renderMenuGroup = (
    title: string,
    items: MenuItem[],
    tone: ItemTone,
  ) => (
    <Section key={title} variant="plain" padding="none" className="space-y-4">
      <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.32em] text-black/55">
        {title}
      </p>
      <div className="space-y-3">
        {items.map((item) => (
          <ProfileMenuRow key={item.label} item={item} tone={tone} />
        ))}
      </div>
    </Section>
  );

  return (
    <AppScreen
      header={
        <ScreenHeader
          title="Profile"
          denseSmall
          showBorder={false}
          titleClassName="text-[17px] font-bold"
        />
      }
      maxContent="responsive"
      showHeaderBorder={false}
      showBottomBarBorder={false}
      bottomBar={bottomBar}
      bottomBarSticky
      scrollAreaClassName="bg-gradient-to-b from-[hsl(var(--soft-gray-hsl)/0.8)] via-[color:var(--background)] to-[hsl(var(--warm-cream-hsl)/0.85)]"
      contentBottomPaddingClassName="pb-12"
      headerInScrollArea
    >
      <Stack gap="xl">
        <Section variant="plain" padding="none">
          <div className="relative overflow-hidden rounded-[32px] border border-[color:hsl(var(--warm-coral-hsl)/0.22)] bg-[hsl(var(--warm-coral-hsl)/0.12)] px-8 py-10 text-center shadow-sm">
            <div className="absolute inset-x-8 top-0 h-24 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.55),_transparent)]" />
            <div className="relative flex flex-col items-center gap-4">
              <Avatar className="h-20 w-20 shadow-lg">
                <AvatarFallback className="h-full w-full rounded-full bg-[color:var(--primary)] text-lg font-semibold text-white">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>

              {isLoading ? (
                <div className="text-sm text-black/60">Loading profile...</div>
              ) : (
                <div className="space-y-1">
                  <h1 className="text-xl font-semibold text-black">
                    {getDisplayName()}
                  </h1>
                  {profile?.email ? (
                    <p className="text-sm text-black/60">{profile.email}</p>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </Section>

        {renderMenuGroup("Account & Settings", accountItems, "coral")}
        {renderMenuGroup("Support", supportItems, "sage")}

        <Section variant="plain" padding="none">
          <TactileButton
            variant="sage"
            className="w-full justify-center gap-2 rounded-3xl border-2 border-[color:hsl(var(--warm-coral-hsl)/0.25)] bg-transparent py-4 text-[color:var(--primary)] transition-colors duration-200 hover:bg-[hsl(var(--warm-coral-hsl)/0.08)]"
            onClick={handleSignOut}
            disabled={isSigningOut}
          >
            {isSigningOut ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <LogOut size={16} />
            )}
            {isSigningOut ? "Signing out..." : "Logout"}
          </TactileButton>
        </Section>

        <Section variant="plain" padding="none" className="pb-10">
          <Spacer y="xs" />
          <p className="text-center text-xs font-medium tracking-[0.2em] text-black/45">
            App version: 1.0.0 (build 1234)
          </p>
        </Section>
      </Stack>
    </AppScreen>
  );
}
