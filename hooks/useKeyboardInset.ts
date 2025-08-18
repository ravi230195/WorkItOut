import { useLayoutEffect } from "react";

export function useKeyboardInset() {
  useLayoutEffect(() => {
    const root = document.documentElement;
    let raf = 0;

    const apply = () => {
      raf = 0;
      const vv = window.visualViewport;
      
      if (!vv) {
        root.style.setProperty("--kb-inset", "0px");
        return;
      }

      // Calculate keyboard height
      const viewportHeight = vv.height;
      const windowHeight = window.innerHeight;
      const offsetTop = vv.offsetTop || 0;
      
      // Keyboard height is the difference between window height and viewport height
      const keyboardHeight = Math.max(0, windowHeight - viewportHeight - offsetTop);
      
      root.style.setProperty("--kb-inset", `${Math.round(keyboardHeight)}px`);
    };

    const onChange = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(apply);
    };

    // Try to use Capacitor keyboard plugin if available
    const tryCapacitorKeyboard = async () => {
      try {
        // Dynamic import to avoid build issues
        const { Capacitor } = await import('@capacitor/core');
        const { Keyboard } = await import('@capacitor/keyboard');
        
        if (Capacitor.isNativePlatform()) {
          const showListener = await Keyboard.addListener('keyboardWillShow', (info) => {
            const height = info.keyboardHeight || 0;
            root.style.setProperty("--kb-inset", `${height}px`);
          });
          
          const hideListener = await Keyboard.addListener('keyboardWillHide', () => {
            root.style.setProperty("--kb-inset", "0px");
          });
          
          // Return cleanup function
          return () => {
            showListener.remove();
            hideListener.remove();
            root.style.removeProperty("--kb-inset");
          };
        }
      } catch (error) {
        // Capacitor not available, using web fallback
      }
      return null;
    };

    // Initial application
    apply();
    
    // Try Capacitor first, then fallback to web
    let cleanup: (() => void) | null = null;
    
    tryCapacitorKeyboard().then((capacitorCleanup) => {
      if (capacitorCleanup) {
        cleanup = capacitorCleanup;
      } else {
        // Fallback to web-based detection
        if (window.visualViewport) {
          window.visualViewport.addEventListener("resize", onChange);
          window.visualViewport.addEventListener("scroll", onChange);
        } else {
          window.addEventListener("resize", onChange);
        }
      }
    });

    // Cleanup
    return () => {
      if (raf) cancelAnimationFrame(raf);
      
      if (cleanup) {
        cleanup();
      } else {
        if (window.visualViewport) {
          window.visualViewport.removeEventListener("resize", onChange);
          window.visualViewport.removeEventListener("scroll", onChange);
        } else {
          window.removeEventListener("resize", onChange);
        }
      }
      
      document.documentElement.style.removeProperty("--kb-inset");
    };
  }, []);
}
