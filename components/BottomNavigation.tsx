import { TrendingUp, Dumbbell, User } from "lucide-react";
import { TactileButton } from "./TactileButton";

export type TabType = "workouts" | "progress" | "profile";

interface BottomNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export function BottomNavigation({ activeTab, onTabChange }: BottomNavigationProps) {
  const tabs = [
    {
      id: "workouts" as TabType,
      label: "Workouts",
      icon: Dumbbell,
      variant: activeTab === "workouts" ? "primary" : "secondary"
    },
    {
      id: "progress" as TabType,
      label: "Progress",
      icon: TrendingUp,
      variant: activeTab === "progress" ? "sage" : "secondary"
    },
    {
      id: "profile" as TabType,
      label: "Profile",
      icon: User,
      variant: activeTab === "profile" ? "peach" : "secondary"
    }
  ] as const;

  return (
    <div className="w-full">
      <div className="flex justify-center gap-2 max-w-md mx-auto">
        {tabs.map((tab) => (
          <TactileButton
            key={tab.id}
            variant={tab.variant}
            size="md"
            className={`flex-1 flex flex-col items-center gap-1 py-2 ${activeTab === tab.id ? "" : "shadow-sm"
              }`}
            onClick={() => onTabChange(tab.id)}
          >
            <tab.icon size={18} />
            <span className="text-xs">{tab.label}</span>
          </TactileButton>
        ))}
      </div>
    </div>
  );
}