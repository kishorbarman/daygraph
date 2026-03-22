import { useMemo, useState } from 'react'
import type { User } from 'firebase/auth'
import {
  createActivitiesFromPreview,
  createRawActivityInput,
  createPresetActivity,
  deleteActivityEntry,
  retryRawActivityInput,
  saveActivityMoodEnergy,
  saveActivityEdits,
} from '../../services/activityService'
import { parseActivityPreview } from '../../services/parseService'
import type {
  ActivityRawRecord,
  ActivityCategory,
  ActivityRecord,
  ParseActivityPreviewResponse,
  Preset,
} from '../../types'
import { useTodayActivities } from '../../hooks/useTodayActivities'
import { useTodayRawQueue } from '../../hooks/useTodayRawQueue'
import ActivityEditModal from './ActivityEditModal'
import InputBar from './InputBar'
import ParsePreviewModal from './ParsePreviewModal'
import PresetGrid from './PresetGrid'
import RawQueueStatus from './RawQueueStatus'
import Timeline from './Timeline'
import MoodEnergyPromptCard from './MoodEnergyPromptCard'
import { formatDateKey } from '../../utils/insightsDate'

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

function TodayTab({ user }: TodayTabProps) {
  const { activities, isLoading, errorMessage } = useTodayActivities(user.uid)
  const { rawItems } = useTodayRawQueue(user.uid)
  const [previewResult, setPreviewResult] =
    useState<ParseActivityPreviewResponse | null>(null)
  const [rawInput, setRawInput] = useState('')
  const [selectedActivity, setSelectedActivity] = useState<ActivityRecord | null>(
    null,
  )
  const [promptRefreshKey, setPromptRefreshKey] = useState(0)

  const todayPromptStorageKey = useMemo(
    () => `daygraph:mood-prompt:${user.uid}:${formatDateKey(new Date())}`,
    [user.uid],
  )

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
    latestUnratedActivity !== null &&
    activities.length >= 3 &&
    activities.length % 3 === 0 &&
    dismissedForCount !== activities.length

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

  return (
    <>
      <div className="space-y-3 sm:space-y-4">
        {shouldShowMoodPrompt && latestUnratedActivity ? (
          <MoodEnergyPromptCard
            onDismiss={handleMoodPromptDismiss}
            onSave={handleMoodPromptSave}
          />
        ) : null}
        <RawQueueStatus onRetry={handleRawRetry} rawItems={rawItems} />
        <Timeline
          activities={activities}
          errorMessage={errorMessage}
          isLoading={isLoading}
          onActivityClick={setSelectedActivity}
        />
        <PresetGrid onPresetClick={handlePresetLog} />
        <InputBar onSubmit={handleTextLog} />
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
