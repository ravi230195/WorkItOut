export type AppView = 
  | "landing"
  | "signin"
  | "signup"
  | "workouts" 
  | "create-routine"
  | "add-exercises-to-routine"
  | "exercise-setup"
  | "edit-measurements"

  | "progress"
  | "profile";

export const VIEWS_WITHOUT_BOTTOM_NAV: AppView[] = [
  "signin",
  "landing",
  "signup", 
  "create-routine",
  "add-exercises-to-routine",
  "exercise-setup",
  "edit-measurements",

];

export type ViewType = AppView;