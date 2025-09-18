import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { toast } from "sonner";
import { AppScreen, ScreenHeader, Section, Stack } from "../../layouts";
import { TactileButton } from "../../TactileButton";
import { Badge } from "../../ui/badge";
import {
  Apple,
  Dumbbell,
  Egg,
  Flame,
  Footprints,
  Heart,
  Percent,
  Ruler,
  Utensils,
  Weight as WeightIcon,
  Droplets,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type {
  HealthPermission,
  HealthPlugin as CapacitorHealthPlugin,
} from "capacitor-health";
import type { RecordType as HealthConnectRecordType } from "@kiwi-health/capacitor-health-connect";
import type { HealthConnectPlugin } from "@kiwi-health/capacitor-health-connect";
import { logger } from "../../../utils/logging";

const STORAGE_KEY_PREFIX = "device-permissions-state";

class PermissionToggleAbortedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PermissionToggleAbortedError";
  }
}

type Platform = "ios" | "android" | "web" | "unknown";
type StoragePlatform = "ios" | "android" | "web";

const SUPPORTED_IOS_PERMISSIONS: readonly HealthPermission[] = [
  "READ_STEPS",
  "READ_WORKOUTS",
  "READ_ACTIVE_CALORIES",
  "READ_HEART_RATE",
  "READ_ROUTE",
  "READ_DISTANCE",
  "READ_MINDFULNESS",
];

type PermissionStates = Record<string, boolean>;

interface PermissionItem {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  iconBgClass: string;
  iconColorClass: string;
  iosPermission?: HealthPermission;
  androidRead?: HealthConnectRecordType;
  comingSoon?: boolean;
  highlight?: boolean;
  platformNotes?: Partial<Record<"ios" | "android" | "web", string>>;
}

const READ_PERMISSION_CONFIG: PermissionItem[] = [
  {
    id: "active-energy",
    label: "Active Energy",
    description: "Calories burned while you move.",
    icon: Flame,
    iconBgClass: "bg-[#FDE9E2]",
    iconColorClass: "text-[#E45826]",
    iosPermission: "READ_ACTIVE_CALORIES",
    androidRead: "ActiveCaloriesBurned",
    highlight: true,
  },
  {
    id: "steps",
    label: "Steps",
    description: "Powers your daily activity progress.",
    icon: Footprints,
    iconBgClass: "bg-[#EEF0FF]",
    iconColorClass: "text-[#5C63FF]",
    iosPermission: "READ_STEPS",
    androidRead: "Steps",
    highlight: true,
  },
  {
    id: "workouts",
    label: "Workouts",
    description: "Keeps your workout history in sync.",
    icon: Dumbbell,
    iconBgClass: "bg-[#E6F6FF]",
    iconColorClass: "text-[#0F7AE5]",
    iosPermission: "READ_WORKOUTS",
    platformNotes: {
      android: "Health Connect does not yet expose workout sessions for third-party apps.",
    },
    highlight: true,
  },
  {
    id: "active-dietary-energy",
    label: "Dietary Energy",
    description: "Calories you log from meals.",
    icon: Utensils,
    iconBgClass: "bg-[#F8E8E8]",
    iconColorClass: "text-[#D26A5A]",
    platformNotes: {
      ios: "Apple Health access for dietary energy isn't supported yet.",
      android: "We will surface dietary energy when Health Connect provides nutrition APIs.",
    },
  },
  {
    id: "heart-rate",
    label: "Heart Rate",
    description: "Measures workout intensity from BPM readings.",
    icon: Heart,
    iconBgClass: "bg-[#FFE5E8]",
    iconColorClass: "text-[#E9637B]",
    iosPermission: "READ_HEART_RATE",
    androidRead: "HeartRateSeries",
  },
  {
    id: "body-fat-percentage",
    label: "Body Fat Percentage",
    description: "Track body composition trends from smart scales.",
    icon: Percent,
    iconBgClass: "bg-[#EAF4F0]",
    iconColorClass: "text-[#3A7D44]",
    androidRead: "BodyFat",
    platformNotes: {
      ios: "Apple Health permissions for body fat are coming soon to WorkItOut.",
    },
  },
  {
    id: "weight",
    label: "Weight",
    description: "Sync weigh-ins from connected scales.",
    icon: WeightIcon,
    iconBgClass: "bg-[#FFF0E0]",
    iconColorClass: "text-[#E07A5F]",
    androidRead: "Weight",
    platformNotes: {
      ios: "Manage weight access from Apple Health > Sources > WorkItOut.",
    },
  },
  {
    id: "waist-circumference",
    label: "Waist Circumference",
    description: "Keep tape-measure trends alongside your workouts.",
    icon: Ruler,
    iconBgClass: "bg-[#EAF4FF]",
    iconColorClass: "text-[#3A80D9]",
    comingSoon: true,
    platformNotes: {
      ios: "Apple Health permissions for waist measurements are on our roadmap.",
      android: "Health Connect support for waist circumference is not yet available.",
    },
  },
  {
    id: "carbohydrates",
    label: "Carbohydrates",
    description: "Nutrition syncing is coming soon.",
    icon: Apple,
    iconBgClass: "bg-[#FFF3D6]",
    iconColorClass: "text-[#C57B57]",
    comingSoon: true,
  },
  {
    id: "protein",
    label: "Protein",
    description: "Nutrition syncing is coming soon.",
    icon: Egg,
    iconBgClass: "bg-[#FFF2E1]",
    iconColorClass: "text-[#D98555]",
    comingSoon: true,
  },
  {
    id: "total-fat",
    label: "Total Fat",
    description: "Nutrition syncing is coming soon.",
    icon: Droplets,
    iconBgClass: "bg-[#EAF0FF]",
    iconColorClass: "text-[#6174D6]",
    comingSoon: true,
  },
];

