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

export default function EditMeasurementsScreen({ onBack }: EditMeasurementsScreenProps) {
  const [values, setValues] = useState<Record<PartKey, string>>({} as Record<PartKey, string>);
  const [history, setHistory] = useState<Record<PartKey, { date: string; value: string }[]>>({} as Record<PartKey, { date: string; value: string }[]>);

  useEffect(() => {
    supabaseAPI.getBodyMeasurements(4).then((rows) => {
      const anyRows = rows as any[];
      const v: Record<string, string> = {};
      const h: Record<string, { date: string; value: string }[]> = {};
      measurementParts.forEach((part) => {
        v[part.key] = anyRows[0]?.[part.key] != null ? String(anyRows[0][part.key]) : "";
        h[part.key] = anyRows.slice(1).map((r) => ({
          date: r.measured_on,
          value: r[part.key] != null ? String(r[part.key]) : "",
        }));
      });
      setValues(v as Record<PartKey, string>);
      setHistory(h as Record<PartKey, { date: string; value: string }[]>);
    });
  }, []);

  const handleSave = async () => {
    const today = new Date().toISOString().split("T")[0];
    const payload: Record<string, any> = { measured_on: today };
    measurementParts.forEach((part) => {
      const num = parseFloat(values[part.key]);
      if (!isNaN(num)) payload[part.key] = num;
    });
    await supabaseAPI.upsertBodyMeasurement(payload);
    toast.success("Measurements saved");
    onBack();
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
              value={values[m.key] || ""}
              onValueChange={(v) => setValues((prev) => ({ ...prev, [m.key]: v }))}
              history={history[m.key] || []}
            />
          </div>
        ))}
        <Spacer y="sm" />
      </Stack>
    </AppScreen>
  );
}

