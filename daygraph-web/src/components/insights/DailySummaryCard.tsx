import type { DailyStatsRecord, InsightsRangeDays } from '../../types'
import { formatDateKey } from '../../utils/insightsDate'
import { computeDailySummary } from '../../utils/insightsMetrics'

interface DailySummaryCardProps {
  rangeDays: InsightsRangeDays
  dailyStats: DailyStatsRecord[]
}

function formatMinutes(value: number) {
  if (value <= 0) return '0m'
  const hours = Math.floor(value / 60)
  const minutes = value % 60
  if (hours === 0) return `${minutes}m`
  if (minutes === 0) return `${hours}h`
  return `${hours}h ${minutes}m`
}

function DailySummaryCard({ rangeDays, dailyStats }: DailySummaryCardProps) {
  const todayKey = formatDateKey(new Date())
  const summary = computeDailySummary(dailyStats, rangeDays, todayKey)

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Daily Summary</h3>
          <p className="mt-1 text-sm text-slate-600">Today vs {rangeDays}-day average</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <article className="rounded-xl bg-slate-100 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Active time</p>
          <p className="mt-1 text-xl font-semibold text-slate-900">
            {formatMinutes(summary.todayMinutes)}
          </p>
          <p className="mt-1 text-xs text-slate-600">
            {summary.minutesDelta >= 0 ? '+' : ''}
            {formatMinutes(Math.abs(summary.minutesDelta))} vs avg
          </p>
        </article>

        <article className="rounded-xl bg-slate-100 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Logs</p>
          <p className="mt-1 text-xl font-semibold text-slate-900">
            {summary.todayActivities}
          </p>
          <p className="mt-1 text-xs text-slate-600">
            {summary.activitiesDelta >= 0 ? '+' : ''}
            {summary.activitiesDelta} vs avg
          </p>
        </article>
      </div>
    </section>
  )
}

export default DailySummaryCard
