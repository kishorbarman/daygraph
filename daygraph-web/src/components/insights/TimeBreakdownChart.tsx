import type { ActivityCategory, DailyStatsRecord, InsightsRangeDays } from '../../types'
import { computeCategoryMinutes } from '../../utils/insightsMetrics'

interface TimeBreakdownChartProps {
  rangeDays: InsightsRangeDays
  dailyStats: DailyStatsRecord[]
}

const CATEGORY_META: Array<{
  key: ActivityCategory
  label: string
  color: string
}> = [
  { key: 'sleep', label: 'Sleep', color: 'bg-indigo-500' },
  { key: 'work', label: 'Work', color: 'bg-sky-500' },
  { key: 'exercise', label: 'Exercise', color: 'bg-emerald-500' },
  { key: 'meal', label: 'Meals', color: 'bg-amber-500' },
  { key: 'social', label: 'Social', color: 'bg-rose-500' },
  { key: 'leisure', label: 'Leisure', color: 'bg-violet-500' },
  { key: 'self_care', label: 'Self care', color: 'bg-teal-500' },
  { key: 'transit', label: 'Transit', color: 'bg-cyan-600' },
  { key: 'errand', label: 'Errands', color: 'bg-orange-500' },
  { key: 'caffeine', label: 'Caffeine', color: 'bg-stone-500' },
]

function formatMinutes(minutes: number) {
  if (minutes <= 0) return '0m'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function TimeBreakdownChart({ rangeDays, dailyStats }: TimeBreakdownChartProps) {
  const categoryMinutes = computeCategoryMinutes(dailyStats)
  const minutesByCategory = CATEGORY_META.map((item) => {
    const match = categoryMinutes.find((entry) => entry.category === item.key)
    const minutes = match?.minutes ?? 0

    return {
      ...item,
      minutes,
    }
  }).filter((item) => item.minutes > 0)

  const totalMinutes = minutesByCategory.reduce((sum, item) => sum + item.minutes, 0)

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Time Breakdown</h3>
          <p className="mt-1 text-sm text-slate-600">Category mix across last {rangeDays} days</p>
        </div>
        <p className="text-sm font-medium text-slate-700">{formatMinutes(totalMinutes)}</p>
      </div>

      <div className="mt-4 overflow-hidden rounded-full bg-slate-100">
        <div className="flex h-3 w-full">
          {minutesByCategory.length === 0 ? (
            <div className="h-3 w-full bg-slate-200" />
          ) : (
            minutesByCategory.map((item) => {
              const width = (item.minutes / totalMinutes) * 100
              return (
                <div
                  key={item.key}
                  aria-label={`${item.label} ${width.toFixed(0)} percent`}
                  className={item.color}
                  style={{ width: `${width}%` }}
                />
              )
            })
          )}
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {minutesByCategory.length === 0 ? (
          <p className="text-sm text-slate-500">No duration-based entries yet in this date range.</p>
        ) : (
          minutesByCategory.map((item) => {
            const percentage = (item.minutes / totalMinutes) * 100
            return (
              <div className="flex items-center justify-between text-sm" key={item.key}>
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                  <span className="text-slate-700">{item.label}</span>
                </div>
                <span className="font-medium text-slate-900">
                  {formatMinutes(item.minutes)} ({percentage.toFixed(0)}%)
                </span>
              </div>
            )
          })
        )}
      </div>
    </section>
  )
}

export default TimeBreakdownChart
