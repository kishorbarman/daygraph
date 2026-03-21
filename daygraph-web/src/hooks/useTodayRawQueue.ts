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
import type { ActivityRawRecord } from '../types'
import { getTodayBounds } from '../utils/dateUtils'

interface UseTodayRawQueueResult {
  rawItems: ActivityRawRecord[]
}

export function useTodayRawQueue(uid: string): UseTodayRawQueueResult {
  const [rawItems, setRawItems] = useState<ActivityRawRecord[]>([])
  const { start, end } = useMemo(() => getTodayBounds(), [])

  useEffect(() => {
    const rawRef = collection(db, `users/${uid}/activitiesRaw`)
    const rawQuery = query(
      rawRef,
      where('createdAt', '>=', Timestamp.fromDate(start)),
      where('createdAt', '<=', Timestamp.fromDate(end)),
      orderBy('createdAt', 'desc'),
    )

    const unsubscribe = onSnapshot(rawQuery, (snapshot) => {
      const nextRawItems = snapshot.docs.map((docSnapshot) => ({
        id: docSnapshot.id,
        ...docSnapshot.data(),
      })) as ActivityRawRecord[]

      setRawItems(
        nextRawItems.filter(
          (item) => item.status === 'failed' || item.status === 'pending',
        ),
      )
    })

    return () => unsubscribe()
  }, [end, start, uid])

  return { rawItems }
}
