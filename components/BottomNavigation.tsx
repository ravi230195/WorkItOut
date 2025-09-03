import type { LucideIcon } from "lucide-react";
import { Dumbbell, TrendingUp, User } from "lucide-react";

export type TabType = "workouts" | "progress" | "profile";

interface BottomNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export function BottomNavigation({ activeTab, onTabChange }: BottomNavigationProps) {
  const tabs: Array<{ id: TabType; label: string; icon: LucideIcon }> = [
    { id: "workouts", label: "Workouts", icon: Dumbbell },
    { id: "progress", label: "Progress", icon: TrendingUp },
    { id: "profile", label: "Profile", icon: User },
  ];

  return (
    <nav aria-label="Bottom navigation" className="w-full"
      style={{
        //border: "1px solid red",
      }}
    >
      <ul className="flex justify-around"
        style={{
          //border: "1px solid green",
        }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <li key={tab.id} className="flex-1">
              <button
                onClick={() => onTabChange(tab.id)}
                className="w-full flex flex-col items-center gap-1 py-2 text-xs"
                aria-current={isActive ? "page" : undefined}
              >
                <span>
                  <tab.icon
                    size={20}
                    className={
                      isActive ? "text-warm-brown-bold-800" : "text-warm-brown"
                    }
                  />
                </span>
                <span
                  className={
                    isActive
                      ? "font-medium text-warm-brown-bold-800"
                      : "text-warm-brown"
                  }
                >
                  {tab.label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}