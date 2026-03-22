import { useEffect, useState } from 'react'
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '../firebase'
import type { WeeklyStatsRecord } from '../types'

interface UseLatestWeeklyStatsResult {
  stats: WeeklyStatsRecord | null
  isLoading: boolean
  errorMessage: string | null
}

export function useLatestWeeklyStats(uid: string): UseLatestWeeklyStatsResult {
  const [stats, setStats] = useState<WeeklyStatsRecord | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    const ref = collection(db, `users/${uid}/weeklyStats`)
    const q = query(ref, orderBy('weekStartDate', 'desc'), limit(1))

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const first = snapshot.docs[0]
        if (!first) {
          setStats(null)
        } else {
          setStats({
            id: first.id,
            ...first.data(),
          } as WeeklyStatsRecord)
        }

        setErrorMessage(null)
        setIsLoading(false)
      },
      (error) => {
        console.error('Failed to subscribe to weekly stats:', error)
        setErrorMessage('Unable to load streaks right now.')
        setIsLoading(false)
      },
    )

    return () => unsubscribe()
  }, [uid])

  return { stats, isLoading, errorMessage }
}
