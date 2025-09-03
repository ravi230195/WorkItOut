import type React from "react";
import type { LucideIcon } from "lucide-react";
import { Dumbbell, TrendingUp, User } from "lucide-react";

export type TabType = "workouts" | "progress" | "profile";

interface BottomNavigationProps {
  /**
   * Current active tab. When provided along with `onTabChange`,
   * the navigation renders the standard tab bar.
   */
  activeTab?: TabType;
  /**
   * Handler for switching tabs. Requires `activeTab`.
   */
  onTabChange?: (tab: TabType) => void;

  /**
   * Optional custom content. When set, tabs are ignored and the
   * children are rendered instead, allowing the component to act
   * as a generic bottom action bar.
   */
  children?: React.ReactNode;

  /** Additional classes on the root container */
  className?: string;
}

export function BottomNavigation({
  activeTab,
  onTabChange,
  children,
  className = "",
}: BottomNavigationProps) {
  const tabs: Array<{ id: TabType; label: string; icon: LucideIcon }> = [
    { id: "workouts", label: "Workouts", icon: Dumbbell },
    { id: "progress", label: "Progress", icon: TrendingUp },
    { id: "profile", label: "Profile", icon: User },
  ];

  // Render custom content when provided
  if (children) {
    return (
      <nav
        aria-label="Bottom navigation"
        className={`w-full h-14 ${className}`}
      >
        <div className="flex h-full w-full items-center justify-center gap-3">
          {children}
        </div>
      </nav>
    );
  }

  // Fallback to tab navigation
  return (
    <nav
      aria-label="Bottom navigation"
      className={`w-full h-14 ${className}`}
    >
      <ul className="flex h-full w-full justify-around">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <li key={tab.id} className="flex-1">
              <button
                onClick={() => onTabChange && onTabChange(tab.id)}
                className="flex h-full w-full flex-col items-center justify-center gap-1 text-xs"
                aria-current={isActive ? "page" : undefined}
              >
                <tab.icon
                  size={20}
                  className={isActive ? "text-warm-brown" : "text-warm-brown/50"}
                />
                <span
                  className={isActive ? "font-medium text-warm-brown" : "text-warm-brown/50"}
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

