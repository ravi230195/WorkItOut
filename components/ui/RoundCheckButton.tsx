import { Check } from "lucide-react";
import React from "react";

interface RoundCheckButtonProps {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "success";
  className?: string;
}

const RoundCheckButton: React.FC<RoundCheckButtonProps> = ({
  checked,
  onChange,
  size = "md",
  variant = "default",
  className = "",
}) => {
  const dimension =
    size === "sm" ? "w-5 h-5" : size === "lg" ? "w-7 h-7" : "w-6 h-6";
  const iconSize = size === "sm" ? 12 : size === "lg" ? 20 : 18;

  const baseClasses = `${dimension} rounded-full border-2 flex items-center justify-center ${className}`;

  let buttonClasses = "";
  let iconClasses = "";

  if (variant === "success") {
    buttonClasses = "border-black bg-white";
    iconClasses = checked ? "text-success" : "text-success-light";
  } else {
    buttonClasses = checked ? "border-black bg-black" : "border-black bg-white";
    iconClasses = checked ? "text-white" : "text-black";
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onChange?.(!checked);
      }}
      className={`${baseClasses} ${buttonClasses}`}
    >
      <Check size={iconSize} className={iconClasses} />
    </button>
  );
};

export default RoundCheckButton;
