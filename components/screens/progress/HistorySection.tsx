import type { CSSProperties } from "react";

import type {
  CardioHistoryEntry,
  HistoryEntry,
  StrengthHistoryEntry,
} from "../../progress/Progress.types";
import { PROGRESS_THEME, formatHistoryDate, normalizeActivity } from "./util";

type HistorySectionProps = {
  entries: HistoryEntry[];
  showLoading: boolean;
  onSelectStrength?: (entry: StrengthHistoryEntry) => void;
};

const HISTORY_SECTION_STYLE: CSSProperties = {
  borderColor: PROGRESS_THEME.cardBorder,
  boxShadow: PROGRESS_THEME.cardShadow,
};

const HISTORY_ITEM_BUTTON_STYLE: CSSProperties & { ["--tw-ring-color"]?: string } = {
  backgroundColor: PROGRESS_THEME.historyBackground,
  ["--tw-ring-color"]: PROGRESS_THEME.accentPrimaryFocusRing,
};

const HISTORY_ITEM_STYLE: CSSProperties = {
  backgroundColor: PROGRESS_THEME.historyBackground,
};

function HistorySection({ entries, showLoading, onSelectStrength }: HistorySectionProps) {
  return (
    <section className="rounded-3xl border bg-white p-5" style={HISTORY_SECTION_STYLE}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#111111]">History</h2>
        <span className="text-xs font-medium" style={{ color: PROGRESS_THEME.textSubtle }}>
          Latest to oldest
        </span>
      </div>
      {showLoading ? (
        <div className="mt-4 text-sm font-medium" style={{ color: PROGRESS_THEME.textMuted }}>
          Loading sample routines...
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {[...entries]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .map((entry) => {
              if (entry.type === "strength") {
                return (
                  <li key={entry.id}>{renderStrengthEntry(entry, onSelectStrength)}</li>
                );
              }

              return (
                <li
                  key={entry.id}
                  className="flex items-center justify-between rounded-2xl px-4 py-3"
                  style={HISTORY_ITEM_STYLE}
                >
                  {renderCardioEntry(entry)}
                </li>
              );
            })}
        </ul>
      )}
    </section>
  );
}

function renderStrengthEntry(entry: StrengthHistoryEntry, onSelectStrength?: (entry: StrengthHistoryEntry) => void) {
  const content = (
    <>
      <div>
        <p className="text-sm font-semibold text-[#111111]">{entry.name}</p>
        <p className="text-xs" style={{ color: PROGRESS_THEME.textMuted }}>
          {formatHistoryDate(entry.date)} · {entry.duration}
        </p>
      </div>
      <p className="text-sm font-semibold text-[#111111]">{entry.totalWeight}</p>
    </>
  );

  const canNavigate = typeof entry.routineTemplateId === "number" && Boolean(onSelectStrength);

  if (!canNavigate) {
    return (
      <div className="flex items-center justify-between rounded-2xl px-4 py-3" style={HISTORY_ITEM_STYLE}>
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSelectStrength?.(entry)}
      className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      style={HISTORY_ITEM_BUTTON_STYLE}
    >
      {content}
    </button>
  );
}

function renderCardioEntry(entry: CardioHistoryEntry) {
  return (
    <>
      <div>
        <p className="text-sm font-semibold text-[#111111]">{normalizeActivity(entry.activity)}</p>
        <p className="text-xs" style={{ color: PROGRESS_THEME.textMuted }}>
          {formatHistoryDate(entry.date)} · {entry.duration}
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold text-[#111111]">{entry.distance}</p>
        {entry.calories ? (
          <p className="text-xs" style={{ color: PROGRESS_THEME.textMuted }}>
            {entry.calories}
          </p>
        ) : null}
      </div>
    </>
  );
}

export { HistorySection };
