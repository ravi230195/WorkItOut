import { useCallback, useEffect, useMemo, useState, type ComponentType } from "react";
import { AppScreen, ScreenHeader, Section, Stack } from "../../layouts";
import { TactileButton } from "../../TactileButton";
import { Badge } from "../../ui/badge";
import { toast } from "sonner";
import {
  Activity,
  Flame,
  Heart,
  HeartPulse,
  Route as RouteIcon,
  Sparkles,
} from "lucide-react";
import { logger } from "../../../utils/logging";
import type { HealthPermission } from "capacitor-health";
import type { RecordType } from "@kiwi-health/capacitor-health-connect";

type Platform = "ios" | "android" | "web" | string;

interface DeviceSettingsScreenProps {
  onBack: () => void;
}

interface PermissionConfig {
  key: HealthPermission;
  label: string;
  description: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  iconClasses: string;
  chipClasses: string;
  androidRecordType?: RecordType;
}

const PERMISSION_ITEMS = [
  {
    key: "READ_STEPS" as const,
    label: "Steps",
    description:
      "Track your daily step count to keep tabs on everyday movement and reach your goals.",
    icon: Activity,
    iconClasses: "bg-sky-100 text-sky-600",
    chipClasses: "bg-sky-500",
    androidRecordType: "Steps" as const,
  },
  {
    key: "READ_ACTIVE_CALORIES" as const,
    label: "Active Energy",
    description:
      "Measure calories burned during workouts so we can personalize intensity insights.",
    icon: Flame,
    iconClasses: "bg-orange-100 text-orange-600",
    chipClasses: "bg-orange-500",
    androidRecordType: "ActiveCaloriesBurned" as const,
  },
  {
    key: "READ_HEART_RATE" as const,
    label: "Heart Rate",
    description:
      "Stay aware of heart rate trends captured during exercise and recovery.",
    icon: HeartPulse,
    iconClasses: "bg-rose-100 text-rose-600",
    chipClasses: "bg-rose-500",
    androidRecordType: "HeartRateSeries" as const,
  },
  {
    key: "READ_DISTANCE" as const,
    label: "Distance",
    description:
      "Sync walking and running distance for a complete picture of your activity.",
    icon: RouteIcon,
    iconClasses: "bg-emerald-100 text-emerald-600",
    chipClasses: "bg-emerald-500",
    androidRecordType: "Distance" as const,
  },
] satisfies ReadonlyArray<PermissionConfig>;

type PermissionKey = (typeof PERMISSION_ITEMS)[number]["key"];
type PermissionState = Record<PermissionKey, boolean>;

const createEmptyState = (): PermissionState =>
  PERMISSION_ITEMS.reduce<PermissionState>((acc, item) => {
    acc[item.key] = false;
    return acc;
  }, {} as PermissionState);

const IOS_PERMISSIONS = PERMISSION_ITEMS.map((item) => item.key);
const ANDROID_PERMISSIONS = Array.from(
  new Set(
    PERMISSION_ITEMS.map((item) => item.androidRecordType).filter(
      (value): value is RecordType => Boolean(value),
    ),
  ),
);

