import { AppScreen, ScreenHeader, Section, Stack, Spacer } from "../layouts";
import { BottomNavigation } from "../BottomNavigation";
import { BottomNavigationButton } from "../BottomNavigationButton";
import { toast } from "sonner";
import { TrendingUp } from "lucide-react";
import MeasurementCard from "../measurements/MeasurementCard";
import { useEffect, useState } from "react";
import { supabaseAPI } from "../../utils/supabase/supabase-api";

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
  const loadEntries = async () => {
    const rows = await supabaseAPI.getBodyMeasurements(4);
    const today = new Date().toISOString().split("T")[0];
    let data = rows as any[];
    if (data[0]?.measured_on !== today) {
      data = [{ measured_on: today }, ...data];
    }
    data = data.slice(0, 4);
    const mapped = data.map((r) => {
      const obj: any = { measured_on: r.measured_on };
      measurementParts.forEach((part) => {
        obj[part.key] = r[part.key] != null ? String(r[part.key]) : "";
      });
      return obj as MeasurementEntry;
    });
    setEntries(mapped);
  };

  useEffect(() => {
    loadEntries();
  }, []);

  const handleSave = async () => {
    // regroup by date and upsert each row
    for (const row of entries) {
      const payload: Record<string, any> = { measured_on: row.measured_on };
      measurementParts.forEach((part) => {
        const num = parseFloat(row[part.key]);
        if (!isNaN(num)) payload[part.key] = num;
      });
      // skip if no measurements entered
      if (Object.keys(payload).length > 1) {
        await supabaseAPI.upsertBodyMeasurement(payload);
      }
    }
    await loadEntries();
    toast.success("Measurements saved");
  };

  return (
    <AppScreen
      header={<ScreenHeader title="Body Measurements" onBack={onBack} showBorder={false} denseSmall contentHeightPx={74} titleClassName="text-[17px] font-bold" />}
      maxContent="responsive"
      padContent={false}
      showHeaderBorder={false}
      showBottomBarBorder={false}
      bottomBar={
        <BottomNavigation>
          <BottomNavigationButton
            onClick={handleSave}
            className="px-6 md:px-8 font-medium border-0 transition-all bg-primary hover:bg-primary-hover text-primary-foreground btn-tactile"
          >
            SAVE CHANGES
          </BottomNavigationButton>
        </BottomNavigation>
      }
      bottomBarSticky
      contentClassName=""
    >
      <Stack gap="fluid">
        <Section variant="card" padding="md" className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-soft-gray flex items-center justify-center shrink-0">
            <TrendingUp className="text-warm-brown" size={20} />
          </div>
          <div className="min-w-0">
            <div className="text-base font-semibold text-warm-brown truncate">Track Your Progress</div>
            <div className="text-sm text-warm-brown/60 truncate">Record measurements to see changes over time</div>
          </div>
        </Section>
        <Spacer y="sm" />
        {measurementParts.map((m) => (
          <div key={m.key} className="space-y-2">
            <MeasurementCard
              label={m.label}
              icon={m.icon}
              entries={entries.map((e) => ({ date: e.measured_on, value: e[m.key] || "" }))}
              onEntryChange={(index, value) =>
                setEntries((prev) => {
                  const next = [...prev];
                  next[index] = { ...next[index], [m.key]: value };
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

