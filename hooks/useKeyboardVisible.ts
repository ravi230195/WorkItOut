import { useEffect, useState } from "react";
import { useKeyboardInset } from "./useKeyboardInset";

/**
 * Hook that returns true when the on-screen keyboard is visible.
 *
 * It reuses the global keyboard inset detection provided by
 * `useKeyboardInset` and simply checks whether the computed inset
 * is greater than zero. This keeps the logic consistent with the
 * layout components that already rely on the inset CSS variable and
 * avoids duplicating platform-specific event handling.
 */
export function useKeyboardVisible(): boolean {
  const [visible, setVisible] = useState(false);

  // ensure the global --kb-inset CSS variable stays up to date
  useKeyboardInset();

  useEffect(() => {
    const root = document.documentElement;

    const update = () => {
      const inset = parseInt(
        getComputedStyle(root).getPropertyValue("--kb-inset") || "0",
        10
      );
      setVisible(inset > 0);
    };

    // Initial measurement
    update();

    // Observe style changes on the root element since --kb-inset is
    // updated there by useKeyboardInset
    const observer = new MutationObserver(update);
    observer.observe(root, { attributes: true, attributeFilter: ["style"] });

    // Also listen to viewport changes as a fallback
    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener("resize", update);
      vv.addEventListener("scroll", update);
    } else {
      window.addEventListener("resize", update);
    }

    return () => {
      observer.disconnect();
      if (vv) {
        vv.removeEventListener("resize", update);
        vv.removeEventListener("scroll", update);
      } else {
        window.removeEventListener("resize", update);
      }
    };
  }, []);

  return visible;
}
