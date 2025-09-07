export type MeasurementJournalAction = {
  t: "UPDATE";
  date: string;
  key: string;
  value: string;
};

export type MeasurementJournal = MeasurementJournalAction[];

export function makeMeasurementJournal(): MeasurementJournal {
  return [];
}

export function recordMeasurementUpdate(
  journal: MeasurementJournal,
  date: string,
  key: string,
  value: string
) {
  journal.push({ t: "UPDATE", date, key, value });
}

export function measurementJournalIsNoop(journal: MeasurementJournal): boolean {
  return journal.length === 0;
}

export function collapseMeasurementJournal(
  journal: MeasurementJournal
): Record<string, Record<string, string>> {
  const byDate: Record<string, Record<string, string>> = {};
  for (const action of journal) {
    if (!byDate[action.date]) byDate[action.date] = {};
    byDate[action.date][action.key] = action.value;
  }
  return byDate;
}