const defaultPermissionState: PermissionStates = READ_PERMISSION_CONFIG.reduce(
  (acc, item) => {
    acc[item.id] = false;
    return acc;
  },
  {} as PermissionStates,
);

const toStoragePlatform = (platform: Platform): StoragePlatform => {
  if (platform === "ios" || platform === "android") {
    return platform;
  }
  return "web";
};

const storageKeyForPlatform = (platform: StoragePlatform) =>
  `${STORAGE_KEY_PREFIX}:${platform}`;

type IosPermissionResponse = Awaited<
  ReturnType<CapacitorHealthPlugin["requestHealthPermissions"]>
>;

const didGrantIosPermission = (
  response: IosPermissionResponse | null | undefined,
  permission: HealthPermission,
) => {
  if (!response) {
    return true;
  }

  const { permissions } = response;
  if (!permissions) {
    return true;
  }

  if (Array.isArray(permissions)) {
    if (permissions.length === 0) {
      return true;
    }
    return permissions.some((entry) => Boolean(entry?.[permission]));
  }

  if (typeof permissions === "object") {
    const record = permissions as Record<string, boolean>;
    if (permission in record) {
      return Boolean(record[permission]);
    }
  }

  return true;
};

const loadStoredPermissions = (platform: StoragePlatform): PermissionStates => {
  if (typeof window === "undefined") return { ...defaultPermissionState };
  try {
    const raw = window.localStorage.getItem(storageKeyForPlatform(platform));
    if (!raw) return { ...defaultPermissionState };
    const parsed = JSON.parse(raw) as PermissionStates;
    return { ...defaultPermissionState, ...parsed };
  } catch (error) {
    logger.warn("Failed to parse stored permission state", error);
    return { ...defaultPermissionState };
  }
};

interface DeviceSettingsScreenProps {
  onBack: () => void;
}

