import * as React from "react";
import { Plus, Minus, ChevronDown, Delete } from "lucide-react";
import { cn } from "./utils";

interface NumericKeyboardProps {
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  step?: number;
  /**
   * Choose numeric mode. Defaults to "decimal" which shows the decimal button.
   * Use "numeric" for integers.
   */
  mode?: "decimal" | "numeric";
  className?: string;
}

export function NumericKeyboard({
  value,
  onChange,
  onClose,
  step = 1,
  mode = "decimal",
  className,
}: NumericKeyboardProps) {
  const append = (s: string) => onChange(value + s);

  const handleDecimal = () => {
    if (!value.includes(".")) append(".");
  };

  const handleBackspace = () => {
    onChange(value.slice(0, -1));
  };

  const handleIncrement = () => {
    const num = parseFloat(value || "0");
    const next = (num + step).toString();
    onChange(next);
  };

  const handleDecrement = () => {
    const num = parseFloat(value || "0");
    const next = (num - step).toString();
    onChange(next);
  };

  return (
    <div className={cn("grid grid-cols-4 gap-2", className)}>
      {/* Row 1 */}
      <button
        type="button"
        className="p-4 text-xl rounded-md bg-card text-black"
        onClick={() => append("1")}
      >
        1
      </button>
      <button
        type="button"
        className="p-4 text-xl rounded-md bg-card text-black"
        onClick={() => append("2")}
      >
        2
      </button>
      <button
        type="button"
        className="p-4 text-xl rounded-md bg-card text-black"
        onClick={() => append("3")}
      >
        3
      </button>
      <button
        type="button"
        className="p-4 rounded-md bg-card text-black flex items-center justify-center"
        onClick={onClose}
        aria-label="Hide keyboard"
      >
        <ChevronDown className="h-5 w-5" />
      </button>

      {/* Row 2 */}
      <button
        type="button"
        className="p-4 text-xl rounded-md bg-card text-black"
        onClick={() => append("4")}
      >
        4
      </button>
      <button
        type="button"
        className="p-4 text-xl rounded-md bg-card text-black"
        onClick={() => append("5")}
      >
        5
      </button>
      <button
        type="button"
        className="p-4 text-xl rounded-md bg-card text-black"
        onClick={() => append("6")}
      >
        6
      </button>
      <button
        type="button"
        className="p-4 rounded-md bg-card text-black flex items-center justify-center"
        onClick={handleIncrement}
        aria-label="Increment"
      >
        <Plus className="h-5 w-5" />
      </button>

      {/* Row 3 */}
      <button
        type="button"
        className="p-4 text-xl rounded-md bg-card text-black"
        onClick={() => append("7")}
      >
        7
      </button>
      <button
        type="button"
        className="p-4 text-xl rounded-md bg-card text-black"
        onClick={() => append("8")}
      >
        8
      </button>
      <button
        type="button"
        className="p-4 text-xl rounded-md bg-card text-black"
        onClick={() => append("9")}
      >
        9
      </button>
      <button
        type="button"
        className="p-4 rounded-md bg-card text-black flex items-center justify-center"
        onClick={handleDecrement}
        aria-label="Decrement"
      >
        <Minus className="h-5 w-5" />
      </button>

      {/* Row 4 */}
      {mode === "decimal" ? (
        <button
          type="button"
          className="p-4 text-xl rounded-md bg-card text-black"
          onClick={handleDecimal}
        >
          .
        </button>
      ) : (
        <div />
      )}
      <button
        type="button"
        className="p-4 text-xl rounded-md bg-card text-black"
        onClick={() => append("0")}
      >
        0
      </button>
      <button
        type="button"
        className="p-4 rounded-md bg-card text-black flex items-center justify-center"
        onClick={handleBackspace}
        aria-label="Backspace"
      >
        <Delete className="h-5 w-5" />
      </button>
      <div />
    </div>
  );
}

