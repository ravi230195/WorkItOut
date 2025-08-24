// components/layout/Spacer.tsx
import * as React from "react";

export type Space = "xss" | "xs" | "sm" | "md" | "lg" | "xl" | "fluid";

const varFor = (s: Space) => {
  switch (s) {
    case "xss":
      return "var(--space-xss, 8px)";
    case "xs":
      return "var(--space-xs, 12px)";
    case "sm":
      return "var(--space-sm, 16px)";
    case "md":
      return "var(--space-md, 22px)";
    case "lg":
      return "var(--space-lg, 28px)";
    case "xl":
      return "var(--space-xl, 40px)";
    case "fluid":
      return "var(--space-fluid, 20px)";
  }
};

export type SpacerProps<T extends keyof JSX.IntrinsicElements = "div"> = {
  /** vertical space amount */
  y?: Space;
  /** horizontal space amount (rare) */
  x?: Space;
  as?: T;
  className?: string;
} & Omit<React.ComponentPropsWithoutRef<T>, "as">;

export default function Spacer<T extends keyof JSX.IntrinsicElements = "div">({
  y,
  x,
  as,
  className = "",
  ...rest
}: SpacerProps<T>) {
  const Comp = (as || "div") as any;
  const style: React.CSSProperties = {
    ...(y ? { height: varFor(y) } : null),
    ...(x ? { width: varFor(x) } : null),
  };

  // default to a block that won't collapse in flex
  const classes = ["shrink-0", className].filter(Boolean).join(" ");

  return <Comp aria-hidden className={classes} style={style} {...rest} />;
}
