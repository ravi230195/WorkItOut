import { useCallback, useEffect, useMemo, useState } from "react";
import type { HealthPermission, HealthPlugin } from "capacitor-health";
import { AppScreen, ScreenHeader, Section, Stack } from "../../layouts";
import { cn } from "../../ui/utils";
import { toast } from "sonner";
import { logger } from "../../../utils/logging";

interface DeviceSettingsScreenProps {
  onBack: () => void;
}

type HealthPlatform = "ios" | "android" | "web";
type PermissionStatusMap = Record<HealthPermission, boolean | null>;

type PermissionListItem = {
  permission: HealthPermission;
  title: string;
  description: string;
  emoji: string;
  accentBg: string;
  accentText: string;
};

const PERMISSION_ITEMS = [
  {
    permission: "READ_STEPS",
    title: "Steps",
    description: "Allows Workout Tracker to read your daily step counts and keep your dashboard up to date.",
    emoji: "👣",
    accentBg: "bg-[#E7F2FF]",
    accentText: "text-[#0F62FE]",
  },
  {
    permission: "READ_ACTIVE_CALORIES",
    title: "Active Energy",
    description: "Track active calories burned so workout summaries stay accurate.",
    emoji: "🔥",
    accentBg: "bg-[#FFE6E9]",
    accentText: "text-[#FF3B30]",
  },
  {
    permission: "READ_TOTAL_CALORIES",
    title: "Dietary Energy",
    description: "Combine nutrition data with your workouts to monitor total energy balance.",
    emoji: "⚡️",
    accentBg: "bg-[#FFF3D6]",
    accentText: "text-[#FF9500]",
  },
  {
    permission: "READ_DISTANCE",
    title: "Distance",
    description: "Import walking, running, and cycling distance from your device history.",
    emoji: "📏",
    accentBg: "bg-[#E7FAF0]",
    accentText: "text-[#20A974]",
  },
  {
    permission: "READ_WORKOUTS",
    title: "Workouts",
    description: "Sync workouts you've logged elsewhere so everything lives in one place.",
    emoji: "🏋️",
    accentBg: "bg-[#F0E9FF]",
    accentText: "text-[#6F2CFF]",
  },
  {
    permission: "READ_HEART_RATE",
    title: "Heart Rate",
    description: "Show heart-rate trends alongside your strength training sessions.",
    emoji: "❤️",
    accentBg: "bg-[#FFE6F1]",
    accentText: "text-[#FF2D55]",
  },
  {
    permission: "READ_ROUTE",
    title: "Workout Routes",
    description: "Review outdoor routes for runs and rides saved on your device.",
    emoji: "🧭",
    accentBg: "bg-[#E6F4FF]",
    accentText: "text-[#0A84FF]",
  },
  {
    permission: "READ_MINDFULNESS",
    title: "Mindfulness",
    description: "Pull in mindfulness minutes to balance training intensity and recovery.",
    emoji: "🧘",
    accentBg: "bg-[#F3FFE6]",
    accentText: "text-[#34C759]",
  },
] as const satisfies ReadonlyArray<PermissionListItem>;

const ALL_PERMISSIONS = PERMISSION_ITEMS.map((item) => item.permission) as HealthPermission[];

const createPermissionMap = (
  value: boolean | null,
  overrides: Partial<PermissionStatusMap> = {}
): PermissionStatusMap => {
  const map = {} as PermissionStatusMap;
  for (const permission of ALL_PERMISSIONS) {
    map[permission] = overrides[permission] ?? value;
  }
  return map;
};

const isHealthPermission = (value: string): value is HealthPermission => {
  return (ALL_PERMISSIONS as ReadonlyArray<string>).includes(value);
};

const parsePermissionResponse = (
  response: unknown,
  fallback: PermissionStatusMap
): PermissionStatusMap => {
  const next = { ...fallback };
  const entries =
    response && typeof response === "object" && "permissions" in response
      ? (response as any).permissions
      : undefined;
  if (Array.isArray(entries)) {
    for (const record of entries) {
      if (!record || typeof record !== "object") continue;
      for (const [key, value] of Object.entries(record)) {
        if (typeof key === "string" && isHealthPermission(key)) {
          next[key] = Boolean(value);
        }
      }
    }
  }
  return next;
};

const detectPlatform = async (): Promise<HealthPlatform> => {
  try {
    const { Capacitor } = await import("@capacitor/core");
    const platform = Capacitor.getPlatform();
    if (platform === "ios" || platform === "android") {
      return platform;
    }
    return "web";
  } catch (error) {
    logger.warn("[device-settings] Unable to detect platform:", error);
    return "web";
  }
};

const loadHealthPlugin = async (): Promise<HealthPlugin | null> => {
  try {
    const module = await import("capacitor-health");
    return module.Health;
  } catch (error) {
    logger.warn("[device-settings] Failed to load Health plugin:", error);
    return null;
  }
};

