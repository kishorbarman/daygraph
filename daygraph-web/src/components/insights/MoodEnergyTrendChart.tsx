import type { DailyStatsRecord, InsightsRangeDays } from '../../types'
import { countMoodEnergyPoints } from '../../utils/insightsMetrics'

interface MoodEnergyTrendChartProps {
  rangeDays: InsightsRangeDays
  dailyStats: DailyStatsRecord[]
}

const MIN_DATA_POINTS = 4

function toY(value: number) {
  const clamped = Math.max(1, Math.min(5, value))
  const normalized = (clamped - 1) / 4
  return 100 - normalized * 100
}

function buildPath(points: Array<{ x: number; y: number }>) {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
}

function MoodEnergyTrendChart({ rangeDays, dailyStats }: MoodEnergyTrendChartProps) {
  const chartData = dailyStats.map((day, index) => ({
    x: dailyStats.length <= 1 ? 0 : (index / (dailyStats.length - 1)) * 100,
    date: day.date,
    mood: day.moodAverage,
    energy: day.energyAverage,
  }))

  const moodPoints = chartData
    .filter((item) => typeof item.mood === 'number')
    .map((item) => ({ x: item.x, y: toY(item.mood as number) }))

  const energyPoints = chartData
    .filter((item) => typeof item.energy === 'number')
    .map((item) => ({ x: item.x, y: toY(item.energy as number) }))

  const pointCounts = countMoodEnergyPoints(dailyStats)
  const hasEnoughData = pointCounts.totalPoints >= MIN_DATA_POINTS

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Mood + Energy Trend</h3>
          <p className="mt-1 text-sm text-slate-600">Last {rangeDays} days, scored 1 to 5</p>
        </div>
      </div>

      {!hasEnoughData ? (
        <p className="mt-4 rounded-xl bg-slate-100 p-3 text-sm text-slate-600">
          Trend appears after at least {MIN_DATA_POINTS} mood/energy ratings in this date range.
        </p>
      ) : (
        <>
          <div className="mt-4 rounded-xl border border-slate-200 p-3">
            <svg
              aria-label="Mood and energy trend chart"
              className="h-36 w-full"
              role="img"
              viewBox="0 0 100 100"
            >
              <line stroke="#e2e8f0" strokeDasharray="2 2" x1="0" x2="100" y1="25" y2="25" />
              <line stroke="#e2e8f0" strokeDasharray="2 2" x1="0" x2="100" y1="50" y2="50" />
              <line stroke="#e2e8f0" strokeDasharray="2 2" x1="0" x2="100" y1="75" y2="75" />

              {moodPoints.length > 1 ? (
                <path d={buildPath(moodPoints)} fill="none" stroke="#f43f5e" strokeWidth="2" />
              ) : null}
              {energyPoints.length > 1 ? (
                <path d={buildPath(energyPoints)} fill="none" stroke="#0ea5e9" strokeWidth="2" />
              ) : null}
            </svg>
          </div>

          <div className="mt-3 flex items-center gap-4 text-xs text-slate-600">
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
              Mood
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
              Energy
            </span>
          </div>
        </>
      )}
    </section>
  )
}

export default MoodEnergyTrendChart
