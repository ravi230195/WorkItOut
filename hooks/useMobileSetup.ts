import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { setupViewportMeta } from "../utils/viewport";
import { setupSafeAreaSupport, detectAndApplySafeArea } from "../utils/safe-area";

/**
 * Hook that handles all mobile device setup including viewport and safe area support
 */
export function useMobileSetup() {
  useEffect(() => {
    // Setup viewport meta tag
    setupViewportMeta();

    // Setup safe area CSS properties
    setupSafeAreaSupport();

    // Run safe area detection after a brief delay to ensure DOM is ready
    const timeoutId = setTimeout(detectAndApplySafeArea, 100);

    if (Capacitor.isPluginAvailable("StatusBar")) {
      StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
      StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
    }

    return () => clearTimeout(timeoutId);
  }, []);
}