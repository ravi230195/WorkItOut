// components/layout/layout-types.ts
export type MaxContent =
  | "none"
  | "responsive"
  | "sm"
  | "md"
  | "lg"
  | "xl"
  | "2xl"
  | "3xl";

/** Tailwind max-width classes for fixed scales. */
const widthMap: Record<Exclude<MaxContent, "none" | "responsive">, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
};

/** Ramped responsive max-widths for phones → tablets → desktops. */
const responsiveRamp =
  "max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl xl:max-w-3xl 2xl:max-w-4xl";

/** Map a MaxContent value to Tailwind classes. */
export function classForMaxContent(kind: MaxContent): string {
  if (kind === "none") return "";
  if (kind === "responsive") return responsiveRamp;
  return widthMap[kind] ?? "";
}
