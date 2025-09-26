import type { CSSProperties } from "react";

import type { TimeRange } from "@/types/progress";
import { PROGRESS_THEME } from "./util";
import { RANGE_OPTIONS, type RangeOption } from "./constants";

const RANGE_GROUP_STYLE: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: 4,
  borderRadius: 9999,
  backgroundColor: PROGRESS_THEME.cardBackground,
  border: `1px solid ${PROGRESS_THEME.borderSubtle}`,
  boxShadow: PROGRESS_THEME.rangeButtonShadow,
};

const RANGE_BUTTON_STYLE = (isActive: boolean): CSSProperties => ({
  backgroundColor: isActive ? PROGRESS_THEME.accentPrimary : "#FFFFFF",
  color: isActive ? "#FFFFFF" : PROGRESS_THEME.textPrimary,
  borderRadius: 9999,
  border: "none",
  boxShadow: isActive ? PROGRESS_THEME.rangeButtonShadowActive : "none",
  transform: isActive ? "translateY(-1px)" : "translateY(0)",
  transition: "all 0.24s cubic-bezier(0.4, 0, 0.2, 1)",
  minWidth: 60,
  padding: "8px 18px",
});

interface RangeSelectorProps {
  range: TimeRange;
  onChange: (value: TimeRange) => void;
  options?: RangeOption[];
}

export function RangeSelector({ range, onChange, options = RANGE_OPTIONS }: RangeSelectorProps) {
  return (
    <section className="flex w-full justify-end px-1 py-1">
      <div style={RANGE_GROUP_STYLE}>
        {options.map((option) => {
          const isActive = option.value === range;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              aria-pressed={isActive}
              className="rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[rgba(226,125,96,0.35)]"
              style={RANGE_BUTTON_STYLE(isActive)}
              data-testid={`progress-range-${option.value}`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
