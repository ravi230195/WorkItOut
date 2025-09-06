import { useEffect, useState } from "react";

/**
 * Hook that returns true when the on-screen keyboard is visible.
 * Works for both Capacitor (native) and web environments.
 */
export function useKeyboardVisible(): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let raf = 0;
    let capCleanup: (() => void) | null = null;

    const updateFromViewport = () => {
      const vv = window.visualViewport;
      if (!vv) {
        setVisible(false);
        return;
      }
      const inset = Math.max(0, window.innerHeight - vv.height - (vv.offsetTop || 0));
      setVisible(inset > 0);
    };

    const onChange = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(updateFromViewport);
    };

    const attach = async () => {
      // Capacitor keyboard events (native mobile)
      try {
        const { Capacitor } = await import("@capacitor/core");
        const { Keyboard } = await import("@capacitor/keyboard");
        if (Capacitor.isNativePlatform()) {
          const showListener = await Keyboard.addListener("keyboardWillShow", () => setVisible(true));
          const hideListener = await Keyboard.addListener("keyboardWillHide", () => setVisible(false));
          capCleanup = () => {
            showListener.remove();
            hideListener.remove();
          };
          return;
        }
      } catch {
        /* capacitor not available - fall back to web */
      }

      // Web fallback using VisualViewport
      if (window.visualViewport) {
        window.visualViewport.addEventListener("resize", onChange);
        window.visualViewport.addEventListener("scroll", onChange);
      } else {
        window.addEventListener("resize", onChange);
      }

      capCleanup = () => {
        if (window.visualViewport) {
          window.visualViewport.removeEventListener("resize", onChange);
          window.visualViewport.removeEventListener("scroll", onChange);
        } else {
          window.removeEventListener("resize", onChange);
        }
      };
    };

    void attach();
    updateFromViewport();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      capCleanup?.();
    };
  }, []);

  return visible;
}
