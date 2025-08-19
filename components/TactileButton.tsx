import { cn } from "./ui/utils";
import { ButtonHTMLAttributes, ReactNode } from "react";

interface TactileButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "sage" | "peach" | "mint";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function TactileButton({ 
  children, 
  variant = "primary", 
  size = "md",
  className,
  ...props 
}: TactileButtonProps) {
  const baseClasses = "btn-tactile rounded-xl border-0 font-medium";
  
  const variantClasses = {
    primary: "bg-[var(--warm-coral)] hover:bg-[var(--warm-coral)]/90 text-white",
    secondary: "bg-[var(--warm-cream)] hover:bg-[var(--warm-cream)]/90 text-[var(--warm-brown)]",
    sage: "bg-[var(--warm-sage)] hover:bg-[var(--warm-sage)]/90 text-white btn-tactile-sage",
    peach: "bg-[var(--warm-peach)] hover:bg-[var(--warm-peach)]/90 text-[var(--warm-brown)]",
    mint: "bg-[var(--warm-mint)] hover:bg-[var(--warm-mint)]/90 text-white"
  };

  const sizeClasses = {
    sm: "px-3 py-2 text-sm",
    md: "px-4 py-3",
    lg: "px-6 py-4 text-lg"
  };

  return (
    <button
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}