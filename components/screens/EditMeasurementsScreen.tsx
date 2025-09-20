import { AppScreen, ScreenHeader, Section, Stack, Spacer } from "../layouts";
import { BottomNavigation } from "../BottomNavigation";
import { BottomNavigationButton } from "../BottomNavigationButton";
import { toast } from "sonner";
import MeasurementCard from "../measurements/MeasurementCard";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabaseAPI, type UnitLength } from "../../utils/supabase/supabase-api";
import {
  collapseMeasurementJournal,
  makeMeasurementJournal,
  recordMeasurementUpdate,
} from "../measurements/measurementJournal";
import { logger } from "../../utils/logging";
import {
  DEFAULT_LENGTH_UNIT,
  formatLength,
  getLengthUnitLabel,
  normalizeLengthUnit,
  parseLengthInput,
} from "../../utils/unitConversion";

interface EditMeasurementsScreenProps {
  onBack: () => void;
}

const measurementParts = [
  { key: "chest_cm", label: "Chest", icon: "🫁" },
  { key: "right_arm_cm", label: "Right Arm", icon: "💪" },
  { key: "left_arm_cm", label: "Left Arm", icon: "💪" },
  { key: "waist_cm", label: "Waist", icon: "📏" },
  { key: "hip_cm", label: "Hip", icon: "🩳" },
  { key: "glutes_cm", label: "Glutes", icon: "🍑" },
  { key: "left_quad_cm", label: "Left Quad", icon: "🦵" },
  { key: "right_quad_cm", label: "Right Quad", icon: "🦵" },
  { key: "left_calf_cm", label: "Left Calf", icon: "🦵" },
  { key: "right_calf_cm", label: "Right Calf", icon: "🦵" },
] as const;

type PartKey = typeof measurementParts[number]["key"];

type MeasurementEntry = { measured_on: string } & Record<PartKey, string>;

export default function EditMeasurementsScreen({ onBack }: EditMeasurementsScreenProps) {
  const [entries, setEntries] = useState<MeasurementEntry[]>([]);
  const [hasTodayEntry, setHasTodayEntry] = useState(true);
  const [lengthUnit, setLengthUnit] = useState<UnitLength>(DEFAULT_LENGTH_UNIT);
  const journalRef = useRef(makeMeasurementJournal());
  const savedSnapshotRef = useRef<MeasurementEntry[]>([]);
  const loadEntries = useCallback(async (unit: UnitLength) => {
    const rows = await supabaseAPI.getBodyMeasurements(4);
    const today = new Date().toISOString().split("T")[0];
    const existingToday = rows.some((r) => r.measured_on === today);
    let data = rows as any[];
    if (!existingToday) {
      const last = rows[0];
      const newRow: any = { measured_on: today };
      measurementParts.forEach((part) => {
        newRow[part.key] =
          last && last[part.key] != null
            ? formatLength(Number(last[part.key]), unit)
            : "";
      });
      data = [newRow, ...rows];
    }
    data = data
      .sort(
        (a, b) =>
          new Date(b.measured_on).getTime() - new Date(a.measured_on).getTime()
      )
      .slice(0, 4);
    const mapped = data.map((r) => {
      const obj: any = { measured_on: r.measured_on };
      measurementParts.forEach((part) => {
        obj[part.key] =
          r[part.key] != null ? formatLength(Number(r[part.key]), unit) : "";
      });
      return obj as MeasurementEntry;
    });
    savedSnapshotRef.current = JSON.parse(JSON.stringify(mapped));
    journalRef.current = makeMeasurementJournal();
    setEntries(mapped);
    setHasTodayEntry(existingToday);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchUnitsAndEntries = async () => {
      try {
        const profile = await supabaseAPI.getMyProfile();
        if (cancelled) return;
        const preferredUnit = normalizeLengthUnit(profile?.length_unit);
        setLengthUnit(preferredUnit);
        await loadEntries(preferredUnit);
      } catch (error) {
        logger.error("Failed to load measurement preferences", error);
        if (!cancelled) {
          setLengthUnit(DEFAULT_LENGTH_UNIT);
          await loadEntries(DEFAULT_LENGTH_UNIT);
        }
      } finally {
        // no-op
      }
    };

    fetchUnitsAndEntries();

    return () => {
      cancelled = true;
    };
  }, [loadEntries]);

  const handleSave = async () => {
    const collapsed = collapseMeasurementJournal(journalRef.current);
    if (!hasTodayEntry) {
      const todayEntry = entries[0];
      const entryPayload: Record<string, string> = {};
      measurementParts.forEach((part) => {
        if (todayEntry[part.key]) entryPayload[part.key] = todayEntry[part.key];
      });
      collapsed[todayEntry.measured_on] = {
        ...(collapsed[todayEntry.measured_on] ?? {}),
        ...entryPayload,
      };
    }
    for (const [date, parts] of Object.entries(collapsed)) {
      const payload: Record<string, any> = { measured_on: date };
      for (const [key, value] of Object.entries(parts)) {
        const parsed = parseLengthInput(value, lengthUnit);
        if (parsed !== undefined && !isNaN(parsed)) payload[key] = parsed;
      }
      if (Object.keys(payload).length > 1) {
        await supabaseAPI.upsertBodyMeasurement(payload as any);
      }
    }
    journalRef.current = makeMeasurementJournal();
    await loadEntries(lengthUnit);
    toast.success("Measurements saved");
    onBack();
  };

  const hasChanges = useMemo(
    () =>
      !hasTodayEntry ||
      JSON.stringify(entries) !== JSON.stringify(savedSnapshotRef.current),
    [entries, hasTodayEntry]
  );

  return (
    <AppScreen
      header={<ScreenHeader title="Body Measurements" onBack={onBack} 
      showBorder={false} 
      denseSmall 
      titleClassName="text-[17px] font-bold" />}
      maxContent="responsive"
      padContent={false}
      showHeaderBorder={false}
      showBottomBarBorder={false}
      bottomBar={
        <BottomNavigation>
          <BottomNavigationButton
            onClick={handleSave}
            disabled={!hasChanges}
          >
            SAVE CHANGES
          </BottomNavigationButton>
        </BottomNavigation>
      }
      bottomBarSticky
      contentClassName=""
    >
      <Stack gap="fluid">
        <Section variant="card" className="flex items-center gap-3">
          <div className="min-w-0">
            <div className="text-base font-semibold text-black truncate">Track Your Progress</div>
            <div className="text-sm text-black truncate">Record measurements to see changes over time</div>
          </div>
        </Section>
        <Spacer y="sm" />
        {measurementParts.map((m) => (
          <div key={m.key} className="space-y-2">
            <MeasurementCard
              label={m.label}
              icon={m.icon}
              unit={getLengthUnitLabel(lengthUnit)}
              entries={entries.map((e) => ({ date: e.measured_on, value: e[m.key] || "" }))}
              onEntryChange={(index, value) =>
                setEntries((prev) => {
                  const next = [...prev];
                  const date = next[index].measured_on;
                  const normalized = value === "" ? "" : String(parseFloat(value));
                  next[index] = { ...next[index], [m.key]: normalized };
                  recordMeasurementUpdate(
                    journalRef.current,
                    date,
                    m.key,
                    normalized
                  );
                  return next;
                })
              }
            />
          </div>
        ))}
        <Spacer y="sm" />
      </Stack>
    </AppScreen>
  );
}

