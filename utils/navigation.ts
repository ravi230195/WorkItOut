export type AppView = 
  | "signin"
  | "signup"
  | "workouts" 
  | "create-routine"
  | "add-exercises-to-routine"
  | "exercise-setup"

  | "progress"
  | "profile";

export const VIEWS_WITHOUT_BOTTOM_NAV: AppView[] = [
  "signin",
  "signup", 
  "create-routine",
  "add-exercises-to-routine",
  "exercise-setup",

];

export type ViewType = AppView;