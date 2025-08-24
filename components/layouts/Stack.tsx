// components/layout/Stack.tsx
import * as React from "react";
import { Space } from "./Spacer";
import Spacer from "./Spacer";

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

export type GapMode = "gap" | "margin";

export type StackProps<T extends keyof JSX.IntrinsicElements = "div"> = {
  direction?: "y" | "x";
  gap?: Space;
  gapMode?: GapMode; // default "gap"
  wrap?: boolean;
  align?: "start" | "center" | "end" | "stretch" | "baseline";
  justify?: "start" | "center" | "end" | "between" | "around" | "evenly";
  as?: T;
  className?: string;
  children?: React.ReactNode;
} & Omit<React.ComponentPropsWithoutRef<T>, "as" | "children">;

const alignMap = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
  baseline: "items-baseline",
} as const;

const justifyMap = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
  around: "justify-around",
  evenly: "justify-evenly",
} as const;

export default function Stack<T extends keyof JSX.IntrinsicElements = "div">({
  direction = "y",
  gap = "sm",
  gapMode = "gap",
  wrap = false,
  align = "stretch",
  justify = "start",
  as,
  className = "",
  children,
  ...rest
}: StackProps<T>) {
  const Comp = (as || "div") as any;
  const dirClass = direction === "y" ? "flex-col" : "flex-row";
  const cls = [
    "flex",
    dirClass,
    wrap && "flex-wrap",
    alignMap[align],
    justifyMap[justify],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (gapMode === "gap") {
    return (
      <Comp className={cls} style={{ gap: varFor(gap) }} {...rest}>
        {children}
      </Comp>
    );
  }

  // margin mode: insert Spacer between items (more compatible in some legacy views)
  const arr = React.Children.toArray(children);
  const spaced =
    arr.length <= 1
      ? arr
      : arr.flatMap((child, i) =>
          i === 0
            ? [child]
            : [
                direction === "y" ? <Spacer key={`s-${i}`} y={gap} /> : <Spacer key={`s-${i}`} x={gap} />,
                child,
              ]
        );

  return (
    <Comp className={cls} {...rest}>
      {spaced}
    </Comp>
  );
}
