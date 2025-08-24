import * as React from "react";

type Padding = "none" | "xs" | "sm" | "md" | "lg";
type Radius  = "none" | "sm" | "md" | "lg" | "xl" | "2xl";
type Shadow  = "none" | "sm" | "md";
type Bg      = "transparent" | "card" | "muted" | "translucent";
type Divider = "none" | "top" | "bottom" | "both";
type Variant = "plain" | "card" | "panel" | "translucent" | "muted";

export type SectionProps<T extends keyof JSX.IntrinsicElements = "section"> = {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;

  /** Style knobs (still override variant) */
  padding?: Padding;      // default "md"
  radius?: Radius;        // default "2xl"
  shadow?: Shadow;        // default "none" (changed)
  bg?: Bg;                // default "transparent" (changed)
  divider?: Divider;      // default "none"

  /** Preset look-and-feel (default "plain" — changed) */
  variant?: Variant;

  /** Make the section edge-to-edge on small screens */
  bleedX?: boolean;

  /** Loading */
  loading?: boolean;
  loadingBehavior?: "overlay" | "replace"; // default "overlay"
  skeleton?: React.ReactNode;              // used when replace

  className?: string;
  as?: T;
} & Omit<React.ComponentPropsWithoutRef<T>, "as" | "title">;

const padMap: Record<Padding, string> = {
  none: "p-0",
  xs: "p-2",
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
};
const radiusMap: Record<Radius, string> = {
  none: "rounded-none",
  sm: "rounded-md",
  md: "rounded-lg",
  lg: "rounded-xl",
  xl: "rounded-2xl",
  "2xl": "rounded-2xl",
};
const shadowMap: Record<Shadow, string> = {
  none: "shadow-none",
  sm: "shadow-sm",
  md: "shadow-md",
};
const bgMap: Record<Bg, string> = {
  transparent: "bg-transparent",
  card: "bg-white",
  muted: "bg-[var(--soft-gray)]/30",
  translucent: "bg-white/80 backdrop-blur-sm",
};
const dividerMap: Record<Divider, string> = {
  none: "",
  top: "border-t border-[var(--border)]",
  bottom: "border-b border-[var(--border)]",
  both: "border-y border-[var(--border)]",
};

/** Variant presets (props that follow still take precedence) */
const variantClass: Record<Variant, string> = {
  plain: "bg-transparent shadow-none rounded-none",
  card: "bg-white shadow-sm rounded-2xl",
  panel: "bg-white shadow-md rounded-2xl border border-[var(--border)]",
  translucent: "bg-white/80 backdrop-blur-sm shadow-sm rounded-2xl",
  muted: "bg-[var(--soft-gray)]/30 rounded-2xl shadow-none",
};

export default function Section<T extends keyof JSX.IntrinsicElements = "section">({
  title,
  subtitle,
  actions,
  padding = "md",
  radius = "2xl",
  shadow = "none",           // << changed default
  bg = "transparent",        // << changed default
  divider = "none",
  variant = "plain",         // << changed default
  bleedX = false,
  loading = false,
  loadingBehavior = "overlay",
  skeleton,
  className = "",
  as,
  children,
  ...rest
}: SectionProps<T>) {
  const Comp = (as || "section") as any;
  const titleId = React.useId();

  const classes = [
    "w-full relative",                    // relative for overlay
    variant ? variantClass[variant] : "", // preset (props below can override)
    bgMap[bg],
    radiusMap[radius],
    shadowMap[shadow],
    padMap[padding],
    dividerMap[divider],
    bleedX ? "-mx-4 sm:mx-0" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const hasHeader = title || actions || subtitle;

  const content =
    loading && loadingBehavior === "replace"
      ? skeleton ?? (
          <div className="animate-pulse">
            {hasHeader && (
              <div className="mb-3">
                <div className="h-4 w-1/3 bg-black/10 rounded" />
                <div className="mt-2 h-3 w-1/2 bg-black/5 rounded" />
              </div>
            )}
            <div className="h-24 bg-black/5 rounded" />
          </div>
        )
      : children;

  return (
    <Comp
      className={classes}
      aria-labelledby={title ? titleId : undefined}
      aria-busy={loading || undefined}
      {...rest}
    >
      {hasHeader && (
        <div className="mb-3 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            {title ? (
              <h2 id={titleId} className="font-medium text-[var(--warm-brown)] truncate">
                {title}
              </h2>
            ) : null}
            {subtitle ? (
              <p className="text-sm text-[var(--warm-brown)]/60 mt-0.5 truncate">
                {subtitle}
              </p>
            ) : null}
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
      )}

      {content}

      {/* Loading overlay */}
      {loading && loadingBehavior === "overlay" && (
        <div className="absolute inset-0 rounded-inherit bg-white/60 backdrop-blur-[2px] grid place-items-center pointer-events-none">
          <div className="flex items-center gap-2 text-[var(--warm-brown)]/70">
            <div className="animate-spin w-5 h-5 border-2 border-[var(--warm-coral)] border-t-transparent rounded-full" />
            <span className="text-sm">Loading…</span>
          </div>
        </div>
      )}
    </Comp>
  );
}

// Re-exports
export type { Padding, Radius, Shadow, Bg, Divider, Variant };
export type { SectionProps as SectionComponentProps };
