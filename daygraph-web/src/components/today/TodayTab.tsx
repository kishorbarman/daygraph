import { useEffect, useMemo, useState } from 'react'
import type { User } from 'firebase/auth'
import {
  createActivitiesFromPreview,
  createRawActivityInput,
  createPresetActivity,
  createSuggestedActivity,
  deleteActivityEntry,
  retryRawActivityInput,
  saveActivityMoodEnergy,
  saveActivityEdits,
} from '../../services/activityService'
import { parseActivityPreview } from '../../services/parseService'
import { dismissSuggestion, getSuggestion } from '../../services/suggestionService'
import type {
  ActivityRawRecord,
  ActivityCategory,
  ActivityRecord,
  ParseActivityPreviewResponse,
  Preset,
  SuggestionItem,
} from '../../types'
import { useTodayActivities } from '../../hooks/useTodayActivities'
import { useTodayRawQueue } from '../../hooks/useTodayRawQueue'
import { useActivityMonthDays } from '../../hooks/useActivityMonthDays'
import ActivityEditModal from './ActivityEditModal'
import InputBar from './InputBar'
import ParsePreviewModal from './ParsePreviewModal'
import PresetGrid from './PresetGrid'
import RawQueueStatus from './RawQueueStatus'
import Timeline from './Timeline'
import MoodEnergyPromptCard from './MoodEnergyPromptCard'
import SuggestionCard from './SuggestionCard'
import { formatDateKey } from '../../utils/insightsDate'
import { startOfDay } from '../../utils/dateUtils'

interface TodayTabProps {
  user: User
}

function getStorage() {
  if (
    typeof globalThis !== 'undefined' &&
    typeof globalThis.localStorage?.getItem === 'function' &&
    typeof globalThis.localStorage?.setItem === 'function'
  ) {
    return globalThis.localStorage
  }

  return null
}

function readDismissedSuggestionIds(storageKey: string) {
  const storage = getStorage()
  const raw = storage?.getItem(storageKey)
  if (!raw) return []

  try {
    return (JSON.parse(raw) as string[]).filter((item) => typeof item === 'string')
  } catch {
    return []
  }
}

