export function useThemeTokens() {
    const css =
      typeof window !== "undefined" && typeof document !== "undefined"
        ? getComputedStyle(document.documentElement)
        : null;
  
    const read = (name: string, fallback: string) =>
      css?.getPropertyValue(name)?.trim() || fallback;
  
    return {
      warmBrown: read("--foreground", "#3d2914"),
      warmCoral: read("--primary", "#e07a5f"),
      accentBlue: read("--accent-blue", "#4aa3df"),
      trackGray: read("--ring-track-gray", "#d1d5db"),
    };
  }
  