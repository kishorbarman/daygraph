import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import type { ActivityCategory, ActivitySource, Preset } from '../types'

interface CreateManualActivityInput {
  uid: string
  activity: string
  category: ActivityCategory
  subCategory: string
  source: ActivitySource
  isPointInTime: boolean
  durationMinutes?: number
  tags?: string[]
}

function createBaseActivityPayload(input: CreateManualActivityInput) {
  const now = new Date()
  const duration =
    input.isPointInTime === true ? null : (input.durationMinutes ?? 30)

  const endTimestamp =
    duration === null ? null : new Date(now.getTime() + duration * 60_000)

  return {
    activity: input.activity,
    category: input.category,
    subCategory: input.subCategory,
    timestamp: now,
    endTimestamp,
    durationMinutes: duration,
    isPointInTime: input.isPointInTime,
    tags: input.tags ?? [],
    mood: null,
    energy: null,
    notes: input.activity,
    source: input.source,
    rawInput: input.activity,
    createdAt: serverTimestamp(),
    editedAt: null,
  }
}

export async function createManualTextActivity(uid: string, inputText: string) {
  const trimmed = inputText.trim()
  if (trimmed.length === 0) return

  await addDoc(
    collection(db, `users/${uid}/activities`),
    createBaseActivityPayload({
      uid,
      activity: trimmed,
      category: 'leisure',
      subCategory: 'general',
      source: 'text',
      isPointInTime: true,
    }),
  )
}

export async function createPresetActivity(uid: string, preset: Preset) {
  await addDoc(
    collection(db, `users/${uid}/activities`),
    createBaseActivityPayload({
      uid,
      activity: preset.label,
      category: preset.category,
      subCategory: preset.subCategory ?? preset.label.toLowerCase(),
      source: 'preset',
      isPointInTime: preset.isPointInTime,
      durationMinutes: preset.defaultDuration,
      tags: [],
    }),
  )
}

