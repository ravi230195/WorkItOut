import { Capacitor, registerPlugin } from "@capacitor/core";

import { logger } from "./logging";

interface AppleHealthNavigatorPlugin {
  openDataAccess(options?: { appName?: string }): Promise<{ opened: boolean; url?: string }>;
}

const plugin = Capacitor.isNativePlatform()
  ? registerPlugin<AppleHealthNavigatorPlugin>("AppleHealthNavigator", {})
  : null;

export async function openAppleHealthDataAccess(appName?: string): Promise<boolean> {
  if (!plugin) {
    logger.debug("[health-navigation] Apple Health navigator plugin unavailable");
    return false;
  }

  try {
    const trimmed = appName?.trim();
    const result = await plugin.openDataAccess({ appName: trimmed && trimmed.length > 0 ? trimmed : undefined });
    return Boolean(result?.opened);
  } catch (error) {
    logger.warn("[health-navigation] Failed to open Apple Health data access screen", error);
    return false;
  }
}
