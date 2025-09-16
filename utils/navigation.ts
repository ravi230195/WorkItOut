export type AppView =
  | "welcome"
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
  "welcome",
  "signin",
  "signup",
  "create-routine",
  "add-exercises-to-routine",
  "exercise-setup",
  "edit-measurements",

];

export type ViewType = AppView;