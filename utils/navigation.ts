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
  | "profile"
  | "profile-my-account"
  | "profile-app-settings";

export const VIEWS_WITHOUT_BOTTOM_NAV: AppView[] = [
  "welcome",
  "signin",
  "signup",
  "create-routine",
  "add-exercises-to-routine",
  "exercise-setup",
  "edit-measurements",

  "profile-my-account",
  "profile-app-settings",
];

export type ViewType = AppView;