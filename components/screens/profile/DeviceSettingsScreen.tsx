import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type SVGProps,
} from "react";
import { AppScreen, Stack } from "../../layouts";
import { Switch } from "../../ui/switch";
import { TactileButton } from "../../TactileButton";
import { toast } from "sonner";
import { cn } from "../../ui/utils";
import {
  Apple,
  BrainCircuit,
  Dumbbell,
  Flame,
  Footprints,
  HeartPulse,
  Route,
} from "lucide-react";
import type { HealthPermission, PermissionResponse } from "capacitor-health";
import { logger } from "../../../utils/logging";

interface DeviceSettingsScreenProps {
  onBack: () => void;
}

type TrackedPermission =
  | "READ_STEPS"
  | "READ_ACTIVE_CALORIES"
  | "READ_TOTAL_CALORIES"
  | "READ_DISTANCE"
  | "READ_HEART_RATE"
  | "READ_WORKOUTS"
  | "READ_MINDFULNESS";

type PermissionStateMap = Record<TrackedPermission, boolean>;

type PlatformKind = "ios" | "android" | "web" | "unknown";

interface PermissionItem {
  permission: TrackedPermission;
  label: string;
  description: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  iconClassName: string;
}

const TRACKED_PERMISSIONS: readonly TrackedPermission[] = [
  "READ_STEPS",
  "READ_ACTIVE_CALORIES",
  "READ_TOTAL_CALORIES",
  "READ_DISTANCE",
  "READ_HEART_RATE",
  "READ_WORKOUTS",
  "READ_MINDFULNESS",
];

const TRACKED_PERMISSION_SET = new Set<TrackedPermission>(TRACKED_PERMISSIONS);

const PERMISSION_ITEMS: PermissionItem[] = [
  {
    permission: "READ_STEPS",
    label: "Steps",
    description:
      "Access your step count to track daily movement and progress against your goals.",
    icon: Footprints,
    iconClassName: "bg-sky-100 text-sky-600",
  },
  {
    permission: "READ_ACTIVE_CALORIES",
    label: "Active Energy",
    description: "Track energy burned during workouts and active time to personalize training load.",
    icon: Flame,
    iconClassName: "bg-rose-100 text-rose-500",
  },
  {
    permission: "READ_TOTAL_CALORIES",
    label: "Dietary Energy",
    description: "Compare calories consumed versus burned for a holistic view of your day.",
    icon: Apple,
    iconClassName: "bg-amber-100 text-amber-500",
  },
  {
    permission: "READ_DISTANCE",
    label: "Distance",
    description: "Sync walking, running, cycling, and swim distances from Health.",
    icon: Route,
    iconClassName: "bg-emerald-100 text-emerald-500",
  },
  {
    permission: "READ_HEART_RATE",
    label: "Heart Rate",
    description: "Monitor effort zones and recovery trends from your workouts.",
    icon: HeartPulse,
    iconClassName: "bg-rose-100 text-rose-500",
  },
  {
    permission: "READ_WORKOUTS",
    label: "Workouts",
    description: "Import logged workouts to keep your history in one place.",
    icon: Dumbbell,
    iconClassName: "bg-purple-100 text-purple-500",
  },
  {
    permission: "READ_MINDFULNESS",
    label: "Mindfulness",
    description: "Blend meditation minutes into your recovery and stress scores.",
    icon: BrainCircuit,
    iconClassName: "bg-indigo-100 text-indigo-500",
  },
];

const STORAGE_KEY = "workitout.health-permissions";

const createInitialState = (): PermissionStateMap =>
  TRACKED_PERMISSIONS.reduce((acc, permission) => {
    acc[permission] = false;
    return acc;
  }, {} as PermissionStateMap);

const isTrackedPermission = (value: HealthPermission): value is TrackedPermission =>
  TRACKED_PERMISSION_SET.has(value as TrackedPermission);

