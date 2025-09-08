import * as React from "react";

import { Input } from "./input";
import { cn } from "./utils";

interface NumberInputProps extends React.ComponentProps<"input"> {
  /**
   * Choose numeric mode. Defaults to "decimal" with a decimal-friendly pattern.
   * Use "numeric" for integers.
   */
  mode?: "decimal" | "numeric";
}

function NumberInput({
  className,
  step,
  min,
  mode,
  inputMode,
  pattern,
  onFocus,
  ...props
}: NumberInputProps) {
  const resolvedMode = mode ?? "decimal";
  const resolvedInputMode = inputMode ?? resolvedMode;
  const resolvedPattern =
    pattern ?? (resolvedMode === "numeric" ? "[0-9]*" : "[0-9]*[.,]?[0-9]*");

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
    onFocus?.(e);
  };

  return (
    <Input
      type="number"
      inputMode={resolvedInputMode}
      pattern={resolvedPattern}
      step={step}
      min={min}
      className={cn(className)}
      onFocus={handleFocus}
      {...props}
    />
  );
}

export { NumberInput };
