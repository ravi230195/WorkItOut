import type { LucideIcon } from "lucide-react";
import { TrendingUp, Dumbbell, User } from "lucide-react";
import { TactileButton } from "./TactileButton";

export type TabType = "workouts" | "progress" | "profile";

// Match TactileButton's allowed variants (from your error message)
type ButtonVariant = "primary" | "secondary" | "sage" | "peach" | "mint";

interface BottomNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export function BottomNavigation({ activeTab, onTabChange }: BottomNavigationProps) {
  const tabs: Array<{
    id: TabType;
    label: string;
    icon: LucideIcon;
    activeVariant: ButtonVariant;
  }> = [
    { id: "workouts", label: "Workouts", icon: Dumbbell,  activeVariant: "primary" },
    { id: "progress", label: "Progress", icon: TrendingUp, activeVariant: "sage"    },
    { id: "profile",  label: "Profile",  icon: User,       activeVariant: "peach"   },
  ];

  return (
    <nav aria-label="Bottom navigation" className="w-full">
      <div className="flex justify-center gap-2">
        {tabs.map((tab) => {
          const variant: ButtonVariant =
            activeTab === tab.id ? tab.activeVariant : "secondary";

          return (
            <TactileButton
              key={tab.id}
              variant={variant}
              size="md"
              className={`flex-1 flex flex-col items-center gap-1 py-2 ${activeTab === tab.id ? "" : "shadow-sm"}`}
              onClick={() => onTabChange(tab.id)}
            >
              <tab.icon size={14} />
              <span className="text-xs">{tab.label}</span>
            </TactileButton>
          );
        })}
      </div>
    </nav>
  );
}