function useHealthPermissionControls(permissions: HealthPermission[]) {
  const [platform, setPlatform] = useState<HealthPlatform>("web");
  const [status, setStatus] = useState<PermissionStatusMap>(() => createPermissionMap(null));
  const [isLoading, setIsLoading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setLastError(null);
    try {
      const detected = await detectPlatform();
      setPlatform(detected);

      if (detected === "web") {
        setStatus(createPermissionMap(null));
        return;
      }

      const health = await loadHealthPlugin();
      if (!health) {
        setStatus(createPermissionMap(null));
        setLastError("Health services are not available on this device.");
        return;
      }

      try {
        const response = await health.checkHealthPermissions({ permissions });
        const parsed = parsePermissionResponse(response, createPermissionMap(false));
        setStatus(parsed);
      } catch (checkError) {
        logger.warn("[device-settings] checkHealthPermissions failed:", checkError);
        // iOS does not report denied permissions reliably, so show unknown state instead of failing hard.
        setStatus((prev) => createPermissionMap(null, prev));
        if (detected === "android") {
          setLastError("Unable to read Health permission status. Try again from your device settings.");
        }
      }
    } catch (error) {
      logger.error("[device-settings] Failed to refresh permissions:", error);
      setStatus(createPermissionMap(null));
      setLastError("Something went wrong while checking your Health permissions.");
    } finally {
      setIsLoading(false);
    }
  }, [permissions]);

  const requestPermissions = useCallback(
    async (targets: HealthPermission[]) => {
      const health = await loadHealthPlugin();
      if (!health) {
        throw new Error("Health services are not available on this device.");
      }

      const response = await health.requestHealthPermissions({ permissions: targets });
      setStatus((prev) => parsePermissionResponse(response, createPermissionMap(null, prev)));
    },
    []
  );

  const openSystemSettings = useCallback(async () => {
    const health = await loadHealthPlugin();
    if (!health) {
      throw new Error("Health services are not available on this device.");
    }

    if (platform === "ios") {
      await health.openAppleHealthSettings();
    } else if (platform === "android") {
      await health.openHealthConnectSettings();
    }
  }, [platform]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    platform,
    status,
    isLoading,
    lastError,
    refresh,
    requestPermissions,
    openSystemSettings,
  } as const;
}

const NS_HEALTH_SHARE = "This app needs access to your step count data to track your daily activity and help you reach your fitness goals.";
const NS_HEALTH_UPDATE = "This app needs to write workout data to help track your fitness progress and maintain accurate health records.";

