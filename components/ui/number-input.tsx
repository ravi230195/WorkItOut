import * as React from "react";
import { createPortal } from "react-dom";

import { Input } from "./input";
import { cn } from "./utils";
import { NumericKeyboard } from "./numeric-keyboard";

interface NumberInputProps extends React.ComponentProps<"input"> {
  /**
   * Choose numeric mode. Defaults to "decimal" with a decimal-friendly pattern.
   * Use "numeric" for integers.
   */
  mode?: "decimal" | "numeric";
  /**
   * Use the custom on-screen numeric keyboard instead of the native one.
   */
  customKeyboard?: boolean;
}

function NumberInput({
  className,
  step,
  min,
  mode,
  inputMode,
  pattern,
  onFocus,
  customKeyboard,
  ...props
}: NumberInputProps) {
  const resolvedMode = mode ?? "decimal";
  const resolvedInputMode = customKeyboard ? "none" : inputMode ?? resolvedMode;
  const resolvedType = customKeyboard ? "text" : "number";
  const resolvedPattern =
    pattern ?? (resolvedMode === "numeric" ? "[0-9]*" : "[0-9]*[.,]?[0-9]*");

  const [showKeyboard, setShowKeyboard] = React.useState(false);

  const handleKeyboardChange = (val: string) => {
    const event = {
      target: { value: val },
    } as React.ChangeEvent<HTMLInputElement>;
    props.onChange?.(event);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
    onFocus?.(e);
    if (customKeyboard) {
      setShowKeyboard(true);
    }
  };

  const numericStep =
    typeof step === "number" ? step : step ? parseFloat(step) : undefined;

  return (
    <div className="relative">
      <Input
        type={resolvedType}
        inputMode={resolvedInputMode}
        pattern={resolvedPattern}
        step={step}
        min={min}
        className={cn(className)}
        onFocus={handleFocus}
        readOnly={customKeyboard}
        {...props}
      />
      {customKeyboard && showKeyboard
        ? createPortal(
            <div className="fixed inset-x-0 bottom-0 z-50 border-t bg-black p-4">
              <NumericKeyboard
                value={(props.value ?? "").toString()}
                onChange={handleKeyboardChange}
                onClose={() => setShowKeyboard(false)}
                step={numericStep}
                mode={resolvedMode}
                className="w-full"
              />
            </div>,
            document.body
          )
        : null}
    </div>
  );
}

export { NumberInput };
