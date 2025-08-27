// hooks/useKeyboardInset.ts
import { useLayoutEffect } from "react";

let refCount = 0;
let globalCleanup: (() => void) | null = null;

export function useKeyboardInset() {
  useLayoutEffect(() => {
    refCount += 1;

    if (!globalCleanup) {
      const root = document.documentElement;
      let raf = 0;

      const apply = () => {
        raf = 0;
        const vv = window.visualViewport;
        if (!vv) {
          root.style.setProperty("--kb-inset", "0px");
          root.style.setProperty("--keyboard-inset", "0px");
          root.style.setProperty("--app-kb-inset", "0px");
          return;
        }
        const inset = Math.max(0, window.innerHeight - vv.height - (vv.offsetTop || 0));
        const px = `${Math.round(inset)}px`;
        root.style.setProperty("--kb-inset", px);
        root.style.setProperty("--keyboard-inset", px);
        root.style.setProperty("--app-kb-inset", px);
      };

      const onChange = () => {
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(apply);
      };

      let capCleanup: (() => void) | null = null;

      const attach = async () => {
        apply();
        // Try Capacitor first
        try {
          const { Capacitor } = await import("@capacitor/core");
          const { Keyboard } = await import("@capacitor/keyboard");
          if (Capacitor.isNativePlatform()) {
            const showListener = await Keyboard.addListener("keyboardWillShow", (info) => {
              const h = info?.keyboardHeight || 0;
              const px = `${Math.round(h)}px`;
              root.style.setProperty("--kb-inset", px);
              root.style.setProperty("--keyboard-inset", px);
              root.style.setProperty("--app-kb-inset", px);
            });
            const hideListener = await Keyboard.addListener("keyboardWillHide", () => {
              root.style.setProperty("--kb-inset", "0px");
              root.style.setProperty("--keyboard-inset", "0px");
              root.style.setProperty("--app-kb-inset", "0px");
            });
            capCleanup = () => {
              showListener.remove();
              hideListener.remove();
            };
            return;
          }
        } catch {
          /* no-capacitor */
        }

        // Web fallback
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

      globalCleanup = () => {
        if (raf) cancelAnimationFrame(raf);
        capCleanup?.();
        root.style.removeProperty("--kb-inset");
        root.style.removeProperty("--keyboard-inset");
        root.style.removeProperty("--app-kb-inset");
        globalCleanup = null;
      };
    }

    return () => {
      refCount -= 1;
      if (refCount <= 0 && globalCleanup) {
        globalCleanup();
      }
    };
  }, []);
}
