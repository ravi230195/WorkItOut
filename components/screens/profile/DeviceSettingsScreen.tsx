import { useMemo } from "react";
import {
  AppScreen,
  ScreenHeader,
  Section,
  Stack,
} from "../../layouts";
import { Card, CardContent } from "../../ui/card";
import ListItem from "../../ui/ListItem";
import { TactileButton } from "../../TactileButton";
import {
  Activity,
  Brain,
  Flame,
  Footprints,
  HeartPulse,
  Route,
  Ruler,
  UtensilsCrossed,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import {
  HEALTH_PERMISSION_IDS,
  type HealthPermissionId,
  type PermissionStatus,
  useHealthPermissions,
} from "../../../hooks/useHealthPermissions";
import { cn } from "../../ui/utils";

type DeviceSettingsScreenProps = {
  onBack: () => void;
};

type PermissionMeta = {
  id: HealthPermissionId;
  title: string;
  description: string;
  icon: LucideIcon;
  accent: string;
};

const PERMISSION_META: PermissionMeta[] = [
  {
    id: "READ_STEPS",
    title: "Steps",
    description: "Allow us to read your step count to keep your activity streak accurate.",
    icon: Footprints,
    accent: "bg-primary/20 text-black",
  },
  {
    id: "READ_WORKOUTS",
    title: "Workouts",
    description: "Sync completed workouts so your training history stays up to date.",
    icon: Activity,
    accent: "bg-warm-peach/40 text-black",
  },
  {
    id: "READ_ACTIVE_CALORIES",
    title: "Active Energy",
    description: "Track the calories you burn during movement for more accurate goals.",
    icon: Flame,
    accent: "bg-warm-coral/30 text-black",
  },
  {
    id: "READ_TOTAL_CALORIES",
    title: "Total Calories",
    description: "Include resting energy to see your full daily calorie picture.",
    icon: UtensilsCrossed,
    accent: "bg-warm-cream/60 text-black",
  },
  {
    id: "READ_DISTANCE",
    title: "Distance",
    description: "Import running, walking, and cycling distance for cardio sessions.",
    icon: Ruler,
    accent: "bg-warm-mint/40 text-black",
  },
  {
    id: "READ_HEART_RATE",
    title: "Heart Rate",
    description: "Measure training intensity and recovery using heart rate trends.",
    icon: HeartPulse,
    accent: "bg-warm-rose/30 text-black",
  },
  {
    id: "READ_ROUTE",
    title: "Workout Routes",
    description: "Attach GPS routes to outdoor workouts you log inside the app.",
    icon: Route,
    accent: "bg-accent-blue/20 text-black",
  },
  {
    id: "READ_MINDFULNESS",
    title: "Mindfulness",
    description: "Import mindful minutes to balance your training with recovery.",
    icon: Brain,
    accent: "bg-warm-lavender/30 text-black",
  },
];

const STATUS_LABELS: Record<PermissionStatus, string> = {
  granted: "Enabled",
  denied: "Disabled",
  unknown: "Not requested",
};

const STATUS_COLORS: Record<PermissionStatus, string> = {
  granted: "text-success",
  denied: "text-destructive",
  unknown: "text-black/50",
};

type PermissionToggleProps = {
  checked: boolean;
  disabled?: boolean;
  loading?: boolean;
  onCheckedChange: (next: boolean) => void;
};

function PermissionToggle({ checked, disabled, loading, onCheckedChange }: PermissionToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative h-7 w-[50px] rounded-full transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40",
        checked ? "bg-primary" : "bg-black/20",
        (disabled || loading) && "opacity-60 cursor-not-allowed",
      )}
    >
      <span
        className="absolute left-[4px] top-1/2 h-[22px] w-[22px] -translate-y-1/2 rounded-full bg-white shadow transition-transform"
        style={{ transform: checked ? "translateX(22px)" : "translateX(0)" }}
      />
      {loading ? (
        <span className="absolute inset-0 grid place-items-center">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
        </span>
      ) : null}
    </button>
  );
}

