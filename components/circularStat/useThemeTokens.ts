export function useThemeTokens() {
  const css =
    typeof window !== "undefined" && typeof document !== "undefined"
      ? getComputedStyle(document.documentElement)
      : null;

  const read = (name: string) => css?.getPropertyValue(name)?.trim() || "";

  return {
    warmBrown: read("--foreground"),
    warmCoral: read("--primary"),
    accentBlue: read("--accent-blue"),
    trackGray: read("--ring-track-gray"),
    recoveryYellow: read("--recovery-yellow"),
  };
}
  