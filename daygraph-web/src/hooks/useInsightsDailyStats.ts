import { useEffect, useMemo, useState } from 'react'
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore'
import { db } from '../firebase'
import type { DailyStatsRecord, InsightsRangeDays } from '../types'
import { getRangeDateKeys } from '../utils/insightsDate'

interface UseInsightsDailyStatsResult {
  stats: DailyStatsRecord[]
  isLoading: boolean
  errorMessage: string | null
}

export function useInsightsDailyStats(
  uid: string,
  rangeDays: InsightsRangeDays,
): UseInsightsDailyStatsResult {
  const [stats, setStats] = useState<DailyStatsRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const { startDateKey, endDateKey } = useMemo(
    () => getRangeDateKeys(rangeDays),
    [rangeDays],
  )

  useEffect(() => {
    const ref = collection(db, `users/${uid}/dailyStats`)
    const statsQuery = query(
      ref,
      where('date', '>=', startDateKey),
      where('date', '<=', endDateKey),
      orderBy('date', 'asc'),
    )

    const unsubscribe = onSnapshot(
      statsQuery,
      (snapshot) => {
        const nextStats = snapshot.docs.map((docSnapshot) => ({
          id: docSnapshot.id,
          ...docSnapshot.data(),
        })) as DailyStatsRecord[]

        setStats(nextStats)
        setErrorMessage(null)
        setIsLoading(false)
      },
      (error) => {
        console.error('Failed to subscribe to insights daily stats:', error)
        setErrorMessage('Unable to load insights right now.')
        setIsLoading(false)
      },
    )

    return () => unsubscribe()
  }, [uid, startDateKey, endDateKey])

  return { stats, isLoading, errorMessage }
}
