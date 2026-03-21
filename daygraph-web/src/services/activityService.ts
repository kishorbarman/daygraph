import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../firebase'
import type {
  ActivityCategory,
  ActivityRecord,
  ActivitySource,
  ParsedActivityDraft,
  Preset,
} from '../types'

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

interface CreateRawActivityInput {
  uid: string
  input: string
  source: ActivitySource
}

interface SaveActivityEditsInput {
  uid: string
  activityId: string
  previous: ActivityRecord
  next: {
    activity: string
    category: ActivityCategory
    durationMinutes: number | null
  }
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

function createPayloadFromDraft(
  draft: ParsedActivityDraft,
  rawInput: string,
  source: ActivitySource,
) {
  const timestamp = new Date(draft.timestamp)
  const endTimestamp = draft.endTimestamp ? new Date(draft.endTimestamp) : null

  return {
    activity: draft.activity,
    category: draft.category,
    subCategory: draft.subCategory,
    timestamp,
    endTimestamp,
    durationMinutes: draft.durationMinutes,
    isPointInTime: draft.isPointInTime,
    tags: draft.tags ?? [],
    mood: null,
    energy: null,
    notes: rawInput,
    source,
    rawInput,
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

export async function createRawActivityInput({
  uid,
  input,
  source,
}: CreateRawActivityInput) {
  const trimmed = input.trim()
  if (!trimmed) return

  await addDoc(collection(db, `users/${uid}/activitiesRaw`), {
    input: trimmed,
    source,
    status: 'pending',
    parsedActivityIds: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function retryRawActivityInput(
  uid: string,
  rawId: string,
  input: string,
  source: ActivitySource,
) {
  const rawRef = doc(db, `users/${uid}/activitiesRaw/${rawId}`)

  await updateDoc(rawRef, {
    status: 'retried',
    updatedAt: serverTimestamp(),
  })

  await createRawActivityInput({ uid, input, source })
}

export async function createActivitiesFromPreview(
  uid: string,
  drafts: ParsedActivityDraft[],
  rawInput: string,
  source: ActivitySource = 'text',
) {
  if (drafts.length === 0) return

  const batch = writeBatch(db)
  const baseCollection = collection(db, `users/${uid}/activities`)

  for (const draft of drafts) {
    const ref = doc(baseCollection)
    batch.set(ref, createPayloadFromDraft(draft, rawInput, source))
  }

  await batch.commit()
}

export async function saveActivityEdits({
  uid,
  activityId,
  previous,
  next,
}: SaveActivityEditsInput) {
  const activityRef = doc(db, `users/${uid}/activities/${activityId}`)
  const timestamp = previous.timestamp.toDate()
  const endTimestamp =
    next.durationMinutes === null
      ? null
      : new Date(timestamp.getTime() + next.durationMinutes * 60_000)

  await updateDoc(activityRef, {
    activity: next.activity.trim() || previous.activity,
    category: next.category,
    subCategory:
      next.category === previous.category ? previous.subCategory : 'general',
    durationMinutes: next.durationMinutes,
    isPointInTime: next.durationMinutes === null,
    endTimestamp,
    editedAt: serverTimestamp(),
  })

  if (next.category !== previous.category) {
    await addDoc(collection(db, `users/${uid}/corrections`), {
      activityId,
      field: 'category',
      originalValue: previous.category,
      correctedValue: next.category,
      activityText: previous.activity,
      correctedCategory: next.category,
      createdAt: serverTimestamp(),
    })
  }
}

export async function deleteActivityEntry(uid: string, activityId: string) {
  const activityRef = doc(db, `users/${uid}/activities/${activityId}`)
  await deleteDoc(activityRef)
}