export function DeviceSettingsScreen({ onBack }: DeviceSettingsScreenProps) {
  const [platform, setPlatform] = useState<Platform>("web");
  const [permissionState, setPermissionState] = useState<PermissionState>(() =>
    createEmptyState(),
  );
  const [healthAvailable, setHealthAvailable] = useState<boolean | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  const refreshPermissions = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const { Capacitor } = await import("@capacitor/core");
      const detectedPlatform = Capacitor.getPlatform();
      setPlatform(detectedPlatform);

      if (detectedPlatform !== "ios" && detectedPlatform !== "android") {
        setHealthAvailable(false);
        return;
      }

      if (detectedPlatform === "ios") {
        const { Health } = await import("capacitor-health");
        const availability = await Health.isHealthAvailable();
        const available = Boolean(availability?.available);
        setHealthAvailable(available);
        if (!available) return;

        try {
          const response = await Health.checkHealthPermissions({
            permissions: IOS_PERMISSIONS,
          });
          const merged = (response?.permissions ?? []).reduce(
            (acc, entry) => Object.assign(acc, entry),
            {} as Record<string, boolean>,
          );
          const next = createEmptyState();
          for (const item of PERMISSION_ITEMS) {
            const value = merged[item.key];
            if (typeof value === "boolean") {
              next[item.key] = value;
            }
          }
          setPermissionState(next);
        } catch (error) {
          logger.warn("[device-settings] Unable to check iOS permissions", error);
        }
        return;
      }

      if (detectedPlatform === "android") {
        try {
          const { HealthConnect } = await import(
            "@kiwi-health/capacitor-health-connect"
          );
          const availability = await HealthConnect.checkAvailability();
          const available = availability?.availability === "Available";
          setHealthAvailable(available);
          if (!available) return;

          if (!ANDROID_PERMISSIONS.length) return;

          const response = await HealthConnect.checkHealthPermissions({
            read: ANDROID_PERMISSIONS,
            write: [],
          });
          const granted = new Set(response?.grantedPermissions ?? []);
          const next = createEmptyState();
          for (const item of PERMISSION_ITEMS) {
            if (item.androidRecordType) {
              next[item.key] = granted.has(item.androidRecordType);
            }
          }
          setPermissionState(next);
        } catch (error) {
          logger.warn("[device-settings] Unable to check Android permissions", error);
        }
      }
    } catch (error) {
      logger.error("[device-settings] Refresh permissions failed", error);
      toast.error("Couldn't read device permissions. Please try again.");
    } finally {
      setHasInitialized(true);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refreshPermissions();
  }, [refreshPermissions]);

  const handleEnableAll = useCallback(async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const { Capacitor } = await import("@capacitor/core");
      const detectedPlatform = Capacitor.getPlatform();

      if (detectedPlatform === "ios") {
        const { Health } = await import("capacitor-health");
        await Health.requestHealthPermissions({ permissions: IOS_PERMISSIONS });
        toast.success("Requested access to all Health data categories.");
        setPermissionState((prev) => {
          const next = { ...prev };
          for (const item of PERMISSION_ITEMS) {
            next[item.key] = true;
          }
          return next;
        });
      } else if (detectedPlatform === "android") {
        if (!ANDROID_PERMISSIONS.length) {
          toast.info("No Health Connect permissions to request.");
        } else {
          const { HealthConnect } = await import(
            "@kiwi-health/capacitor-health-connect"
          );
          const result = await HealthConnect.requestHealthPermissions({
            read: ANDROID_PERMISSIONS,
            write: [],
          });
          if (result?.hasAllPermissions) {
            toast.success("All requested Health Connect permissions granted.");
          } else {
            toast.info("Review granted permissions in Health Connect.");
          }
          setPermissionState((prev) => {
            const next = { ...prev };
            for (const item of PERMISSION_ITEMS) {
              if (item.androidRecordType) {
                next[item.key] = true;
              }
            }
            return next;
          });
        }
      } else {
        toast.info("Health permissions can be managed from the mobile app.");
      }
    } catch (error) {
      logger.error("[device-settings] Enable all failed", error);
      toast.error("Unable to update permissions. Please try again.");
    } finally {
      setIsProcessing(false);
      void refreshPermissions();
    }
  }, [isProcessing, refreshPermissions]);

  const handleOpenNativeSettings = useCallback(async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const { Capacitor } = await import("@capacitor/core");
      const detectedPlatform = Capacitor.getPlatform();

      if (detectedPlatform === "ios") {
        const { Health } = await import("capacitor-health");
        await Health.openAppleHealthSettings();
      } else if (detectedPlatform === "android") {
        const { HealthConnect } = await import(
          "@kiwi-health/capacitor-health-connect"
        );
        await HealthConnect.openHealthConnectSetting();
      } else {
        toast.info("Native health settings are only available on mobile devices.");
      }
    } catch (error) {
      logger.error("[device-settings] Open native settings failed", error);
      toast.error("Couldn't open native health settings.");
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing]);

  const handleToggle = useCallback(
    async (item: PermissionConfig) => {
      if (isProcessing) return;
      setIsProcessing(true);
      try {
        const { Capacitor } = await import("@capacitor/core");
        const detectedPlatform = Capacitor.getPlatform();
        const nextState = !permissionState[item.key];

        if (detectedPlatform === "ios") {
          const { Health } = await import("capacitor-health");
          if (nextState) {
            await Health.requestHealthPermissions({ permissions: [item.key] });
            toast.success(`Requested access to ${item.label}.`);
            setPermissionState((prev) => ({ ...prev, [item.key]: true }));
          } else {
            await Health.openAppleHealthSettings();
            toast.info("Toggle this category off directly in Apple Health.");
          }
        } else if (detectedPlatform === "android") {
          const { HealthConnect } = await import(
            "@kiwi-health/capacitor-health-connect"
          );
          if (!item.androidRecordType) {
            toast.info("This permission isn't available on Health Connect.");
          } else if (nextState) {
            await HealthConnect.requestHealthPermissions({
              read: [item.androidRecordType],
              write: [],
            });
            setPermissionState((prev) => ({ ...prev, [item.key]: true }));
          } else {
            await HealthConnect.openHealthConnectSetting();
            toast.info("Toggle this permission off in Health Connect.");
          }
        } else {
          toast.info("Health permissions can be managed from the mobile app.");
        }
      } catch (error) {
        logger.error("[device-settings] Toggle permission failed", error);
        toast.error("Couldn't update that permission. Please try again.");
      } finally {
        setIsProcessing(false);
        void refreshPermissions();
      }
    },
    [isProcessing, permissionState, refreshPermissions],
  );

  const statusBadge = useMemo(() => {
    if (!hasInitialized || isRefreshing) {
      return (
        <Badge className="bg-black/10 text-black" variant="outline">
          Checking…
        </Badge>
      );
    }

    if (!healthAvailable) {
      return (
        <Badge className="bg-rose-100 text-rose-600 border-rose-200" variant="outline">
          Unavailable
        </Badge>
      );
    }

    const label = platform === "android" ? "Health Connect" : "Apple Health";
    return (
      <Badge className="bg-emerald-100 text-emerald-600 border-emerald-200" variant="outline">
        Connected · {label}
      </Badge>
    );
  }, [hasInitialized, healthAvailable, isRefreshing, platform]);

  const renderToggle = (item: PermissionConfig) => {
    const enabled = permissionState[item.key];

    return (
      <button
        key={item.key}
        type="button"
        onClick={() => handleToggle(item)}
        disabled={isProcessing || !healthAvailable}
        className="w-full rounded-2xl px-4 py-3 text-left transition hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <div className="flex items-start gap-4">
          <div
            className={`mt-1 flex h-10 w-10 items-center justify-center rounded-2xl ${item.iconClasses}`}
          >
            <item.icon size={18} className="" />
          </div>
          <div className="flex-1 text-sm leading-tight text-black">
            <p className="font-semibold">{item.label}</p>
            <p className="mt-1 text-xs text-black/60 leading-snug">{item.description}</p>
          </div>
          <div
            className={`relative inline-flex h-7 w-[46px] items-center rounded-full transition-colors duration-200 ${enabled ? "bg-[#34C759]" : "bg-black/15"}`}
          >
            <span
              className="absolute left-[3px] top-[3px] h-[22px] w-[22px] rounded-full bg-white shadow transition-transform duration-200"
              style={{ transform: `translateX(${enabled ? 20 : 0}px)` }}
            />
            <span
              className={`absolute inset-y-1 right-[6px] h-[10px] w-[10px] rounded-full opacity-0 transition-opacity duration-200 ${item.chipClasses}`}
              style={{ opacity: enabled ? 1 : 0 }}
            />
          </div>
        </div>
      </button>
    );
  };

  return (
    <AppScreen
      header={
        <ScreenHeader
          title="Health Access"
          subtitle="Manage device data permissions"
          onBack={onBack}
          denseSmall
          showBorder={false}
          titleClassName="text-[17px] font-semibold text-black"
          subtitleClassName="text-[11px] uppercase tracking-[0.22em] text-black/50"
        />
      }
      showHeaderBorder={false}
      showBottomBarBorder={false}
      maxContent="responsive"
      headerInScrollArea
      padHeaderSafeArea
    >
      <Stack gap="fluid">
        <Section variant="plain" padding="none">
          <div className="rounded-[28px] border border-border bg-card/80 p-6 text-center shadow-sm backdrop-blur-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[26px] bg-rose-100 text-rose-500 shadow-inner">
              <Heart size={30} />
            </div>
            <h1 className="text-[22px] font-semibold text-black">Health</h1>
            <p className="mt-2 text-sm leading-snug text-black/70">
              “Workout Tracker” would like to access and update your health data so we can keep your activity insights in sync.
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              {statusBadge}
            </div>
            <TactileButton
              variant="secondary"
              size="sm"
              onClick={handleEnableAll}
              disabled={isProcessing || !healthAvailable}
              className="mt-5 rounded-2xl px-6 py-2 text-sm font-semibold"
            >
              {isProcessing ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Updating…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Sparkles size={16} />
                  Turn On All
                </span>
              )}
            </TactileButton>
          </div>
        </Section>

        <Section variant="plain" padding="none">
          <div className="rounded-[28px] border border-border bg-card/80 p-5 shadow-sm backdrop-blur-sm">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-black/60">
              Allow “Workout Tracker” to read
            </p>
            <div className="mt-4 space-y-2">{PERMISSION_ITEMS.map(renderToggle)}</div>

            <div className="mt-6 rounded-2xl bg-black/5 p-4 text-left text-[12px] leading-relaxed text-black/70">
              <p className="font-semibold uppercase tracking-[0.2em] text-black/60">App Explanation</p>
              <p className="mt-2">
                Workout Tracker uses Apple Health and Health Connect to pull in your movement, cardio, and energy metrics. You can
                change access anytime in your device settings. Turning a permission off may limit goal tracking accuracy.
              </p>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-black/50">
                Need to adjust something system-wide? Jump straight to the native health settings.
              </p>
              <TactileButton
                variant="ghost"
                size="sm"
                onClick={handleOpenNativeSettings}
                disabled={isProcessing}
                className="px-0 text-sm font-semibold text-black"
              >
                Open Health Settings
              </TactileButton>
            </div>
          </div>
        </Section>

        {platform !== "ios" && platform !== "android" && (
          <Section variant="plain" padding="none">
            <div className="rounded-[24px] border border-dashed border-border/80 bg-card/70 p-5 text-sm text-black/70">
              This screen mirrors the native Health permission sheet. Connect a mobile device to manage real permissions, or use
              the simulator in Xcode to test the flow on iOS.
            </div>
          </Section>
        )}
      </Stack>
    </AppScreen>
  );
}

export default DeviceSettingsScreen;
