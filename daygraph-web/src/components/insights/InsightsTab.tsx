import { useEffect, useState } from 'react'
import type { User } from 'firebase/auth'
import { getCorrelations } from '../../services/correlationService'
import type { CorrelationInsight, InsightsRangeDays } from '../../types'
import { useInsightsDailyStats } from '../../hooks/useInsightsDailyStats'
import { useLatestWeeklyStats } from '../../hooks/useLatestWeeklyStats'
import ErrorState from '../shared/ErrorState'
import EmptyState from '../shared/EmptyState'
import LoadingState from '../shared/LoadingState'
import DateRangeSelector from './DateRangeSelector'
import DailySummaryCard from './DailySummaryCard'
import MoodEnergyTrendChart from './MoodEnergyTrendChart'
import StreakCards from './StreakCards'
import TimeBreakdownChart from './TimeBreakdownChart'
import HealthCorrelationsPanel from './HealthCorrelationsPanel'

interface InsightsTabProps {
  user: User
}

function InsightsTab({ user }: InsightsTabProps) {
  const [rangeDays, setRangeDays] = useState<InsightsRangeDays>(30)
  const { stats, isLoading, errorMessage } = useInsightsDailyStats(
    user.uid,
    rangeDays,
  )
  const { stats: weeklyStats } = useLatestWeeklyStats(user.uid)
  const [correlations, setCorrelations] = useState<CorrelationInsight[]>([])
  const [isCorrelationLoading, setIsCorrelationLoading] = useState(true)
  const [correlationError, setCorrelationError] = useState<string | null>(null)

  useEffect(() => {
    let isCancelled = false

    const run = async () => {
      setIsCorrelationLoading(true)
      setCorrelationError(null)
      try {
        const result = await getCorrelations({ days: rangeDays })
        if (!isCancelled) {
          setCorrelations(result.correlations)
        }
      } catch (error) {
        console.error('Failed to load correlations:', error)
        if (!isCancelled) {
          setCorrelationError('Unable to compute correlations right now.')
          setCorrelations([])
        }
      } finally {
        if (!isCancelled) setIsCorrelationLoading(false)
      }
    }

    void run()
    return () => {
      isCancelled = true
    }
  }, [rangeDays])

  return (
    <main className="space-y-3 px-3 sm:space-y-4 sm:px-0">
      <DateRangeSelector onChange={setRangeDays} value={rangeDays} />
      {isLoading ? (
        <LoadingState
          message={`Computing your ${rangeDays}-day trends...`}
          title="Loading insights"
        />
      ) : null}
      {errorMessage ? (
        <ErrorState
          message={errorMessage}
          title="Insights are temporarily unavailable"
        />
      ) : null}
      {!isLoading && !errorMessage ? (
        stats.length === 0 ? (
          <EmptyState
            message="Add a few activities in Log to unlock trend insights."
            title="No insights yet"
          />
        ) : (
          <>
            <DailySummaryCard dailyStats={stats} rangeDays={rangeDays} />
            <TimeBreakdownChart dailyStats={stats} rangeDays={rangeDays} />
            <MoodEnergyTrendChart dailyStats={stats} rangeDays={rangeDays} />
            <HealthCorrelationsPanel
              correlations={correlations}
              errorMessage={correlationError}
              isLoading={isCorrelationLoading}
            />
            <StreakCards weeklyStats={weeklyStats} />
          </>
        )
      ) : null}
    </main>
  )
}

export default InsightsTab
