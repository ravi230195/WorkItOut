import { useCallback, useEffect, useMemo, useState } from "react";
import type { HealthPermission } from "capacitor-health";
import { logger } from "../utils/logging";

type Platform = "ios" | "android" | "web" | string;

const SUPPORTED_PLATFORMS = new Set<Platform>(["ios", "android"]);

export const HEALTH_PERMISSION_IDS: readonly HealthPermission[] = [
  "READ_STEPS",
  "READ_WORKOUTS",
  "READ_ACTIVE_CALORIES",
  "READ_TOTAL_CALORIES",
  "READ_DISTANCE",
  "READ_HEART_RATE",
  "READ_ROUTE",
  "READ_MINDFULNESS",
] as const;

export type HealthPermissionId = (typeof HEALTH_PERMISSION_IDS)[number];

export type PermissionStatus = "granted" | "denied" | "unknown";

export type PermissionStatusMap = Record<HealthPermissionId, PermissionStatus>;

const createDefaultStatus = (): PermissionStatusMap =>
  HEALTH_PERMISSION_IDS.reduce((acc, id) => {
    acc[id] = "unknown";
    return acc;
  }, {} as PermissionStatusMap);

const DEFAULT_STATUS = createDefaultStatus();

const boolToStatus = (value: boolean | undefined): PermissionStatus => {
  if (value === true) return "granted";
  if (value === false) return "denied";
  return "unknown";
};

const normalizePermissionMap = (
  response: unknown,
): Partial<Record<HealthPermissionId, boolean>> => {
  const target =
    response && typeof response === "object"
      ? (response as Record<string, unknown>).permissions ?? response
      : undefined;

  if (!target || typeof target !== "object") return {};

  const result: Partial<Record<HealthPermissionId, boolean>> = {};

  if (Array.isArray(target)) {
    for (const entry of target) {
      if (!entry || typeof entry !== "object") continue;
      for (const [key, value] of Object.entries(entry)) {
        if (HEALTH_PERMISSION_IDS.includes(key as HealthPermissionId) && typeof value === "boolean") {
          result[key as HealthPermissionId] = value;
        }
      }
    }
    return result;
  }

  for (const [key, value] of Object.entries(target)) {
    if (HEALTH_PERMISSION_IDS.includes(key as HealthPermissionId) && typeof value === "boolean") {
      result[key as HealthPermissionId] = value;
    }
  }

  return result;
};

const mapToStatus = (
  map: Partial<Record<HealthPermissionId, boolean>>,
): Partial<PermissionStatusMap> => {
  const result: Partial<PermissionStatusMap> = {};
  for (const key of HEALTH_PERMISSION_IDS) {
    if (key in map) {
      result[key] = boolToStatus(map[key]);
    }
  }
  return result;
};

interface RequestResult {
  success: boolean;
}

interface UseHealthPermissionsReturn {
  platform: Platform;
  supported: boolean;
  statuses: PermissionStatusMap;
  isRefreshing: boolean;
  pendingKey: HealthPermissionId | "ALL" | null;
  error: string | null;
  refresh: () => Promise<void>;
  requestPermission: (permission: HealthPermissionId) => Promise<RequestResult>;
  requestAll: () => Promise<RequestResult>;
  openSystemSettings: () => Promise<boolean>;
}

export function useHealthPermissions(): UseHealthPermissionsReturn {
  const [platform, setPlatform] = useState<Platform>("web");
  const [isReady, setIsReady] = useState(false);
  const [statuses, setStatuses] = useState<PermissionStatusMap>(() => ({ ...DEFAULT_STATUS }));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pendingKey, setPendingKey] = useState<HealthPermissionId | "ALL" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const supported = useMemo(() => SUPPORTED_PLATFORMS.has(platform), [platform]);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        const nextPlatform = Capacitor.getPlatform();
        if (active) setPlatform(nextPlatform);
      } catch {
        if (active) setPlatform("web");
      } finally {
        if (active) setIsReady(true);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!supported) {
      setStatuses({ ...DEFAULT_STATUS });
    }
  }, [supported]);

  const refresh = useCallback(async () => {
    if (!isReady) return;
    if (!supported) return;

    setIsRefreshing(true);
    setError(null);

    try {
      const { Health } = await import("capacitor-health");

      if (platform === "android" && typeof Health.checkHealthPermissions === "function") {
        const response = await Health.checkHealthPermissions({ permissions: [...HEALTH_PERMISSION_IDS] });
        const parsed = mapToStatus(normalizePermissionMap(response));
        if (Object.keys(parsed).length > 0) {
          setStatuses((prev) => ({ ...prev, ...parsed }));
        }
      }
    } catch (err) {
      logger.warn("[device-settings] Failed to refresh health permissions", err);
      setError("Unable to verify your current permissions. Try toggling them again.");
    } finally {
      setIsRefreshing(false);
    }
  }, [isReady, platform, supported]);

  useEffect(() => {
    if (!isReady) return;
    void refresh();
  }, [isReady, refresh]);

  const requestMany = useCallback(
    async (keys: HealthPermissionId[]): Promise<RequestResult> => {
      if (!supported) {
        setError("Health permissions are only available on the mobile app.");
        return { success: false };
      }

      setPendingKey(keys.length === 1 ? keys[0] : "ALL");
      setError(null);

      try {
        const { Health } = await import("capacitor-health");
        const response = await Health.requestHealthPermissions({ permissions: keys });
        const parsed = mapToStatus(normalizePermissionMap(response));

        if (Object.keys(parsed).length > 0) {
          setStatuses((prev) => ({ ...prev, ...parsed }));
        } else if (platform === "ios") {
          // iOS does not report granular results; assume granted on success.
          const assumed: Partial<PermissionStatusMap> = {};
          keys.forEach((key) => {
            assumed[key] = "granted";
          });
          setStatuses((prev) => ({ ...prev, ...assumed }));
        }

        if (platform === "android") {
          await refresh();
        }

        return { success: true };
      } catch (err) {
        logger.error("[device-settings] Permission request failed", err);
        setError("We couldn't update that permission. Please try again.");
        return { success: false };
      } finally {
        setPendingKey(null);
      }
    },
    [platform, refresh, supported],
  );

  const openSystemSettings = useCallback(async () => {
    if (!supported) return false;

    try {
      const { Health } = await import("capacitor-health");

      if (platform === "ios" && typeof Health.openAppleHealthSettings === "function") {
        await Health.openAppleHealthSettings();
        return true;
      }

      if (platform === "android" && typeof Health.openHealthConnectSettings === "function") {
        await Health.openHealthConnectSettings();
        return true;
      }

      return false;
    } catch (err) {
      logger.warn("[device-settings] Failed to open system settings", err);
      setError("Unable to open the system settings on this device.");
      return false;
    }
  }, [platform, supported]);

  const requestPermission = useCallback(
    (permission: HealthPermissionId) => requestMany([permission]),
    [requestMany],
  );

  const requestAll = useCallback(() => requestMany([...HEALTH_PERMISSION_IDS]), [requestMany]);

  return {
    platform,
    supported,
    statuses,
    isRefreshing,
    pendingKey,
    error,
    refresh,
    requestPermission,
    requestAll,
    openSystemSettings,
  };
}