export function DeviceSettingsScreen({ onBack }: DeviceSettingsScreenProps) {
  const {
    platform,
    status,
    isLoading,
    lastError,
    refresh,
    requestPermissions,
    openSystemSettings,
  } = useHealthPermissionControls(ALL_PERMISSIONS);

  const [pendingPermission, setPendingPermission] = useState<HealthPermission | null>(null);
  const [isBulkRequesting, setIsBulkRequesting] = useState(false);

  useEffect(() => {
    if (lastError) {
      toast.error(lastError);
    }
  }, [lastError]);

  const itemMap = useMemo(() => {
    return new Map(PERMISSION_ITEMS.map((item) => [item.permission, item]));
  }, []);

  const platformLabel = useMemo(() => {
    if (platform === "ios") return "Apple Health";
    if (platform === "android") return "Health Connect";
    return "your device";
  }, [platform]);

  const isNativePlatform = platform !== "web";

  const handleToggle = useCallback(
    async (permission: HealthPermission) => {
      const item = itemMap.get(permission);
      if (!item) return;

      if (!isNativePlatform) {
        toast.info("Manage Health permissions from the iOS or Android app.");
        return;
      }

      const current = status[permission] === true;
      if (current) {
        toast.info(`You can turn off ${item.title} inside ${platformLabel}.`);
        try {
          await openSystemSettings();
        } catch (error) {
          logger.error("[device-settings] Failed to open system settings:", error);
          toast.error("Unable to open Health settings right now.");
        }
        return;
      }

      setPendingPermission(permission);
      try {
        await requestPermissions([permission]);
        await refresh();
        toast.success(`${item.title} access requested.`);
      } catch (error) {
        logger.error(`[device-settings] Failed to request ${permission}:`, error);
        toast.error(`Couldn't update ${item.title} at the moment.`);
      } finally {
        setPendingPermission(null);
      }
    },
    [itemMap, isNativePlatform, status, platformLabel, openSystemSettings, requestPermissions, refresh]
  );

  const handleTurnOnAll = useCallback(async () => {
    if (!isNativePlatform) {
      toast.info("Health permissions can only be updated on a physical device.");
      return;
    }
    setIsBulkRequesting(true);
    try {
      await requestPermissions(ALL_PERMISSIONS);
      await refresh();
      toast.success("Requested access to all Health data types.");
    } catch (error) {
      logger.error("[device-settings] Failed to request all permissions:", error);
      toast.error("Couldn't update Health permissions right now.");
    } finally {
      setIsBulkRequesting(false);
    }
  }, [isNativePlatform, requestPermissions, refresh]);

  const handleOpenSettings = useCallback(async () => {
    if (!isNativePlatform) {
      toast.info("Open the app on your device to manage Health permissions.");
      return;
    }
    try {
      await openSystemSettings();
    } catch (error) {
      logger.error("[device-settings] Failed to open system settings:", error);
      toast.error("Unable to open Health settings right now.");
    }
  }, [isNativePlatform, openSystemSettings]);

  const renderPermissionRow = (item: PermissionListItem) => {
    const permissionStatus = status[item.permission];
    const checked = permissionStatus === true;
    const unknown = permissionStatus === null;
    const disabled = !isNativePlatform || isLoading || isBulkRequesting;
    const isPending = pendingPermission === item.permission;

    return (
      <div
        key={item.permission}
        className="flex items-start gap-4 py-3 first:pt-0 last:pb-0"
      >
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full text-lg",
            item.accentBg,
            item.accentText
          )}
        >
          <span aria-hidden>{item.emoji}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-black leading-snug">{item.title}</p>
          <p className="text-xs text-black/60 leading-snug mt-1">{item.description}</p>
          {unknown && isNativePlatform ? (
            <p className="text-[11px] text-amber-700 mt-2">
              Permission status is managed in {platformLabel}.
            </p>
          ) : null}
        </div>
        <PermissionSwitch
          checked={checked}
          disabled={disabled}
          pending={isPending}
          onClick={() => void handleToggle(item.permission)}
        />
      </div>
    );
  };

  return (
    <AppScreen
      header={
        <ScreenHeader
          title="Health Access"
          onBack={onBack}
          denseSmall
          showBorder
          titleClassName="text-[17px] font-semibold text-black"
        />
      }
      showHeaderBorder={false}
      showBottomBarBorder={false}
      maxContent="sm"
      maxContentPx={560}
      contentBottomPaddingClassName="pb-10"
    >
      <Stack gap="fluid">
        <Section variant="plain" padding="none">
          <div className="rounded-3xl border border-border bg-white/90 backdrop-blur-sm shadow-sm p-6 text-center space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#FCE8EE]">
              <span className="text-3xl" aria-hidden>
                ❤️
              </span>
            </div>
            <div className="space-y-2">
              <p className="text-base font-semibold text-black">
                “Workout Tracker” would like to access and update your Health data.
              </p>
              <p className="text-sm text-black/70">
                Enable the data types you want to sync. You can manage these later in {platformLabel}.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={() => void handleTurnOnAll()}
                disabled={!isNativePlatform || isBulkRequesting}
                className={cn(
                  "inline-flex items-center justify-center rounded-full px-6 py-2 text-sm font-semibold",
                  "bg-[#007AFF] text-white shadow-sm",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {isBulkRequesting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Turning On…
                  </span>
                ) : (
                  "Turn On All"
                )}
              </button>
              <button
                type="button"
                onClick={() => void handleOpenSettings()}
                className="inline-flex items-center justify-center rounded-full px-6 py-2 text-sm font-semibold text-[#007AFF] bg-transparent hover:bg-[#007AFF]/10 transition"
              >
                Manage in {platformLabel}
              </button>
            </div>
            {!isNativePlatform ? (
              <p className="text-xs text-black/60">
                Connect an iOS or Android device to update Health permissions.
              </p>
            ) : null}
          </div>
        </Section>

        <Section variant="plain" padding="none">
          <div className="rounded-3xl border border-border bg-white/90 backdrop-blur-sm shadow-sm p-6">
            <p className="text-xs font-semibold tracking-[0.18em] text-black/60 mb-4">
              ALLOW “WORKOUT TRACKER” TO READ
            </p>
            <div className={cn("divide-y divide-border/60", isLoading && "opacity-60")}
            >
              {PERMISSION_ITEMS.map(renderPermissionRow)}
            </div>
          </div>
        </Section>

        <Section variant="plain" padding="none">
          <div className="rounded-3xl border border-border bg-white/80 backdrop-blur-sm shadow-sm p-6 space-y-4 text-left">
            <div className="space-y-2 text-sm text-black/70">
              <p>
                App Explanation: {NS_HEALTH_SHARE}
              </p>
              <p>
                Data you allow can also be accessed by the app in the background as permitted by {platformLabel}.
              </p>
              <p>
                {NS_HEALTH_UPDATE}
              </p>
            </div>
            <div className="text-xs text-black/50">
              You can turn off background access at any time from Settings.
            </div>
          </div>
        </Section>
      </Stack>
    </AppScreen>
  );
}

interface PermissionSwitchProps {
  checked: boolean;
  disabled?: boolean;
  pending?: boolean;
  onClick: () => void;
}

function PermissionSwitch({ checked, disabled = false, pending = false, onClick }: PermissionSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors",
        checked ? "bg-[#34C759]" : "bg-[#D1D5DB]",
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40"
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-flex h-6 w-6 transform items-center justify-center rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-5" : "translate-x-1"
        )}
      >
        {pending ? (
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-[#34C759] border-t-transparent" />
        ) : null}
      </span>
    </button>
  );
}
