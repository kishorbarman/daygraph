import type { FieldValue, Timestamp } from 'firebase/firestore'

export type AppTab = 'Today' | 'Insights' | 'Chat'

export type ActivitySource = 'text' | 'voice' | 'preset' | 'auto'

export type ActivityCategory =
  | 'meal'
  | 'caffeine'
  | 'sleep'
  | 'exercise'
  | 'social'
  | 'work'
  | 'leisure'
  | 'self_care'
  | 'errand'
  | 'transit'

export type FirestoreTimestamp = Timestamp | FieldValue

export interface UserProfileDoc {
  displayName: string
  email: string
  photoURL: string
  createdAt: FirestoreTimestamp
  lastActiveAt: FirestoreTimestamp
  timezone: string
}

export interface ActivityDoc {
  activity: string
  category: ActivityCategory
  subCategory: string
  timestamp: FirestoreTimestamp
  endTimestamp: FirestoreTimestamp | null
  durationMinutes: number | null
  isPointInTime: boolean
  tags: string[]
  mood: number | null
  energy: number | null
  notes: string
  source: ActivitySource
  rawInput: string
  createdAt: FirestoreTimestamp
  editedAt: FirestoreTimestamp | null
}

export interface ActivityRecord extends ActivityDoc {
  id: string
  timestamp: Timestamp
  endTimestamp: Timestamp | null
  createdAt: Timestamp
  editedAt: Timestamp | null
}

export interface Preset {
  id: string
  emoji: string
  label: string
  category: ActivityCategory
  subCategory?: string
  isPointInTime: boolean
  defaultDuration?: number
  usageCount: number
}

export interface ParsedActivityDraft {
  activity: string
  category: ActivityCategory
  subCategory: string
  timestamp: string
  endTimestamp: string | null
  durationMinutes: number | null
  isPointInTime: boolean
  tags: string[]
  quantity: number | null
  timezone: string
}

export interface ParseActivityPreviewResponse {
  parsed: ParsedActivityDraft[]
  confidence: number
  warnings: string[]
}

export interface ActivityRawRecord {
  id: string
  input: string
  source: ActivitySource
  status: 'pending' | 'parsed' | 'failed' | 'retried'
  errorMessage?: string
  parsedActivityIds?: string[]
  createdAt: Timestamp
  updatedAt?: Timestamp
}