export function DeviceSettingsScreen({ onBack }: DeviceSettingsScreenProps) {
  const {
    supported,
    statuses,
    isRefreshing,
    pendingKey,
    error,
    refresh,
    requestPermission,
    requestAll,
    openSystemSettings,
  } = useHealthPermissions();

  const permissionList = useMemo(() => {
    const metaMap = new Map(PERMISSION_META.map((meta) => [meta.id, meta] as const));
    return HEALTH_PERMISSION_IDS.map((id) => metaMap.get(id) ?? PERMISSION_META[0]!);
  }, []);

  const handleToggle = async (id: HealthPermissionId, next: boolean) => {
    if (next) {
      await requestPermission(id);
      return;
    }

    const opened = await openSystemSettings();
    if (opened) {
      toast.info("Use the system settings to turn this permission off.");
    } else {
      toast.error("Unable to open system settings. Update permissions manually.");
    }
  };

  const handleTurnOnAll = async () => {
    const result = await requestAll();
    if (result.success) {
      toast.success("Requested all available health permissions.");
    }
  };

  const handleRefresh = async () => {
    await refresh();
    toast.info("Permission status refreshed.");
  };

  return (
    <AppScreen
      header={
        <ScreenHeader
          title="Device Settings"
          subtitle={supported ? "Manage Health access" : "Available on the mobile app"}
          onBack={onBack}
          denseSmall
          showBorder
        />
      }
      showHeaderBorder={false}
      showBottomBarBorder={false}
      bottomBar={null}
      maxContent="responsive"
      padHeader
      padContent
    >
      <div className="pb-safe">
        <Stack gap="fluid">
          <Section variant="plain" padding="none">
            <Card className="border border-border bg-card/80 backdrop-blur-sm shadow-sm">
              <CardContent className="flex flex-col items-center gap-5 px-6 py-7 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/30">
                  <HeartPulse size={32} className="text-black" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold text-black">Health Access</h2>
                  <p className="text-sm text-black/70">
                    "Workout Tracker" would like to access and update your Health data so your progress stays in sync.
                  </p>
                </div>
                <div className="flex w-full flex-col gap-3 sm:flex-row">
                  <TactileButton
                    onClick={handleTurnOnAll}
                    disabled={!supported || pendingKey === "ALL"}
                    className="w-full sm:w-auto"
                  >
                    {pendingKey === "ALL" ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Turning on…
                      </span>
                    ) : (
                      "Turn On All"
                    )}
                  </TactileButton>
                  <TactileButton
                    variant="ghost"
                    onClick={handleRefresh}
                    disabled={!supported || isRefreshing}
                    className="w-full justify-center rounded-2xl border border-border/50 bg-transparent text-sm sm:w-auto"
                  >
                    {isRefreshing ? (
                      <span className="flex items-center gap-2 text-black">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/50 border-t-transparent" />
                        Refreshing…
                      </span>
                    ) : (
                      <span className="text-black">Refresh Status</span>
                    )}
                  </TactileButton>
                </div>
                {!supported ? (
                  <p className="text-xs text-black/60">
                    Health permissions are only available on the iOS or Android mobile app.
                  </p>
                ) : null}
              </CardContent>
            </Card>
          </Section>

          {error ? (
            <Section variant="plain" padding="none">
              <div className="rounded-3xl border border-warning/40 bg-warning-light/60 px-4 py-3 text-sm text-black">
                {error}
              </div>
            </Section>
          ) : null}

          <Section variant="plain" padding="none">
            <div className="rounded-3xl border border-border bg-card/80 backdrop-blur-sm">
              <div className="divide-y divide-border/60">
                {permissionList.map((permission) => {
                  const status = statuses[permission.id];
                  const pending = pendingKey === permission.id || pendingKey === "ALL";
                  const isEnabled = status === "granted";

                  return (
                    <ListItem
                      key={permission.id}
                      leading={<permission.icon size={18} />}
                      leadingClassName={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center",
                        permission.accent,
                      )}
                      primary={permission.title}
                      primaryClassName="text-sm font-semibold text-black"
                      secondary={permission.description}
                      secondaryClassName="text-xs text-black/60 mt-1"
                      trailing={
                        <div className="flex flex-col items-end gap-1">
                          <PermissionToggle
                            checked={isEnabled}
                            disabled={!supported}
                            loading={pending}
                            onCheckedChange={(next) => handleToggle(permission.id, next)}
                          />
                          <span className={cn("text-[11px] font-medium", STATUS_COLORS[status])}>
                            {STATUS_LABELS[status]}
                          </span>
                        </div>
                      }
                      className="px-4"
                    />
                  );
                })}
              </div>
            </div>
          </Section>

          <Section variant="plain" padding="none">
            <div className="space-y-3 rounded-3xl border border-dashed border-border bg-card/60 px-5 py-4 text-xs text-black/70">
              <p className="font-semibold uppercase tracking-[0.12em] text-black/70">App Explanation</p>
              <p>
                This app needs access to your movement and mindfulness data to personalize your plan, calculate daily activity,
                and surface insights that help you reach your goals.
              </p>
              <p className="text-black/60">
                You can turn off access anytime from Apple Health &gt; Access &amp; Devices &gt; Workout Tracker.
              </p>
            </div>
          </Section>
        </Stack>
      </div>
    </AppScreen>
  );
}

export default DeviceSettingsScreen;

