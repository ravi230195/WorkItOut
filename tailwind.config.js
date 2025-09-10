/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./App.tsx",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-family)", "system-ui", "sans-serif"],
      },
      colors: {
        /* App surface tokens */
        background: "var(--background)",
        card: "hsl(var(--card-hsl))",
        "card-foreground": "var(--card-foreground)",
        popover: "var(--popover)",
        "popover-foreground": "var(--popover-foreground)",

        /* Semantic tokens */
        border: "var(--border)",
        "border-light": "var(--border-light)",
        input: "var(--input)",
        "input-background": "var(--input-background)",
        "input-border": "var(--input-border)",
        "input-focus": "var(--input-focus)",
        success: "var(--success)",
        "success-light": "var(--success-light)",
        destructive: "var(--destructive)",
        "destructive-light": "var(--destructive-light)",

        /* Text & brand (HSL so /opacity works) */
        foreground: "hsl(var(--foreground-hsl))",
        "muted-foreground": "hsl(var(--muted-foreground-hsl))",
        primary: "hsl(var(--primary-hsl))",
        "primary-foreground": "var(--primary-foreground)",
        "primary-hover": "var(--primary-hover)",
        "primary-light": "var(--primary-light)",

        /* Warm palette (HSL so /opacity works) */
        "warm-brown": "hsl(var(--warm-brown-hsl))",
        "warm-coral": "hsl(var(--warm-coral-hsl))",
        "warm-sage": "hsl(var(--warm-sage-hsl))",
        "warm-cream": "hsl(var(--warm-cream-hsl))",
        "warm-peach": "hsl(var(--warm-peach-hsl))",
        "warm-mint": "hsl(var(--warm-mint-hsl))",
        "soft-gray": "hsl(var(--soft-gray-hsl))",
        "accent-blue": "hsl(var(--accent-blue-hsl))",
        "ring-track-gray": "hsl(var(--ring-track-gray-hsl))",
        "recovery-yellow": "hsl(var(--recovery-yellow-hsl))",

        /* Overlay & shadow colors */
        overlay: "hsl(var(--overlay-hsl))",
        shadow: "hsl(var(--shadow-hsl))",

        /* Keep raw background/muted as vars (not HSL) if you prefer */
        muted: "var(--muted)",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        "2xl": "var(--radius-2xl)",
        full: "var(--radius-full)",
      },
      fontSize: {
        xs: "0.75rem",
        sm: "0.875rem",
        base: "1rem",
        lg: "1.125rem",
        xl: "1.25rem",
        "2xl": "1.5rem",
        "3xl": "1.875rem",
        "4xl": "2.25rem",
        "5xl": "3rem",
      },
      fontWeight: {
        light: "var(--font-weight-light)",
        normal: "var(--font-weight-normal)",
        medium: "var(--font-weight-medium)",
        semibold: "var(--font-weight-semibold)",
        bold: "var(--font-weight-bold)",
      },
      spacing: {
        "1": "var(--space-1)",
        "2": "var(--space-2)",
        "3": "var(--space-3)",
        "4": "var(--space-4)",
        "5": "var(--space-5)",
        "6": "var(--space-6)",
        "8": "var(--space-8)",
        "10": "var(--space-10)",
        "12": "var(--space-12)",
        "16": "var(--space-16)",
        "20": "var(--space-20)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
      },
      transitionDuration: {
        fast: "var(--transition-fast)",
        normal: "var(--transition-normal)",
        slow: "var(--transition-slow)",
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-out",
        "slide-in-left": "slideInLeft 0.5s ease-out",
        "slide-in-right": "slideInRight 0.5s ease-out",
        "scale-in": "scaleIn 0.3s ease-out",
        bounce: "bounce 1s ease-in-out",
      },
    },
  },
  plugins: [
    require("@tailwindcss/forms"),
    require("@tailwindcss/typography"),
    require("@tailwindcss/aspect-ratio"),
  ],
};
