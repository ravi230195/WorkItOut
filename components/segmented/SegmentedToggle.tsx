import * as React from "react";
import cx from "clsx";

type Option<V extends string = string> = {
  value: V;
  label: React.ReactNode;
};

type Tone = "accent" | "sage" | "brown";
type Variant = "direct" | "filled";

type Props<V extends string = string> = {
  value: V;
  onChange: (value: V) => void;
  options: Option<V>[];
  size?: "sm" | "md";
  variant?: Variant;         // "direct" = recommended
  tone?: Tone;               // color family
  className?: string;
};

const toneVars: Record<Tone, { text: string; border: string; bgSoft: string; bgHover: string }> = {
  accent: {
    text: "text-[var(--warm-coral)]",
    border: "border-[var(--warm-coral)]",
    bgSoft: "bg-[var(--warm-coral)]/14",
    bgHover: "hover:bg-[var(--warm-coral)]/12",
  },
  sage: {
    text: "text-[var(--warm-sage)]",
    border: "border-[var(--warm-sage)]",
    bgSoft: "bg-[var(--warm-sage)]/14",
    bgHover: "hover:bg-[var(--warm-sage)]/12",
  },
  brown: {
    text: "text-[var(--warm-brown)]",
    border: "border-[var(--warm-brown)]",
    bgSoft: "bg-[var(--warm-brown)]/10",
    bgHover: "hover:bg-[var(--warm-brown)]/8",
  },
};

export default function SegmentedToggle<V extends string = string>({
  value,
  onChange,
  options,
  size = "sm",
  variant = "direct",
  tone = "accent",
  className,
}: Props<V>) {
  const s = size === "sm"
    ? { pad: "px-3 py-1.5", text: "text-[13px]" }
    : { pad: "px-4 py-2", text: "text-sm" };

  const t = toneVars[tone];

  return (
    <div
      role="tablist"
      aria-label="Segmented toggle"
      className={cx(
        "inline-flex items-center rounded-lg border border-[var(--border)] bg-white/70 backdrop-blur-sm p-0.5 gap-1",
        className
      )}
    >
      {options.map((opt) => {
        const selected = opt.value === value;
        const baseBtn =
          "relative isolate rounded-md transition-colors select-none " +
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--warm-brown)]/20";
        const directSelected = cx(
          s.pad,
          s.text,
          "font-medium border",
          t.bgSoft,
          t.border,
          t.text
        );
        const directIdle = cx(
          s.pad,
          s.text,
          "border border-transparent",
          "text-[var(--warm-brown)]/60",
          "hover:text-[var(--warm-brown)]",
          t.bgHover
        );

        const filledSelected = cx(
          s.pad,
          s.text,
          "font-medium text-white",
          t.border,
          "bg-[var(--warm-coral)]"
        );
        const filledIdle = cx(
          s.pad,
          s.text,
          "text-[var(--warm-brown)]/70",
          "hover:text-[var(--warm-brown)]"
        );

        const classes =
          variant === "direct"
            ? selected ? directSelected : directIdle
            : selected ? filledSelected : filledIdle;

        return (
          <button
            key={String(opt.value)}
            role="tab"
            aria-selected={selected}
            className={cx(baseBtn, classes)}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
