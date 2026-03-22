import { useState } from 'react'
import type { User } from 'firebase/auth'
import type { InsightsRangeDays } from '../../types'
import { useInsightsDailyStats } from '../../hooks/useInsightsDailyStats'
import { useLatestWeeklyStats } from '../../hooks/useLatestWeeklyStats'
import ErrorState from '../shared/ErrorState'
import LoadingState from '../shared/LoadingState'
import DateRangeSelector from './DateRangeSelector'
import DailySummaryCard from './DailySummaryCard'
import MoodEnergyTrendChart from './MoodEnergyTrendChart'
import StreakCards from './StreakCards'
import TimeBreakdownChart from './TimeBreakdownChart'

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
        <>
          <DailySummaryCard dailyStats={stats} rangeDays={rangeDays} />
          <TimeBreakdownChart dailyStats={stats} rangeDays={rangeDays} />
          <MoodEnergyTrendChart dailyStats={stats} rangeDays={rangeDays} />
          <StreakCards weeklyStats={weeklyStats} />
        </>
      ) : null}
    </main>
  )
}

export default InsightsTab