function TodayTab({ user }: TodayTabProps) {
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()))
  const { activities, isLoading, errorMessage } = useTodayActivities(
    user.uid,
    selectedDate,
  )
  const { dayKeys: monthActivityDayKeys } = useActivityMonthDays(user.uid, selectedDate)
  const { rawItems } = useTodayRawQueue(user.uid)
  const [previewResult, setPreviewResult] =
    useState<ParseActivityPreviewResponse | null>(null)
  const [rawInput, setRawInput] = useState('')
  const [selectedActivity, setSelectedActivity] = useState<ActivityRecord | null>(
    null,
  )
  const [suggestion, setSuggestion] = useState<SuggestionItem | null>(null)
  const [promptRefreshKey, setPromptRefreshKey] = useState(0)

  const todayPromptStorageKey = useMemo(
    () => `daygraph:mood-prompt:${user.uid}:${formatDateKey(new Date())}`,
    [user.uid],
  )
  const suggestionDismissStorageKey = useMemo(
    () => `daygraph:suggestion-dismissed:${user.uid}`,
    [user.uid],
  )
  const isViewingToday = formatDateKey(selectedDate) === formatDateKey(new Date())

  const latestUnratedActivity = useMemo(
    () =>
      [...activities]
        .reverse()
        .find((item) => item.mood === null || item.energy === null) ?? null,
    [activities],
  )
  const dismissedForCount = (() => {
    void promptRefreshKey
    const storage = getStorage()
    const cached = storage?.getItem(todayPromptStorageKey)
    if (!cached) return -1
    try {
      const parsed = JSON.parse(cached) as { dismissedForCount?: number }
      return parsed.dismissedForCount ?? -1
    } catch {
      return -1
    }
  })()

  const shouldShowMoodPrompt =
    isViewingToday &&
    latestUnratedActivity !== null &&
    activities.length >= 3 &&
    activities.length % 3 === 0 &&
    dismissedForCount !== activities.length

  useEffect(() => {
    let isCancelled = false

    const run = async () => {
      if (!isViewingToday) {
        setSuggestion(null)
        return
      }
      const dismissedIds = readDismissedSuggestionIds(suggestionDismissStorageKey)

      try {
        const result = await getSuggestion({ dismissedIds })
        if (!isCancelled) {
          setSuggestion(result.suggestion)
        }
      } catch (error) {
        console.error('Failed to load suggestion:', error)
        if (!isCancelled) {
          setSuggestion(null)
        }
      }
    }

    void run()

    return () => {
      isCancelled = true
    }
  }, [activities.length, isViewingToday, suggestionDismissStorageKey])

  const handleTextLog = async (text: string) => {
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
      const preview = await parseActivityPreview({ text, timezone })
      setRawInput(text)
      setPreviewResult(preview)
    } catch (error) {
      console.error('Preview parsing unavailable, queueing raw input:', error)
      await createRawActivityInput({
        uid: user.uid,
        input: text,
        source: 'text',
      })
    }
  }

  const handlePresetLog = async (preset: Preset) => {
    await createPresetActivity(user.uid, preset)
  }

  const handlePreviewConfirm = async (drafts: ParseActivityPreviewResponse['parsed']) => {
    await createActivitiesFromPreview(user.uid, drafts, rawInput, 'text')
    setPreviewResult(null)
    setRawInput('')
  }

  const handleActivitySave = async (input: {
    activity: string
    category: ActivityCategory
    durationMinutes: number | null
    timestamp: Date
  }) => {
    if (!selectedActivity) return

    await saveActivityEdits({
      uid: user.uid,
      activityId: selectedActivity.id,
      previous: selectedActivity,
      next: input,
    })
    setSelectedActivity(null)
  }

  const handleActivityDelete = async () => {
    if (!selectedActivity) return
    await deleteActivityEntry(user.uid, selectedActivity.id)
    setSelectedActivity(null)
  }

  const handleRawRetry = async (item: ActivityRawRecord) => {
    await retryRawActivityInput(user.uid, item.id, item.input, item.source)
  }

  const handleMoodPromptDismiss = () => {
    const storage = getStorage()
    const cached = storage?.getItem(todayPromptStorageKey)
    let parsed: { dismissedForCount?: number } = {}
    if (cached) {
      try {
        parsed = JSON.parse(cached) as { dismissedForCount?: number }
      } catch {
        parsed = {}
      }
    }
    storage?.setItem(
      todayPromptStorageKey,
      JSON.stringify({ ...parsed, dismissedForCount: activities.length }),
    )
    setPromptRefreshKey((prev) => prev + 1)
  }

  const handleMoodPromptSave = async (input: { mood: number; energy: number }) => {
    if (!latestUnratedActivity) return

    await saveActivityMoodEnergy(
      user.uid,
      latestUnratedActivity.id,
      input.mood,
      input.energy,
    )
    setPromptRefreshKey((prev) => prev + 1)
  }

  const rememberSuggestionDismissed = (suggestionId: string) => {
    const storage = getStorage()
    const existing = readDismissedSuggestionIds(suggestionDismissStorageKey)

    if (existing.includes(suggestionId)) return

    storage?.setItem(
      suggestionDismissStorageKey,
      JSON.stringify([...existing, suggestionId].slice(-50)),
    )
  }

  const handleSuggestionDismiss = async (item: SuggestionItem) => {
    rememberSuggestionDismissed(item.id)
    setSuggestion(null)
    await dismissSuggestion(user.uid, item.id)
  }

  const handleSuggestionLogNow = async (item: SuggestionItem) => {
    await createSuggestedActivity(user.uid, item.activityDraft)
    await handleSuggestionDismiss(item)
  }

  return (
    <>
      <div className="space-y-3 sm:space-y-4">
        {suggestion ? (
          <SuggestionCard
            onDismiss={handleSuggestionDismiss}
            onLogNow={handleSuggestionLogNow}
            suggestion={suggestion}
          />
        ) : null}
        {shouldShowMoodPrompt && latestUnratedActivity ? (
          <MoodEnergyPromptCard
            onDismiss={handleMoodPromptDismiss}
            onSave={handleMoodPromptSave}
          />
        ) : null}
        {isViewingToday ? (
          <RawQueueStatus onRetry={handleRawRetry} rawItems={rawItems} />
        ) : null}
        <InputBar onSubmit={handleTextLog} />
        <PresetGrid onPresetClick={handlePresetLog} uid={user.uid} />
        <Timeline
          activityDateKeys={monthActivityDayKeys}
          activities={activities}
          errorMessage={errorMessage}
          isLoading={isLoading}
          onActivityClick={setSelectedActivity}
          onDateChange={setSelectedDate}
          selectedDate={selectedDate}
        />
      </div>
      {previewResult ? (
        <ParsePreviewModal
          confidence={previewResult.confidence}
          initialDrafts={previewResult.parsed}
          onCancel={() => setPreviewResult(null)}
          onConfirm={handlePreviewConfirm}
          rawInput={rawInput}
          warnings={previewResult.warnings}
        />
      ) : null}
      {selectedActivity ? (
        <ActivityEditModal
          activity={selectedActivity}
          onCancel={() => setSelectedActivity(null)}
          onDelete={handleActivityDelete}
          onSave={handleActivitySave}
        />
      ) : null}
    </>
  )
}

export default TodayTab
