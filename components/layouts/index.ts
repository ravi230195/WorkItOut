// components/layout/index.ts
export { default as AppScreen } from "./AppScreen";
export type { AppScreenProps } from "./AppScreen";

export { default as ScreenHeader } from "./ScreenHeader";
export { default as Section } from "./Section";

export { default as FooterBar } from "./FooterBar";
export type { FooterBarProps, Align, Bg } from "./FooterBar";

export { default as Spacer } from "./Spacer";
export type { Space } from "./Spacer";

export { default as Stack } from "./Stack";
export type { StackProps, GapMode } from "./Stack";

export type { MaxContent } from "./layout-types";
export { classForMaxContent } from "./layout-types";
