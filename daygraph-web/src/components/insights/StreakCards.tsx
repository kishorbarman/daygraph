import type { WeeklyStatsRecord } from '../../types'

interface StreakCardsProps {
  weeklyStats: WeeklyStatsRecord | null
}

function StreakCards({ weeklyStats }: StreakCardsProps) {
  const current = weeklyStats?.currentStreakDays ?? 0
  const best = weeklyStats?.bestStreakDays ?? 0

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <h3 className="text-base font-semibold text-slate-900">Streaks</h3>
        <p className="mt-1 text-sm text-slate-600">Steady consistency over competition</p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <article className="rounded-xl bg-slate-100 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Current</p>
          <p className="mt-1 text-xl font-semibold text-slate-900">{current} days</p>
        </article>

        <article className="rounded-xl bg-slate-100 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Best</p>
          <p className="mt-1 text-xl font-semibold text-slate-900">{best} days</p>
        </article>
      </div>
    </section>
  )
}

export default StreakCards
