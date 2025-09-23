import type {
  ActivityCategory,
  TimeRange,
  MuscleGroup,
  SeriesPoint,
  KPI,
  WorkoutSummary,
  BestRecord,
} from '../../types/progress';
import { CardioProgressProvider } from '../../screen/progress/CardioProgress';
import { MockProgressProvider } from '../../screen/progress/MockData';
import { logger } from '../../../utils/logging';

type LoadParams = {
  category: ActivityCategory;
  timeRange: TimeRange;
  strengthFocus?: MuscleGroup;
  cardioFocus?: string;
};

type ProviderPayload = {
  series: SeriesPoint[];
  previousSeries: SeriesPoint[];
  kpis: KPI[];
  workouts: WorkoutSummary[];
  bestAll: BestRecord[];
  bestPeriod: BestRecord[];
  target?: number;
};

export type ProgressDetailData = ProviderPayload;

export type ProgressDetailLoadResult = {
  data: ProgressDetailData;
  usedFallback: boolean;
};

async function loadFromProvider(
  provider: typeof CardioProgressProvider | typeof MockProgressProvider,
  params: LoadParams,
): Promise<ProviderPayload> {
  const { category, timeRange, strengthFocus, cardioFocus } = params;
  const muscle = category === 'strength' ? strengthFocus : undefined;

  const [seriesData, previousSeriesData, kpiData, workoutsData, bestAllData, bestPeriodData, targetValue] =
    await Promise.all([
      provider.series({ category, range: timeRange, muscle, cardioFocus }),
      provider.previousSeries({ category, range: timeRange, muscle, cardioFocus }),
      provider.kpis({ category, range: timeRange, cardioFocus }),
      provider.recentWorkouts({ category, range: timeRange, limit: 6, cardioFocus }),
      provider.bestsAllTime({ category, cardioFocus }),
      provider.bestsInPeriod({ category, range: timeRange, cardioFocus }),
      provider.targetLine ? provider.targetLine({ category, range: timeRange, cardioFocus }) : Promise.resolve(undefined),
    ]);

  return {
    series: seriesData,
    previousSeries: previousSeriesData,
    kpis: kpiData,
    workouts: workoutsData,
    bestAll: bestAllData,
    bestPeriod: bestPeriodData,
    target: targetValue ?? undefined,
  };
}

export async function loadProgressDetailData(params: LoadParams): Promise<ProgressDetailLoadResult> {
  const provider = params.category === 'cardio' ? CardioProgressProvider : MockProgressProvider;

  try {
    const data = await loadFromProvider(provider, params);
    return { data, usedFallback: false };
  } catch (error) {
    logger.warn('[progress] failed to load live progress data', error);

    if (provider === MockProgressProvider) {
      throw error;
    }

    const fallback = await loadFromProvider(MockProgressProvider, params);
    return { data: fallback, usedFallback: true };
  }
}
