import { useEffect, useState } from "react";

/**
 * Tracks whether an input with a numeric keyboard is currently focused.
 * An input qualifies if its type is "number" or it specifies inputMode="numeric".
 */
export function useNumericInputFocus(): boolean {
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    const update = () => {
      const el = document.activeElement as HTMLElement | null;
      const isNumeric =
        el instanceof HTMLInputElement &&
        (el.type === "number" || el.inputMode === "numeric");
      setFocused(isNumeric);
    };
    document.addEventListener("focusin", update);
    document.addEventListener("focusout", update);
    update();
    return () => {
      document.removeEventListener("focusin", update);
      document.removeEventListener("focusout", update);
    };
  }, []);

  return focused;
}