export function DeviceSettingsScreen({ onBack }: DeviceSettingsScreenProps) {
  const [platform, setPlatform] = useState<Platform>("unknown");
  const [permissionStates, setPermissionStates] = useState<PermissionStates>({
    ...defaultPermissionState,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const isIosPermissionSupported = useCallback(
    (permission?: HealthPermission | null) =>
      Boolean(permission && SUPPORTED_IOS_PERMISSIONS.includes(permission)),
    [],
  );
  const hasLoadedStoredStateRef = useRef(false);
  const hasAutoRequestedPermissionsRef = useRef(false);

  const effectivePlatform: StoragePlatform = useMemo(
    () => toStoragePlatform(platform),
    [platform],
  );

  const canManageOnDevice = platform === "ios" || platform === "android";

  const platformLabel = useMemo(() => {
    if (platform === "ios") return "Apple Health";
    if (platform === "android") return "Health Connect";
    return "mobile";
  }, [platform]);

  useEffect(() => {
    let isMounted = true;
    const resolvePlatform = async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!isMounted) return;
        const resolved = Capacitor.getPlatform();
        if (resolved === "ios" || resolved === "android" || resolved === "web") {
          setPlatform(resolved);
        } else {
          setPlatform("web");
        }
      } catch {
        setPlatform("web");
      }
    };

    resolvePlatform();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!canManageOnDevice || hasLoadedStoredStateRef.current) return;
    hasLoadedStoredStateRef.current = true;
    setPermissionStates(loadStoredPermissions(effectivePlatform));
  }, [canManageOnDevice, effectivePlatform]);

  useEffect(() => {
    if (platform === "unknown" || typeof window === "undefined") return;
    window.localStorage.setItem(
      storageKeyForPlatform(effectivePlatform),
      JSON.stringify(permissionStates),
    );
  }, [effectivePlatform, permissionStates, platform]);

  const ensureAppleHealth = useCallback(async (): Promise<CapacitorHealthPlugin | null> => {
    try {
      if (platform !== "ios") {
        return null;
      }

      const { Health } = await import("capacitor-health");
      if (Health) {
        return Health;
      }

      logger.warn("Apple Health plugin failed to load even though this device reports iOS.");
      return null;
    } catch (error) {
      logger.error("Failed to load Apple Health plugin", error);
      return null;
    }
  }, [platform]);

  const ensureHealthConnect = useCallback(async (): Promise<HealthConnectPlugin | null> => {
    try {
      if (platform !== "android") {
        return null;
      }

      const { HealthConnect } = await import("@kiwi-health/capacitor-health-connect");
      if (HealthConnect) {
        return HealthConnect;
      }

      logger.warn("Health Connect plugin failed to load even though this device reports Android.");
      return null;
    } catch (error) {
      logger.error("Failed to load Health Connect plugin", error);
      return null;
    }
  }, [platform]);

  interface RefreshOptions {
    silent?: boolean;
  }

  const refreshFromDevice = useCallback(
    async ({ silent }: RefreshOptions = {}) => {
      if (!canManageOnDevice) return;

      try {
        setIsRefreshing(true);
        if (platform === "android") {
          const healthConnect = await ensureHealthConnect();
          if (!healthConnect) {
            if (!silent) {
              toast.error("Health Connect integration isn't available on this device.");
            }
            return;
          }

          const availability = await healthConnect.checkAvailability();
          if (availability.availability !== "Available") {
            if (!silent) {
              toast.info("Health Connect isn't available on this device.");
            }
            return;
          }

          const readTypes = READ_PERMISSION_CONFIG
            .map((item) => item.androidRead)
            .filter(Boolean) as HealthConnectRecordType[];

          if (readTypes.length === 0) {
            return;
          }

          const response = await healthConnect.checkHealthPermissions({
            read: readTypes,
            write: [],
          });
          const granted = new Set(response.grantedPermissions ?? []);
          setPermissionStates((prev) => {
            const next = { ...prev };
            for (const item of READ_PERMISSION_CONFIG) {
              if (!item.androidRead) continue;
              next[item.id] = granted.has(item.androidRead);
            }
            return next;
          });
        } else if (platform === "ios") {
          const health = await ensureAppleHealth();
          if (!health) {
            if (!silent) {
              toast.error("Apple Health integration isn't available on this device.");
            }
            return;
          }

          const availability = await health.isHealthAvailable();
          if (!availability?.available) {
            if (!silent) {
              toast.info("Apple Health isn't available on this device.");
            }
            return;
          }

          if (!silent) {
            toast.info(
              "Apple Health manages permissions in the Health app. Adjust them there to update WorkItOut.",
            );
          }
        }
      } catch (error) {
        logger.warn("Failed to refresh device permissions", error);
        if (!silent) {
          toast.error("Couldn't refresh device permissions.");
        }
      } finally {
        setIsRefreshing(false);
      }
    },
    [canManageOnDevice, ensureAppleHealth, ensureHealthConnect, platform],
  );

  const requestAllPermissions = useCallback(
    async ({ silent }: RefreshOptions = {}) => {
      if (!canManageOnDevice) {
        if (!silent) {
          toast.info("Open this screen on your phone to manage permissions.");
        }
        return;
      }

      try {
        if (platform === "ios") {
          const health = await ensureAppleHealth();
          if (!health) {
            toast.error("Apple Health integration isn't available on this device.");
            return;
          }

          const availability = await health.isHealthAvailable();
          if (!availability?.available) {
            toast.info("Apple Health isn't available on this device.");
            return;
          }

          const readPermissions = READ_PERMISSION_CONFIG
            .map((item) => item.iosPermission)
            .filter((permission): permission is HealthPermission =>
              Boolean(permission && isIosPermissionSupported(permission)),
            );

          if (readPermissions.length === 0) {
            if (!silent) {
              toast.info("No Apple Health permissions are available right now.");
            }
            return;
          }

          if (!silent) {
            toast.success("Review Apple Health access");
          }

          const response = await health.requestHealthPermissions({
            read: readPermissions,
          });

          setPermissionStates((prev) => {
            const next = { ...prev };
            for (const item of READ_PERMISSION_CONFIG) {
              const permission = item.iosPermission;
              if (!permission || !isIosPermissionSupported(permission)) continue;
              next[item.id] = didGrantIosPermission(response, permission);
            }
            return next;
          });
        } else if (platform === "android") {
          const healthConnect = await ensureHealthConnect();
          if (!healthConnect) {
            toast.error("Health Connect integration isn't available on this device.");
            return;
          }

          const availability = await healthConnect.checkAvailability();
          if (availability.availability !== "Available") {
            toast.info("Health Connect isn't available on this device.");
            return;
          }

          const readTypes = READ_PERMISSION_CONFIG
            .map((item) => item.androidRead)
            .filter((type): type is HealthConnectRecordType => Boolean(type));

          if (readTypes.length === 0) {
            if (!silent) {
              toast.info("No Health Connect permissions are available right now.");
            }
            return;
          }

          if (!silent) {
            toast.success("Review Health Connect access");
          }

          const response = await healthConnect.requestHealthPermissions({
            read: readTypes,
            write: [],
          });

          const granted = new Set(response.grantedPermissions ?? []);
          setPermissionStates((prev) => {
            const next = { ...prev };
            for (const item of READ_PERMISSION_CONFIG) {
              if (!item.androidRead) continue;
              next[item.id] = granted.has(item.androidRead);
            }
            return next;
          });
        }
      } catch (error) {
        logger.error("Failed to request device permissions", error);
        toast.error("Couldn't open the device permission request.");
      } finally {
        await refreshFromDevice({ silent: true });
      }
    },
    [
      canManageOnDevice,
      ensureAppleHealth,
      ensureHealthConnect,
      isIosPermissionSupported,
      platform,
      refreshFromDevice,
    ],
  );

  useEffect(() => {
    if (!canManageOnDevice || hasAutoRequestedPermissionsRef.current) {
      return;
    }

    hasAutoRequestedPermissionsRef.current = true;
    void requestAllPermissions({ silent: true });
  }, [canManageOnDevice, requestAllPermissions]);

  useEffect(() => {
    void refreshFromDevice({ silent: true });
  }, [refreshFromDevice]);

  const handleToggle = useCallback(
    async (item: PermissionItem, nextValue: boolean) => {
      if (pendingId) return;
      const supportsCurrentPlatform =
        platform === "ios"
          ? isIosPermissionSupported(item.iosPermission)
          : platform === "android"
            ? Boolean(item.androidRead)
            : false;

      if (!supportsCurrentPlatform || item.comingSoon || !canManageOnDevice) {
        return;
      }

      const previousValue = Boolean(permissionStates[item.id]);
      setPermissionStates((prev) => ({ ...prev, [item.id]: nextValue }));
      setPendingId(item.id);

      let shouldRefreshAfter = false;
      let succeeded = false;

      try {
        if (nextValue) {
          if (platform === "ios" && item.iosPermission) {
            if (!isIosPermissionSupported(item.iosPermission)) {
              toast.info(`${item.label} isn't available to import from Apple Health yet.`);
              throw new PermissionToggleAbortedError("unsupported-ios-permission");
            }

            const health = await ensureAppleHealth();
            if (!health) {
              toast.error("Apple Health integration isn't available on this device.");
              throw new PermissionToggleAbortedError("missing-apple-health");
            }

            const availability = await health.isHealthAvailable();
            if (!availability?.available) {
              toast.info("Apple Health isn't available on this device.");
              throw new PermissionToggleAbortedError("apple-health-unavailable");
            }

            const response = await health.requestHealthPermissions({
              permissions: [item.iosPermission],
            });
            const granted = didGrantIosPermission(response, item.iosPermission);
            if (!granted) {
              toast.info(`Enable ${item.label} inside Apple Health.`);
              throw new PermissionToggleAbortedError("apple-health-denied");
            }

            toast.success(`${item.label} enabled`);
          } else if (platform === "android" && item.androidRead) {
            const healthConnect = await ensureHealthConnect();
            if (!healthConnect) {
              toast.error("Health Connect integration isn't available on this device.");
              throw new PermissionToggleAbortedError("missing-health-connect");
            }

            const availability = await healthConnect.checkAvailability();
            if (availability.availability !== "Available") {
              toast.error("Health Connect is unavailable.");
              throw new PermissionToggleAbortedError("health-connect-unavailable");
            }

            const response = await healthConnect.requestHealthPermissions({
              read: [item.androidRead],
              write: [],
            });
            const granted = Array.isArray(response.grantedPermissions)
              ? response.grantedPermissions.includes(item.androidRead)
              : Boolean(response.hasAllPermissions);
            if (!granted) {
              toast.info(`Enable ${item.label} inside Health Connect.`);
              throw new PermissionToggleAbortedError("health-connect-denied");
            }

            toast.success(`${item.label} enabled`);
            shouldRefreshAfter = true;
          }
        } else {
          if (platform === "ios") {
            const health = await ensureAppleHealth();
            if (!health) {
              toast.error("Apple Health integration isn't available on this device.");
              throw new PermissionToggleAbortedError("missing-apple-health");
            }
            await health.openAppleHealthSettings();
            toast.info("Turn off access from Apple Health > Sources > WorkItOut.");
          } else if (platform === "android") {
            const healthConnect = await ensureHealthConnect();
            if (!healthConnect) {
              toast.error("Health Connect integration isn't available on this device.");
              throw new PermissionToggleAbortedError("missing-health-connect");
            }
            await healthConnect.openHealthConnectSetting();
            toast.info("Use Health Connect to revoke this permission.");
            // Give the user time to adjust the toggle before refreshing state
            setTimeout(() => {
              void refreshFromDevice({ silent: true });
            }, 1500);
          }
        }

        succeeded = true;
      } catch (error) {
        if (error instanceof PermissionToggleAbortedError) {
          logger.debug(`Permission toggle for ${item.id} aborted: ${error.message}`);
        } else {
          logger.error(`Failed to toggle permission ${item.id}`, error);
          toast.error("Something went wrong while updating permissions.");
        }
      } finally {
        if (!succeeded) {
          setPermissionStates((prev) => ({ ...prev, [item.id]: previousValue }));
        }
        setPendingId(null);
        if (shouldRefreshAfter) {
          void refreshFromDevice({ silent: true });
        }
      }
    },
    [
      canManageOnDevice,
      ensureAppleHealth,
      ensureHealthConnect,
      isIosPermissionSupported,
      pendingId,
      permissionStates,
      platform,
      refreshFromDevice,
    ],
  );

  const openAppleHealthSettings = useCallback(async (): Promise<boolean> => {
    try {
      const health = await ensureAppleHealth();
      if (!health) {
        toast.error("Apple Health integration isn't available on this device.");
        return false;
      }
      await health.openAppleHealthSettings();
      return true;
    } catch (error) {
      logger.error("Failed to open Apple Health settings", error);
      toast.error("Unable to open Apple Health settings on this device.");
      return false;
    }
  }, [ensureAppleHealth]);

  const openHealthConnectSettings = useCallback(async (): Promise<boolean> => {
    try {
      const healthConnect = await ensureHealthConnect();
      if (!healthConnect) {
        toast.error("Health Connect integration isn't available on this device.");
        return false;
      }
      await healthConnect.openHealthConnectSetting();
      return true;
    } catch (error) {
      logger.error("Failed to open Health Connect settings", error);
      toast.error("Unable to open Health Connect settings on this device.");
      return false;
    }
  }, [ensureHealthConnect]);

  const handleOpenSettings = useCallback(async () => {
    if (!canManageOnDevice) {
      toast.info("Open this screen on your phone to manage permissions.");
      return;
    }

    let opened = false;
    if (platform === "ios") {
      opened = await openAppleHealthSettings();
    } else if (platform === "android") {
      opened = await openHealthConnectSettings();
    }

    if (opened) {
      toast.success("Opening device health settings…");
    }
  }, [canManageOnDevice, openAppleHealthSettings, openHealthConnectSettings, platform]);

  const handleRequestPermissions = useCallback(async () => {
    await requestAllPermissions({ silent: false });
  }, [requestAllPermissions]);

  const handleManageInAppleHealth = useCallback(async () => {
    if (!canManageOnDevice) {
      toast.info("Open this screen on your phone to manage permissions.");
      return;
    }

    if (platform !== "ios") {
      await handleOpenSettings();
      return;
    }

    const opened = await openAppleHealthSettings();
    if (opened) {
      toast.success("Opening Apple Health settings…");
    }
  }, [canManageOnDevice, handleOpenSettings, openAppleHealthSettings, platform]);

  const handleRefresh = useCallback(async () => {
    if (!canManageOnDevice) {
      toast.info("Open this screen on your phone to manage permissions.");
      return;
    }

    await refreshFromDevice({ silent: false });
    if (platform === "android") {
      toast.success("Permissions updated");
    }
  }, [canManageOnDevice, platform, refreshFromDevice]);

  const renderPermissionRow = (item: PermissionItem) => {
    const supported =
      platform === "ios"
        ? isIosPermissionSupported(item.iosPermission) && !item.comingSoon
        : platform === "android"
          ? Boolean(item.androidRead) && !item.comingSoon
          : false;

    const badges: Array<{ key: string; label: string; variant?: "default" | "secondary" | "outline" }> = [];

    if (item.highlight) {
      badges.push({ key: "highlight", label: "In Use", variant: "secondary" });
    }

    if (item.comingSoon) {
      badges.push({ key: "coming", label: "Coming Soon", variant: "outline" });
    }

    if (!item.comingSoon) {
      if (platform === "ios" && !item.iosPermission) {
        if (item.androidRead) {
          badges.push({ key: "android-only", label: "Android Only", variant: "outline" });
        } else {
          badges.push({ key: "unavailable", label: "Not Yet Available", variant: "outline" });
        }
      } else if (platform === "android" && !item.androidRead) {
        if (item.iosPermission) {
          badges.push({ key: "ios-only", label: "Apple Health Only", variant: "outline" });
        } else {
          badges.push({ key: "unavailable", label: "Not Yet Available", variant: "outline" });
        }
      } else if (!canManageOnDevice) {
        badges.push({ key: "mobile", label: "Mobile Only", variant: "outline" });
      }
    }

    const hasRequestedOnIos =
      platform === "ios" && Boolean(permissionStates[item.id]) && supported;

    const description = supported
      ? hasRequestedOnIos
        ? "Manage this permission from Apple Health > Sources > WorkItOut."
        : item.description
      : item.platformNotes?.[effectivePlatform] ||
        (!canManageOnDevice
          ? "Open WorkItOut on your phone to manage device permissions."
          : item.description);

    const isDisabled = !supported || pendingId === item.id || !canManageOnDevice;
    const checked = Boolean(permissionStates[item.id]);

    const showSwitch =
      supported && canManageOnDevice &&
      ((platform === "android" && item.androidRead) ||
        (platform === "ios" && item.iosPermission && !hasRequestedOnIos));
    const showManageInAppleHealth =
      platform === "ios" && hasRequestedOnIos && canManageOnDevice;

    return (
      <div key={item.id} className="flex items-center gap-3 px-4 py-3">
        <div
          className={clsx(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
            item.iconBgClass,
          )}
        >
          <item.icon className={clsx("h-5 w-5", item.iconColorClass)} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-[15px] font-medium text-black">{item.label}</p>
            {badges.map((badge) => (
              <Badge key={badge.key} variant={badge.variant}>{badge.label}</Badge>
            ))}
          </div>
          <p className="mt-1 text-xs text-black/60">
            {description}
          </p>
        </div>
        {showSwitch ? (
          <PermissionSwitch
            checked={checked}
            disabled={isDisabled}
            pending={pendingId === item.id}
            onCheckedChange={(next) => handleToggle(item, next)}
          />
        ) : showManageInAppleHealth ? (
          <TactileButton
            type="button"
            size="sm"
            variant="secondary"
            onClick={handleManageInAppleHealth}
            disabled={pendingId === item.id}
          >
            Manage in Apple Health
          </TactileButton>
        ) : null}
      </div>
    );
  };

  return (
    <AppScreen
      header={
        <ScreenHeader
          title="Device Settings"
          onBack={onBack}
          denseSmall
          showBorder
        />
      }
      maxContent="md"
      showHeaderBorder
      padHeader
      padContent
    >
      <div className="pb-safe space-y-6">
        <Section variant="card" className="border border-border/70" padding="lg">
          <Stack gap="sm">
            <p className="text-[15px] font-semibold uppercase tracking-[0.14em] text-black/60">
              Health Access
            </p>
            <p className="text-sm leading-6 text-black/70">
              WorkItOut uses {platformLabel} to read workout metrics and sync your body measurements.
              Choose the data sources that feel right for you.
            </p>
            {platform === "ios" ? (
              <p className="text-xs leading-5 text-black/60">
                After you respond to the first permission request, continue managing access from the
                Health app.
              </p>
            ) : null}
            <div className="flex flex-wrap gap-3 pt-1">
              <TactileButton
                type="button"
                size="sm"
                variant="primary"
                onClick={handleRequestPermissions}
                disabled={!canManageOnDevice}
              >
                Request permissions
              </TactileButton>
              <TactileButton
                type="button"
                size="sm"
                variant="secondary"
                onClick={handleRefresh}
                disabled={isRefreshing || !canManageOnDevice}
              >
                {isRefreshing ? "Refreshing…" : "Refresh status"}
              </TactileButton>
              <TactileButton
                type="button"
                size="sm"
                variant="secondary"
                onClick={handleOpenSettings}
              >
                Open health settings
              </TactileButton>
            </div>
          </Stack>
        </Section>

        <Section variant="card" padding="none" className="overflow-hidden border border-border/70">
          <div className="border-b border-border/60 bg-soft-gray/60 px-4 py-3">
            <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-black/60">
              Allow WorkItOut to Read
            </p>
            <p className="mt-1 text-xs text-black/60">
              These permissions keep your workouts and measurements in sync.
            </p>
          </div>
          <div className="divide-y divide-border/60">
            {READ_PERMISSION_CONFIG.map(renderPermissionRow)}
          </div>
        </Section>

        <Section variant="card" padding="lg" className="border border-border/70">
          <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-black/60">
            Allow WorkItOut to Write
          </p>
          <p className="mt-3 text-sm leading-6 text-black/60">
            We don’t write any data to {platformLabel} yet. When we add features like workout logging or
            nutrition tracking, you’ll be able to opt in here.
          </p>
        </Section>

        <Section variant="plain" padding="none">
          <Stack gap="xs" className="text-xs leading-5 text-black/50">
            <p>
              Data you allow can be accessed by the app in the background. You can turn off background
              access in Settings &gt; General &gt; Background App Refresh.
            </p>
            <p>
              Need to reset permissions? Remove WorkItOut from {platformLabel} and come back to reconnect.
            </p>
          </Stack>
        </Section>
      </div>
    </AppScreen>
  );
}

interface PermissionSwitchProps {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  disabled?: boolean;
  pending?: boolean;
}

function PermissionSwitch({ checked, onCheckedChange, disabled, pending }: PermissionSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-busy={pending}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={clsx(
        "relative h-7 w-12 rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
        checked ? "bg-[var(--primary)]" : "bg-black/10",
        disabled && "opacity-60 cursor-not-allowed",
      )}
    >
      <span
        className={clsx(
          "absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200",
          checked ? "translate-x-5" : "translate-x-0",
        )}
      />
      {pending ? (
        <span className="absolute inset-0 grid place-items-center">
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/50 border-t-transparent" />
        </span>
      ) : null}
      <span className="sr-only">Toggle permission</span>
    </button>
  );
}

export default DeviceSettingsScreen;
