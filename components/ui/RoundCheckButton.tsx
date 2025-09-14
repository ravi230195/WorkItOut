import { Check } from "lucide-react";
import React from "react";

interface RoundCheckButtonProps {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  size?: "sm" | "md";
  className?: string;
}

const RoundCheckButton: React.FC<RoundCheckButtonProps> = ({
  checked,
  onChange,
  size = "md",
  className = "",
}) => {
  const dimension = size === "sm" ? "w-5 h-5" : "w-6 h-6";
  const iconSize = size === "sm" ? 12 : 18;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onChange?.(!checked);
      }}
      className={`${dimension} rounded-full border-2 flex items-center justify-center ${
        checked ? "border-black bg-black" : "border-black bg-white"
      } ${className}`}
    >
      <Check
        size={iconSize}
        className={checked ? "text-white" : "text-black"}
      />
    </button>
  );
};

export default RoundCheckButton;
