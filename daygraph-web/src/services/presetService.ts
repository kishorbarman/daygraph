import {
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'
import { db } from '../firebase'
import type { Preset } from '../types'
import { sanitizePresetList } from './inputGuards'

export const DEFAULT_PRESETS: Preset[] = [
  {
    id: 'coffee',
    emoji: '☕',
    label: 'Coffee',
    category: 'caffeine',
    subCategory: 'coffee',
    isPointInTime: true,
    usageCount: 0,
  },
  {
    id: 'breakfast',
    emoji: '🍳',
    label: 'Breakfast',
    category: 'meal',
    subCategory: 'breakfast',
    isPointInTime: true,
    usageCount: 0,
  },
  {
    id: 'lunch',
    emoji: '🍽️',
    label: 'Lunch',
    category: 'meal',
    subCategory: 'lunch',
    isPointInTime: true,
    usageCount: 0,
  },
  {
    id: 'dinner',
    emoji: '🍲',
    label: 'Dinner',
    category: 'meal',
    subCategory: 'dinner',
    isPointInTime: true,
    usageCount: 0,
  },
  {
    id: 'walk',
    emoji: '🚶',
    label: 'Walk',
    category: 'exercise',
    subCategory: 'walk',
    isPointInTime: false,
    defaultDuration: 20,
    usageCount: 0,
  },
  {
    id: 'workout',
    emoji: '🏋️',
    label: 'Workout',
    category: 'exercise',
    subCategory: 'workout',
    isPointInTime: false,
    defaultDuration: 45,
    usageCount: 0,
  },
]

export function subscribeUserPresets(
  uid: string,
  onData: (presets: Preset[]) => void,
  onError: (error: unknown) => void,
) {
  const ref = doc(db, `users/${uid}/appConfig/presets`)
  return onSnapshot(
    ref,
    (snapshot) => {
      const raw = snapshot.data()?.items
      if (!Array.isArray(raw) || raw.length === 0) {
        onData(DEFAULT_PRESETS.slice(0, 4))
        return
      }

      const parsed = raw
        .map((item) => {
          if (!item || typeof item !== 'object') return null
          const candidate = item as Preset
          if (typeof candidate.id !== 'string' || typeof candidate.label !== 'string') {
            return null
          }
          return {
            ...candidate,
            usageCount: typeof candidate.usageCount === 'number' ? candidate.usageCount : 0,
          } as Preset
        })
        .filter(Boolean) as Preset[]

      onData(parsed.length > 0 ? parsed : DEFAULT_PRESETS.slice(0, 4))
    },
    onError,
  )
}

export async function saveUserPresets(uid: string, presets: Preset[]) {
  const sanitized = sanitizePresetList(presets)

  await setDoc(
    doc(db, `users/${uid}/appConfig/presets`),
    {
      items: sanitized,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
}
