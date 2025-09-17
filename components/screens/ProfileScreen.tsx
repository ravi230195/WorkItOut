import { useState, useEffect, type ReactNode } from "react";
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

interface MenuItem {
  icon: ReactNode;
  label: string;
  subtitle?: string;
  onClick?: () => void;
}

interface ProfileScreenProps {
  onNavigateToMyAccount: () => void;
  onNavigateToAppSettings: () => void;
}

export function ProfileScreen({ onNavigateToMyAccount, onNavigateToAppSettings }: ProfileScreenProps) {
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
      icon: <User size={20} className="text-[var(--warm-coral)]" />,
      label: "MY ACCOUNT",
      onClick: onNavigateToMyAccount,
    },
    {
      icon: <Settings size={20} className="text-[var(--warm-coral)]" />,
      label: "APP SETTINGS",
      onClick: onNavigateToAppSettings,
    },
    {
      icon: <Smartphone size={20} className="text-[var(--warm-coral)]" />,
      label: "DEVICE SETTINGS",
      onClick: () => toast.info("Device settings coming soon"),
    },
    {
      icon: <Bell size={20} className="text-[var(--warm-coral)]" />,
      label: "NOTIFICATIONS",
      onClick: () => toast.info("Notification settings coming soon"),
    },
    {
      icon: <Eye size={20} className="text-[var(--warm-coral)]" />,
      label: "PRIVACY SETTINGS",
      onClick: () => toast.info("Privacy settings coming soon"),
    },
  ];

  const supportItems: MenuItem[] = [
    {
      icon: <HelpCircle size={20} className="text-[var(--warm-sage)]" />,
      label: "HELP & SUPPORT",
      subtitle: "Get help or ask a question",
      onClick: () => toast.info("Support coming soon"),
    },
    {
      icon: <BookOpen size={20} className="text-[var(--warm-sage)]" />,
      label: "TUTORIALS",
      onClick: () => toast.info("Tutorials coming soon"),
    },
    {
      icon: <Info size={20} className="text-[var(--warm-sage)]" />,
      label: "ABOUT",
      onClick: () => toast.info("About page coming soon"),
    },
    {
      icon: <GraduationCap size={20} className="text-[var(--warm-sage)]" />,
      label: "GETTING STARTED",
      onClick: () => toast.info("Getting started guide coming soon"),
    },
  ];

  const renderMenuItem = (item: MenuItem) => (
    <button
      key={item.label}
      onClick={item.onClick}
      className="w-full p-4 rounded-xl bg-[var(--warm-brown)]/5 hover:bg-[var(--warm-brown)]/10 transition-all duration-200 flex items-center justify-between group"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-white/60 flex items-center justify-center">
          {item.icon}
        </div>
        <div className="text-left">
          <div className="text-[var(--warm-brown)] font-medium tracking-wide">
            {item.label}
          </div>
          {item.subtitle && (
            <div className="text-[var(--warm-brown)]/60 text-sm mt-0.5">
              {item.subtitle}
            </div>
          )}
        </div>
      </div>
      <ChevronRight
        size={16}
        className="text-[var(--warm-brown)]/40 group-hover:text-[var(--warm-brown)]/60 transition-colors"
      />
    </button>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--soft-gray)] via-[var(--background)] to-[var(--warm-cream)]/30">
      <div className="p-6 space-y-8 max-w-md mx-auto pb-24">
        <div className="text-center pt-4">
          <Avatar className="w-20 h-20 mx-auto mb-4 bg-[var(--warm-coral)] text-white shadow-lg">
            <AvatarFallback className="bg-[var(--warm-coral)] text-white text-lg">
              {getInitials()}
            </AvatarFallback>
          </Avatar>

          {isLoading ? (
            <div className="text-[var(--warm-brown)]/60">Loading profile...</div>
          ) : (
            <>
              <h1 className="text-xl font-medium text-[var(--warm-brown)] mb-1">
                {getDisplayName()}
              </h1>
              {profile?.email && (
                <div className="text-sm text-[var(--warm-brown)]/60">
                  {profile.email}
                </div>
              )}
            </>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-sm tracking-[0.1em] text-[var(--warm-brown)]/70 font-medium mb-4">
            ACCOUNT & SETTINGS
          </h2>
          <div className="space-y-3">
            {accountItems.map(renderMenuItem)}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-sm tracking-[0.1em] text-[var(--warm-brown)]/70 font-medium mb-4">
            SUPPORT
          </h2>
          <div className="space-y-3">
            {supportItems.map(renderMenuItem)}
          </div>
        </div>

        <div className="pt-4">
          <TactileButton
            variant="sage"
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl border-2 border-[var(--warm-brown)]/20 bg-transparent text-[var(--warm-brown)] hover:bg-[var(--warm-brown)]/5"
            onClick={handleSignOut}
            disabled={isSigningOut}
          >
            {isSigningOut ? (
              <div className="w-4 h-4 animate-spin border-2 border-current border-t-transparent rounded-full" />
            ) : (
              <LogOut size={16} />
            )}
            {isSigningOut ? "SIGNING OUT..." : "LOGOUT"}
          </TactileButton>
        </div>

        <div className="text-center pt-4">
          <div className="text-sm text-[var(--warm-brown)]/50 tracking-wide">
            APP VERSION: 1.0.0 (BUILD 1234)
          </div>
        </div>
      </div>
    </div>
  );
}
