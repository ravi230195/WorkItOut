// components/ui/ExpandingCard.tsx
import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import ListItem from "./ListItem";

type Variant = "glass" | "solid" | "plain";

type BaseProps = {
  expanded: boolean;
  onToggle: () => void | Promise<void>;

  title: React.ReactNode;
  subtitle?: React.ReactNode;

  leading?: React.ReactNode;
  trailing?: React.ReactNode;

  children?: React.ReactNode; // <- fine to keep, but we'll also wrap with PropsWithChildren
  onDeleteExercise?: () => void;
  deleteDisabled?: boolean;
  variant?: Variant;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  size?: "sm" | "md" | "lg";
  disableChevron?: boolean;
  disabled?: boolean;
};

// 👇 This ensures JSX `children` is always accepted.
type Props = React.PropsWithChildren<BaseProps>;

const containerByVariant: Record<Variant, string> = {
  glass:
    "rounded-2xl border overflow-hidden backdrop-blur-md bg-card/4 border-border shadow-xl shadow-black/40",
  solid:
    "rounded-2xl border overflow-hidden bg-card/80 border-border shadow-sm",
  plain: "rounded-2xl overflow-hidden",
};

const headerPadBySize: Record<NonNullable<Props["size"]>, string> = {
  sm: "px-3 py-2.5",
  md: "px-4 py-3",
  lg: "px-5 py-4",
};

export default function ExpandingCard({
  expanded,
  onToggle,
  title,
  subtitle,
  leading,
  trailing,
  children,
  variant = "glass",
  className = "",
  headerClassName = "",
  bodyClassName = "",
  size = "md",
  disableChevron = false,
  disabled = false,
}: Props) {
  const bodyId = React.useId();

  return (
    <motion.div
      layout
      initial={false}
      className={[
        containerByVariant[variant],
        expanded ? "ring-1 ring-border" : "",
        className,
      ].join(" ")}
    >
      <ListItem
        as="button"
        type="button"
        onClick={disabled ? undefined : onToggle}
        aria-expanded={expanded}
        aria-controls={bodyId}
        leading={leading}
        leadingClassName="w-12 h-12 rounded-xl overflow-hidden bg-warm-brown/10 flex items-center justify-center shrink-0"
        primary={title}
        secondary={subtitle}
        primaryClassName={
          "truncate font-semibold " +
          (variant === "glass"
            ? "text-primary-foreground opacity-95"
            : "text-warm-brown")
        }
        secondaryClassName={
          "truncate text-sm " +
          (variant === "glass"
            ? "text-primary-foreground opacity-60"
            : "text-warm-brown/60")
        }
        trailing={trailing}
        rightIcon={disableChevron ? undefined : "chevron"}
        rightIconRotated={expanded}
        className={[
          headerPadBySize[size],
          "w-full text-left select-none",
          disabled ? "opacity-60 cursor-default" : "hover:bg-card/3",
          headerClassName,
        ].join(" ")}
        disabled={disabled}
      />

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            id={bodyId}
            key="body"
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={[
              "pt-1 pb-4 px-4",
              bodyClassName,
              variant === "glass" ? "text-primary-foreground opacity-90" : "text-foreground",
            ].join(" ")}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
