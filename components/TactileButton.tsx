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
    primary: "bg-primary hover:bg-primary-hover text-primary-foreground",
    secondary: "bg-warm-cream hover:bg-warm-cream/90 text-warm-brown",
    sage: "bg-warm-sage hover:bg-warm-sage/90 text-primary-foreground btn-tactile-sage",
    peach: "bg-warm-peach hover:bg-warm-peach/90 text-warm-brown",
    mint: "bg-warm-mint hover:bg-warm-mint/90 text-primary-foreground"
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