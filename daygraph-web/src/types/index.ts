import type { FieldValue, Timestamp } from 'firebase/firestore'

export type AppTab = 'Today' | 'Insights' | 'Chat'
export type InsightsRangeDays = 7 | 30 | 90

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

export interface DailyStatsDoc {
  date: string
  timezone: string
  totalActivities: number
  totalMinutes: number
  pointInTimeCount: number
  categoryCounts: Record<ActivityCategory, number>
  categoryMinutes: Record<ActivityCategory, number>
  moodCount: number
  moodAverage: number | null
  energyCount: number
  energyAverage: number | null
  updatedAt?: FirestoreTimestamp
}

export interface DailyStatsRecord extends DailyStatsDoc {
  id: string
}

export interface WeeklyStatsDoc {
  weekStartDate: string
  weekEndDate: string
  timezone: string
  totalActivities: number
  totalMinutes: number
  daysTracked: number
  averageDailyActivities: number
  averageDailyMinutes: number
  moodAverage: number | null
  energyAverage: number | null
  categoryCounts: Record<ActivityCategory, number>
  categoryMinutes: Record<ActivityCategory, number>
  currentStreakDays: number
  bestStreakDays: number
  updatedAt?: FirestoreTimestamp
}

export interface WeeklyStatsRecord extends WeeklyStatsDoc {
  id: string
}

export type ChatRole = 'user' | 'assistant'

export interface ChatChartSeries {
  name: string
  values: number[]
}

export interface ChatChartConfig {
  type: 'line' | 'bar'
  title: string
  labels: string[]
  series: ChatChartSeries[]
}

export interface ChatGroundedFrom {
  tier: string
  activities: number
  dailyStats: number
  weeklyStats: number
  model: string
}

export interface GetChatResponseInput {
  message: string
  sessionId?: string
  deepResearch?: boolean
}

export interface GetChatResponseOutput {
  sessionId: string
  answer: string
  confidence: 'low' | 'medium' | 'high'
  suggestedFollowups: string[]
  chart: ChatChartConfig | null
  groundedFrom: ChatGroundedFrom
  latencyMs: number
}

export interface ChatMessage {
  id: string
  role: ChatRole
  text: string
  createdAt: number
  confidence?: 'low' | 'medium' | 'high'
  chart?: ChatChartConfig | null
  followups?: string[]
}

export interface SuggestionDraftActivity {
  activity: string
  category: ActivityCategory
  subCategory: string
  isPointInTime: boolean
  durationMinutes: number | null
}

export interface SuggestionItem {
  id: string
  title: string
  reason: string
  actionText: string
  activityDraft: SuggestionDraftActivity
}

export interface GetSuggestionInput {
  dismissedIds: string[]
}

export interface GetSuggestionOutput {
  suggestion: SuggestionItem | null
}
