import { TactileButton } from "./TactileButton";
import { ButtonHTMLAttributes, ReactNode } from "react";

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
      className={className}
      {...props}
    >
      {children}
    </TactileButton>
  );
}
