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
import {
  sanitizeActivitySource,
  sanitizeActivityText,
  sanitizeCategory,
  sanitizeDurationMinutes,
  sanitizeMoodEnergyScore,
  sanitizeRawInput,
  sanitizeSubCategory,
  sanitizeTags,
} from './inputGuards'
import type {
  ActivityCategory,
  ActivityRecord,
  ActivitySource,
  ParsedActivityDraft,
  Preset,
  SuggestionDraftActivity,
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
    timestamp: Date
  }
}

function createBaseActivityPayload(input: CreateManualActivityInput) {
  const now = new Date()
  const duration =
    input.isPointInTime === true
      ? null
      : (sanitizeDurationMinutes(input.durationMinutes ?? 30) ?? 30)
  const activity = sanitizeActivityText(input.activity)
  const category = sanitizeCategory(input.category)
  const subCategory =
    sanitizeSubCategory(input.subCategory || activity.toLowerCase()) || 'general'
  const source = sanitizeActivitySource(input.source)

  const endTimestamp =
    duration === null ? null : new Date(now.getTime() + duration * 60_000)

  return {
    activity,
    category,
    subCategory,
    timestamp: now,
    endTimestamp,
    durationMinutes: duration,
    isPointInTime: input.isPointInTime,
    tags: sanitizeTags(input.tags),
    mood: null,
    energy: null,
    notes: sanitizeRawInput(input.activity),
    source,
    rawInput: sanitizeRawInput(input.activity),
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
  const activity = sanitizeActivityText(draft.activity)
  const raw = sanitizeRawInput(rawInput)

  return {
    activity,
    category: sanitizeCategory(draft.category),
    subCategory: sanitizeSubCategory(draft.subCategory) || 'general',
    timestamp,
    endTimestamp,
    durationMinutes: sanitizeDurationMinutes(draft.durationMinutes),
    isPointInTime: draft.isPointInTime !== false
      ? sanitizeDurationMinutes(draft.durationMinutes) === null
      : false,
    tags: sanitizeTags(draft.tags),
    mood: null,
    energy: null,
    notes: raw,
    source: sanitizeActivitySource(source),
    rawInput: raw,
    createdAt: serverTimestamp(),
    editedAt: null,
  }
}

export async function createManualTextActivity(uid: string, inputText: string) {
  const trimmed = sanitizeActivityText(inputText)
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
  const trimmed = sanitizeRawInput(input)
  if (!trimmed) return

  await addDoc(collection(db, `users/${uid}/activitiesRaw`), {
    input: trimmed,
    source: sanitizeActivitySource(source),
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

  await createRawActivityInput({ uid, input, source: sanitizeActivitySource(source) })
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
  const timestamp = next.timestamp
  const sanitizedDuration = sanitizeDurationMinutes(next.durationMinutes)
  const endTimestamp =
    sanitizedDuration === null
      ? null
      : new Date(timestamp.getTime() + sanitizedDuration * 60_000)
  const sanitizedActivity = sanitizeActivityText(next.activity) || previous.activity
  const sanitizedCategory = sanitizeCategory(next.category) || previous.category

  await updateDoc(activityRef, {
    activity: sanitizedActivity,
    category: sanitizedCategory,
    subCategory:
      sanitizedCategory === previous.category ? previous.subCategory : 'general',
    durationMinutes: sanitizedDuration,
    isPointInTime: sanitizedDuration === null,
    timestamp,
    endTimestamp,
    editedAt: serverTimestamp(),
  })

  if (sanitizedCategory !== previous.category) {
    await addDoc(collection(db, `users/${uid}/corrections`), {
      activityId,
      field: 'category',
      originalValue: previous.category,
      correctedValue: sanitizedCategory,
      activityText: sanitizeActivityText(previous.activity) || previous.activity,
      correctedCategory: sanitizedCategory,
      createdAt: serverTimestamp(),
    })
  }
}

export async function deleteActivityEntry(uid: string, activityId: string) {
  const activityRef = doc(db, `users/${uid}/activities/${activityId}`)
  await deleteDoc(activityRef)
}

export async function saveActivityMoodEnergy(
  uid: string,
  activityId: string,
  mood: number,
  energy: number,
) {
  const activityRef = doc(db, `users/${uid}/activities/${activityId}`)
  const sanitizedMood = sanitizeMoodEnergyScore(mood)
  const sanitizedEnergy = sanitizeMoodEnergyScore(energy)

  await updateDoc(activityRef, {
    mood: sanitizedMood,
    energy: sanitizedEnergy,
    editedAt: serverTimestamp(),
  })
}

export async function createSuggestedActivity(
  uid: string,
  draft: SuggestionDraftActivity,
) {
  await addDoc(
    collection(db, `users/${uid}/activities`),
    createBaseActivityPayload({
      uid,
      activity: draft.activity,
      category: draft.category,
      subCategory: draft.subCategory,
      source: 'auto',
      isPointInTime: draft.isPointInTime,
      durationMinutes:
        typeof draft.durationMinutes === 'number' ? draft.durationMinutes : undefined,
      tags: ['suggestion'],
    }),
  )
}
