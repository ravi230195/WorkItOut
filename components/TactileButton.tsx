import { cn } from "./ui/utils";
import { ButtonHTMLAttributes, ReactNode } from "react";

interface TactileButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "sage" | "peach" | "mint" | "ghost";
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
  const variantClasses = {
    primary: "btn-tactile bg-primary hover:bg-primary-hover text-black",
    secondary: "btn-tactile bg-warm-cream hover:bg-warm-cream/90 text-black",
    sage: "btn-tactile bg-warm-sage hover:bg-warm-sage/90 text-black btn-tactile-sage",
    peach: "btn-tactile bg-warm-peach hover:bg-warm-peach/90 text-black",
    mint: "btn-tactile bg-warm-mint hover:bg-warm-mint/90 text-black",
    ghost: "bg-transparent hover:bg-transparent text-black shadow-none hover:shadow-none active:shadow-none rounded-none transition-none hover:translate-y-0 active:translate-y-0"
  };

  const sizeClasses = {
    sm: "px-3 py-2 text-sm",
    md: "px-4 py-3",
    lg: "px-6 py-4 text-lg"
  };

  return (
    <button
      className={cn(
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