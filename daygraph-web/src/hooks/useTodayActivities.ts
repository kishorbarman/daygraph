import { useEffect, useMemo, useState } from 'react'
import {
  Timestamp,
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore'
import { db } from '../firebase'
import type { ActivityRecord } from '../types'
import { getTodayBounds } from '../utils/dateUtils'

interface UseTodayActivitiesResult {
  activities: ActivityRecord[]
  isLoading: boolean
  errorMessage: string | null
}

export function useTodayActivities(uid: string): UseTodayActivitiesResult {
  const [activities, setActivities] = useState<ActivityRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const { start, end } = useMemo(() => getTodayBounds(), [])

  useEffect(() => {
    const activitiesRef = collection(db, `users/${uid}/activities`)
    const activitiesQuery = query(
      activitiesRef,
      where('timestamp', '>=', Timestamp.fromDate(start)),
      where('timestamp', '<=', Timestamp.fromDate(end)),
      orderBy('timestamp', 'asc'),
    )

    const unsubscribe = onSnapshot(
      activitiesQuery,
      (snapshot) => {
        const nextActivities = snapshot.docs.map((docSnapshot) => ({
          id: docSnapshot.id,
          ...docSnapshot.data(),
        })) as ActivityRecord[]

        setActivities(nextActivities)
        setErrorMessage(null)
        setIsLoading(false)
      },
      (error) => {
        console.error('Failed to subscribe to today activities:', error)
        setErrorMessage('Unable to load today timeline right now.')
        setIsLoading(false)
      },
    )

    return () => unsubscribe()
  }, [end, start, uid])

  return { activities, isLoading, errorMessage }
}
