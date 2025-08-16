export type AppView = 
  | "signin"
  | "signup"
  | "workouts" 
  | "routines"
  | "active-workout" 
  | "exercise-selection"
  | "create-routine"
  | "add-exercises-to-routine"
  | "exercise-setup"
  | "routine-editor"
  | "progress"
  | "profile";

export const VIEWS_WITHOUT_BOTTOM_NAV: AppView[] = [
  "signin",
  "signup", 
  "active-workout", 
  "exercise-selection", 
  "create-routine",
  "add-exercises-to-routine",
  "exercise-setup",
  "routine-editor"
];

export type ViewType = AppView;