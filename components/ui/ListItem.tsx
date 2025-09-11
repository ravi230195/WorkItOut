import React from "react";
import { MoreVertical, ChevronDown } from "lucide-react";

interface ListItemProps
  extends React.HTMLAttributes<HTMLDivElement>,
    React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Render as a regular div (default) or button for full-row actions */
  as?: "div" | "button";
  leading?: React.ReactNode;
  /** Additional classes for the leading container */
  leadingClassName?: string;
  primary: React.ReactNode;
  /** Classes for the primary text (size, color, weight) */
  primaryClassName?: string;
  secondary?: React.ReactNode;
  secondaryClassName?: string;
  tertiary?: React.ReactNode;
  tertiaryClassName?: string;
  /** Optional custom actions rendered before the right icon */
  trailing?: React.ReactNode;
  /** Built-in right icon */
  rightIcon?: "kebab" | "chevron";
  /** Rotate the chevron 180 degrees when true */
  rightIconRotated?: boolean;
  onRightIconClick?: (e: React.MouseEvent) => void;
}

export default function ListItem({
  as = "div",
  leading,
  leadingClassName = "w-12 h-12 rounded-xl bg-warm-brown/10 flex items-center justify-center",
  primary,
  primaryClassName = "text-base font-semibold text-black",
  secondary,
  secondaryClassName = "text-sm text-black",
  tertiary,
  tertiaryClassName = "text-sm text-black",
  trailing,
  rightIcon,
  rightIconRotated = false,
  onRightIconClick,
  className = "",
  ...rest
}: ListItemProps) {
  const hasSub = !!secondary || !!tertiary;
  const pyClass = hasSub ? "py-4" : "py-3";
  const baseInteractive =
    as === "button" ? "w-full text-left focus:outline-none" : "";
  const Component = as === "button" ? "button" : "div";

  return (
    <Component className={`flex items-center gap-3 ${pyClass} ${baseInteractive} ${className}`} {...rest}>
      {leading && (
        <div className={`shrink-0 ${leadingClassName}`}>{leading}</div>
      )}
      <div className="flex-1 min-w-0">
        <div className={`${primaryClassName} truncate`}>{primary}</div>
        {secondary && (
          <div className={`${secondaryClassName} truncate`}>{secondary}</div>
        )}
        {tertiary && (
          <div className={`${tertiaryClassName} truncate`}>{tertiary}</div>
        )}
      </div>
      {trailing}
      {rightIcon && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRightIconClick?.(e);
          }}
          className="ml-2 text-black"
        >
          {rightIcon === "kebab" ? (
            <MoreVertical size={18} />
          ) : (
            <ChevronDown
              size={18}
              className={rightIconRotated ? "transform rotate-180" : ""}
            />
          )}
        </button>
      )}
    </Component>
  );
}

