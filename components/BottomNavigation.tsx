import type { ReactNode } from "react";
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
  children?: ReactNode;

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
        className={`w-full h-14 flex items-center justify-center bg-background ${className}`}
      >
        <div className="flex w-full items-center justify-center gap-3">
          {children}
        </div>
      </nav>
    );
  }

  // Fallback to tab navigation
  return (
    <nav
      aria-label="Bottom navigation"
      className={`w-full h-14 flex items-center justify-center bg-background ${className}`}
    >
      <ul className="w-full flex justify-around">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <li key={tab.id} className="flex-1">
              <button
                onClick={() => onTabChange && onTabChange(tab.id)}
                className="w-full flex flex-col items-center gap-1 py-2 text-xs"
                aria-current={isActive ? "page" : undefined}
              >
                <span>
                  <tab.icon
                    size={20}
                    className={
                      isActive ? "text-black" : "text-black"
                    }
                  />
                </span>
                <span
                  className={
                    isActive
                      ? "font-medium text-black"
                      : "text-black"
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