import { TactileButton } from "./TactileButton";
import { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "./ui/utils";

interface BottomNavigationButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "sage" | "peach" | "mint";
  className?: string;
}

export function BottomNavigationButton({
  children,
  variant = "primary",
  className,
  ...props
}: BottomNavigationButtonProps) {
  return (
    <TactileButton
      variant={variant}
      size="sm"
      className={cn(
        "px-6 md:px-8 py-1 font-medium border-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
      {...props}
    >
      {children}
    </TactileButton>
  );
}
