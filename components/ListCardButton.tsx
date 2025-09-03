import { cn } from "./ui/utils";
import { ButtonHTMLAttributes, ReactNode } from "react";

interface ListCardButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  selected?: boolean;
  className?: string;
}

export function ListCardButton({
  children,
  selected = false,
  className,
  ...props
}: ListCardButtonProps) {
  return (
    <button
      {...props}
      className={cn(
        "w-full text-left rounded-2xl border shadow-sm transition-all focus:outline-none p-4",
        selected
          ? "bg-warm-coral/60 border-warm-coral/30 shadow-md"
          : "bg-card border-border hover:bg-soft-gray/50 hover:border-warm-coral/30 hover:shadow-md",
        className
      )}
    >
      {children}
    </button>
  );
}
