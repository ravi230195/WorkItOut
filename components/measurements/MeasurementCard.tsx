import { useState } from "react";
import ExpandingCard from "../ui/ExpandingCard";
import { Input } from "../ui/input";
import { Minus, Plus } from "lucide-react";

interface MeasurementHistoryEntry {
  date: string;
  value: string;
}

interface MeasurementCardProps {
  label: string;
  icon: React.ReactNode;
  unit?: string;
  initial?: string;
  history?: MeasurementHistoryEntry[]; // most recent first
}

export default function MeasurementCard({
  label,
  icon,
  unit = "cm",
  initial = "",
  history = [],
}: MeasurementCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [value, setValue] = useState(initial);
  const [past, setPast] = useState(history);

  const step = 0.5;
  const parse = (v: string) => {
    const n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  };
  const update = (delta: number) => {
    setValue((prev) => (parse(prev) + delta).toFixed(1));
  };

  const handleDec = (e: React.MouseEvent) => { e.stopPropagation(); update(-step); };
  const handleInc = (e: React.MouseEvent) => { e.stopPropagation(); update(step); };
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    setValue(e.target.value);
  };

  const handlePastChange = (idx: number, v: string) => {
    setPast((arr) => {
      const copy = [...arr];
      copy[idx] = { ...copy[idx], value: v };
      return copy;
    });
  };

  const diff = past[0] != null ? parse(value) - parse(past[0].value) : null;
  const diffText = diff != null ? `${diff >= 0 ? "+" : ""}${diff.toFixed(1)}${unit}` : undefined;

  return (
    <ExpandingCard
      variant="solid"
      size="lg"
      expanded={expanded}
      onToggle={() => setExpanded((v) => !v)}
      /* 50% title area */
      title={
        <div className="min-w-0 flex-[0_0_50%]">
          <div className="truncate">{label}</div>
        </div>
      }
      subtitle={diffText && <span className="text-sm text-warm-brown/60">{diffText}</span>}
      leading={<span className="text-xl">{icon}</span>}
      /* 40% controls, leave 10% for chevron via margin-right */
      trailing={
        <div
          className="flex-[0_0_40%] shrink-0 mr-[10%]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="grid grid-cols-[28px_minmax(3.5rem,1fr)_28px] items-center gap-2">
            <button
              type="button"
              onClick={handleDec}
              className="w-7 h-7 rounded-full bg-soft-gray flex items-center justify-center text-warm-brown"
            >
              <Minus size={14} />
            </button>

            <Input
              type="number"
              inputMode="decimal"
              pattern="[0-9]*[.,]?[0-9]*"
              step="0.5"
              min="0"
              value={value}
              onChange={handleChange}
              placeholder={unit}
              className="h-7 text-center px-1 w-full"
            />

            <button
              type="button"
              onClick={handleInc}
              className="w-7 h-7 rounded-full bg-soft-gray flex items-center justify-center text-warm-brown"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
      }
    >
      {past.length > 0 && (
        <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
          {past.slice(0, 4).map((p, i) => (
            <div key={i} className="flex items-center justify-between gap-2">
              <span className="text-sm text-warm-brown/60">{p.date}</span>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  inputMode="decimal"
                  pattern="[0-9]*[.,]?[0-9]*"
                  step="0.5"
                  min="0"
                  value={p.value}
                  onChange={(e) => handlePastChange(i, e.target.value)}
                  className="h-7 text-center px-1 w-[6.5rem] sm:w-[7.5rem]"
                />
                <span className="text-sm text-warm-brown">{unit}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </ExpandingCard>
  );
}