export function DeviceSettingsScreen({ onBack }: DeviceSettingsScreenProps) {
  const [permissionStates, setPermissionStates] = useState<PermissionStateMap>(createInitialState);
  const [platform, setPlatform] = useState<PlatformKind>("unknown");
  const [isLoading, setIsLoading] = useState(true);
  const [busyPermission, setBusyPermission] = useState<TrackedPermission | "all" | null>(null);

  const applyPermissionResponse = useCallback(
    (response?: PermissionResponse) => {
      if (!response?.permissions) return;
      setPermissionStates((prev) => {
        const next = { ...prev };
        for (const entry of response.permissions) {
          if (!entry) continue;
          for (const [key, value] of Object.entries(entry)) {
            const permission = key as HealthPermission;
            if (isTrackedPermission(permission)) {
              next[permission] = Boolean(value);
            }
          }
        }
        return next;
      });
    },
    [],
  );

  const refreshPermissions = useCallback(async () => {
    setIsLoading(true);
    try {
      const { Capacitor } = await import("@capacitor/core");
      const currentPlatform = Capacitor.getPlatform() as PlatformKind;
      const normalized: PlatformKind =
        currentPlatform === "ios" || currentPlatform === "android" ? currentPlatform : "web";
      setPlatform(normalized);

      if (normalized === "android") {
        const { Health } = await import("capacitor-health");
        try {
          const response = await Health.checkHealthPermissions({
            permissions: [...TRACKED_PERMISSIONS],
          });
          applyPermissionResponse(response);
        } catch (error) {
          logger.warn("[device-settings] Failed to check Health Connect permissions", error);
          toast.error("Unable to read Health Connect permission status.");
        }
      }

      if (normalized === "ios") {
        // iOS does not expose permission status programmatically.
        logger.debug("[device-settings] Apple Health permissions cannot be checked directly");
      }
    } catch (error) {
      logger.error("[device-settings] Unable to resolve platform", error);
      toast.error("Unable to load device permissions.");
    } finally {
      setIsLoading(false);
    }
  }, [applyPermissionResponse]);

  useEffect(() => {
    // hydrate from local storage for platforms that do not expose status
    if (typeof window === "undefined") return;
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<PermissionStateMap>;
        setPermissionStates((prev) => ({ ...prev, ...parsed }));
      }
    } catch (error) {
      logger.warn("[device-settings] Failed to read cached permissions", error);
    }
  }, []);

  useEffect(() => {
    refreshPermissions();
  }, [refreshPermissions]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(permissionStates));
    } catch (error) {
      logger.warn("[device-settings] Failed to persist permission cache", error);
    }
  }, [permissionStates]);

  const isNative = platform === "ios" || platform === "android";
  const interactionsDisabled = isLoading || busyPermission !== null;
  const activeBusyPermission =
    busyPermission && busyPermission !== "all" ? busyPermission : null;

  const handlePermissionToggle = useCallback(
    async (permission: TrackedPermission, enable: boolean) => {
      if (!isNative) {
        toast.info("Connect an iOS or Android device to manage Health permissions.");
        return;
      }

      setBusyPermission(permission);
      try {
        const { Health } = await import("capacitor-health");

        if (enable) {
          const response = await Health.requestHealthPermissions({ permissions: [permission] });
          applyPermissionResponse(response);
          toast.success(`${permissionLabel(permission)} enabled`);
        } else {
          if (platform === "ios") {
            await Health.openAppleHealthSettings();
            toast.info("Disable this permission from Apple Health > Access & Devices.");
          } else {
            await Health.openHealthConnectSettings();
            toast.info("Disable this permission directly from Health Connect.");
          }
          setPermissionStates((prev) => ({ ...prev, [permission]: false }));
        }
      } catch (error) {
        logger.error("[device-settings] Failed to update permission", error);
        toast.error("Unable to update this permission right now.");
      } finally {
        setBusyPermission(null);
        if (platform === "android") {
          refreshPermissions();
        }
      }
    },
    [applyPermissionResponse, isNative, platform, refreshPermissions],
  );

  const handleAllowAll = useCallback(async () => {
    if (!isNative) {
      toast.info("Connect an iOS or Android device to manage Health permissions.");
      return;
    }

    setBusyPermission("all");
    try {
      const { Health } = await import("capacitor-health");
      const response = await Health.requestHealthPermissions({
        permissions: [...TRACKED_PERMISSIONS],
      });
      applyPermissionResponse(response);
      toast.success("Requested all available Health permissions.");
    } catch (error) {
      logger.error("[device-settings] Failed to request all permissions", error);
      toast.error("Unable to update Health permissions.");
    } finally {
      setBusyPermission(null);
      if (platform === "android") {
        refreshPermissions();
      }
    }
  }, [applyPermissionResponse, isNative, platform, refreshPermissions]);

  const iosStatusNote = useMemo(() => {
    if (platform !== "ios") return null;
    return "Apple Health doesn't report the exact toggle states back to apps. We mirror your most recent choice. Use the Health app to confirm your final settings.";
  }, [platform]);

  const webNotice = useMemo(() => {
    if (platform !== "web") return null;
    return "Connect this app to an iOS or Android device to manage permissions.";
  }, [platform]);

  return (
      <AppScreen
      header={
        <div className="flex items-center justify-between py-3 text-[15px]">
          <button
            type="button"
            onClick={onBack}
            className="font-medium text-black/60"
          >
            Don't Allow
          </button>
          <div className="text-[17px] font-semibold text-black">Health Access</div>
          <button
            type="button"
            onClick={handleAllowAll}
            disabled={interactionsDisabled}
            className={cn(
              "font-semibold text-primary transition-opacity",
              interactionsDisabled && "opacity-40",
            )}
          >
            Allow
          </button>
        </div>
      }
      showHeaderBorder={false}
      showBottomBarBorder={false}
      headerShellClassName="bg-white/70 backdrop-blur-xl"
      padHeader
      padContent={false}
      maxContentPx={520}
      contentClassName="px-4 pb-12 pt-6 sm:px-6"
    >
      <Stack gap="lg" className="mx-auto w-full">
        <div className="rounded-3xl border border-border/60 bg-white/80 px-6 py-8 text-center shadow-sm backdrop-blur-md">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-rose-100 text-rose-500 shadow-inner">
            <HeartPulse className="h-9 w-9" />
          </div>
          <h1 className="text-[22px] font-semibold text-black">Health</h1>
          <p className="mt-2 text-sm text-black/60">
            "Workout Tracker" would like to access and update your Health data.
          </p>
          <TactileButton
            onClick={handleAllowAll}
            disabled={interactionsDisabled}
            className="mx-auto mt-5 w-full max-w-[220px]"
          >
            {busyPermission === "all" ? "Requesting..." : "Turn On All"}
          </TactileButton>
        </div>

        <div className="rounded-3xl border border-border/60 bg-white/85 shadow-sm backdrop-blur-md">
          <div className="border-b border-border/50 px-6 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-black/50">
              Allow "Workout Tracker" to Read
            </p>
          </div>

          <div className="divide-y divide-border/60">
            {PERMISSION_ITEMS.map((item) => {
              const checked = permissionStates[item.permission];
              const disabled =
                isLoading ||
                busyPermission === "all" ||
                (activeBusyPermission !== null && activeBusyPermission !== item.permission);
              return (
                <div
                  key={item.permission}
                  role="button"
                  tabIndex={disabled ? -1 : 0}
                  aria-disabled={disabled}
                  className={cn(
                    "flex w-full items-start gap-4 px-6 py-4 text-left transition-colors",
                    !disabled && "hover:bg-black/5",
                    disabled && "opacity-60",
                  )}
                  onClick={() => {
                    if (disabled) return;
                    handlePermissionToggle(item.permission, !checked);
                  }}
                  onKeyDown={(event) => {
                    if (disabled) return;
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handlePermissionToggle(item.permission, !checked);
                    }
                  }}
                >
                  <span
                    className={cn(
                      "mt-1 flex h-10 w-10 flex-none items-center justify-center rounded-2xl text-[18px]", item.iconClassName,
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="text-[15px] font-medium text-black">{item.label}</span>
                    <span className="text-sm text-black/60">{item.description}</span>
                  </span>
                  <Switch
                    checked={checked}
                    onCheckedChange={(value) => handlePermissionToggle(item.permission, value)}
                    disabled={disabled}
                    onClick={(event) => event.stopPropagation()}
                    aria-label={`Toggle ${item.label}`}
                  />
                </div>
              );
            })}
          </div>

          <div className="px-6 py-4 text-sm text-black/60">
            App Explanation: These permissions let WorkItOut sync steps, workouts, and recovery metrics so your plan stays accurate. You can adjust them anytime from Health settings.
          </div>
        </div>

        {(iosStatusNote || webNotice) && (
          <div className="rounded-3xl border border-dashed border-border/60 bg-white/60 px-6 py-4 text-sm text-black/60">
            {iosStatusNote || webNotice}
          </div>
        )}
      </Stack>
    </AppScreen>
  );
}

function permissionLabel(permission: TrackedPermission): string {
  const item = PERMISSION_ITEMS.find((entry) => entry.permission === permission);
  return item ? item.label : permission;
}

export default DeviceSettingsScreen;
