import type { CSSProperties } from "react";

import type { TimeRange } from "@/types/progress";
import { PROGRESS_THEME } from "./util";
import { RANGE_OPTIONS, type RangeOption } from "./constants";

const RANGE_BUTTON_STYLE = (isActive: boolean): CSSProperties => ({
  backgroundColor: isActive ? PROGRESS_THEME.accentSecondary : "transparent",
  color: isActive ? "#ffffff" : PROGRESS_THEME.accentSecondary,
  border: `1px solid ${PROGRESS_THEME.accentSecondary}`,
  boxShadow: isActive ? PROGRESS_THEME.rangeButtonShadowActive : PROGRESS_THEME.rangeButtonShadow,
  transform: isActive ? "scale(1.05)" : "scale(1)",
  transition: "all 0.28s cubic-bezier(0.22, 0.61, 0.36, 1)",
  minWidth: 86,
});

interface RangeSelectorProps {
  range: TimeRange;
  onChange: (value: TimeRange) => void;
  options?: RangeOption[];
}

export function RangeSelector({ range, onChange, options = RANGE_OPTIONS }: RangeSelectorProps) {
  return (
    <section className="flex flex-wrap items-center justify-center gap-2 px-1 py-1">
      {options.map((option) => {
        const isActive = option.value === range;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={isActive}
            className="rounded-full px-4 py-2 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[rgba(30,36,50,0.2)] sm:text-sm"
            style={RANGE_BUTTON_STYLE(isActive)}
          >
            {option.label}
          </button>
        );
      })}
    </section>
  );
}
