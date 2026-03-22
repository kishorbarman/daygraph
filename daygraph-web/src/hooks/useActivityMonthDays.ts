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
import { formatDateKey } from '../utils/insightsDate'
import { getMonthBounds } from '../utils/dateUtils'

export function useActivityMonthDays(uid: string, monthDate: Date) {
  const [dayKeys, setDayKeys] = useState<string[]>([])

  const monthStart = useMemo(
    () => new Date(monthDate.getFullYear(), monthDate.getMonth(), 1),
    [monthDate],
  )
  const { start, end } = useMemo(() => getMonthBounds(monthStart), [monthStart])

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
        const unique = new Set<string>()

        for (const docSnapshot of snapshot.docs) {
          const rawTimestamp = docSnapshot.data().timestamp
          if (!rawTimestamp || typeof rawTimestamp.toDate !== 'function') continue
          unique.add(formatDateKey(rawTimestamp.toDate()))
        }

        setDayKeys([...unique])
      },
      (error) => {
        console.error('Failed to subscribe to activity month days:', error)
        setDayKeys([])
      },
    )

    return () => unsubscribe()
  }, [end, start, uid])

  return { dayKeys }
}
