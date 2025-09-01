// components/ui/ExpandingCard.tsx
import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

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
    "rounded-2xl border overflow-hidden backdrop-blur-md bg-white/[0.04] border-white/10 shadow-xl shadow-black/40",
  solid:
    "rounded-2xl border overflow-hidden bg-white/80 border-[var(--border)] shadow-sm",
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
        expanded ? "ring-1 ring-white/[0.06]" : "",
        className,
      ].join(" ")}
    >
      <button
        type="button"
        onClick={disabled ? undefined : onToggle}
        aria-expanded={expanded}
        aria-controls={bodyId}
        className={[
          "w-full flex items-center gap-3 text-left select-none",
          headerPadBySize[size],
          headerClassName,
          disabled ? "opacity-60 cursor-default" : "hover:bg-white/[0.03]",
        ].join(" ")}
      >
        {leading && (
          <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/10 flex items-center justify-center shrink-0">
            {leading}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div
            className={[
              "truncate font-semibold",
              variant === "glass" ? "text-white/95" : "text-[var(--foreground)]",
            ].join(" ")}
          >
            {title}
          </div>
          {subtitle && (
            <div
              className={[
                "truncate text-sm",
                variant === "glass" ? "text-white/60" : "text-[var(--muted-foreground)]",
              ].join(" ")}
            >
              {subtitle}
            </div>
          )}
        </div>

        {trailing}

        {!disableChevron && (
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
            className={[
              "ml-1",
              variant === "glass" ? "text-white/70" : "text-warm-brown/70",
            ].join(" ")}
          >
            <ChevronDown size={18} />
          </motion.div>
        )}
      </button>

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
              variant === "glass" ? "text-white/90" : "text-[var(--foreground)]",
            ].join(" ")}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
