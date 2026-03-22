import { useMemo, useState } from 'react'
import type { ActivityCategory, ActivityRecord } from '../../types'

const CATEGORY_OPTIONS: ActivityCategory[] = [
  'meal',
  'caffeine',
  'sleep',
  'exercise',
  'social',
  'work',
  'leisure',
  'self_care',
  'errand',
  'transit',
]

interface ActivityEditModalProps {
  activity: ActivityRecord
  onCancel: () => void
  onDelete: () => Promise<void>
  onSave: (input: {
    activity: string
    category: ActivityCategory
    durationMinutes: number | null
    timestamp: Date
  }) => Promise<void>
}

function toDateTimeLocalValue(value: Date) {
  const year = value.getFullYear()
  const month = `${value.getMonth() + 1}`.padStart(2, '0')
  const day = `${value.getDate()}`.padStart(2, '0')
  const hours = `${value.getHours()}`.padStart(2, '0')
  const minutes = `${value.getMinutes()}`.padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

function ActivityEditModal({
  activity,
  onCancel,
  onDelete,
  onSave,
}: ActivityEditModalProps) {
  const [activityText, setActivityText] = useState(activity.activity)
  const [category, setCategory] = useState<ActivityCategory>(activity.category)
  const [durationMinutes, setDurationMinutes] = useState<number | null>(
    activity.durationMinutes,
  )
  const [timestampInput, setTimestampInput] = useState(
    toDateTimeLocalValue(activity.timestamp.toDate()),
  )
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const timestampLabel = useMemo(
    () =>
      activity.timestamp.toDate().toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }),
    [activity.timestamp],
  )
  const maxDateTimeValue = useMemo(() => toDateTimeLocalValue(new Date()), [])

  const handleSave = async () => {
    setIsSaving(true)
    setErrorMessage(null)
    try {
      const parsedTimestamp = new Date(timestampInput)
      if (Number.isNaN(parsedTimestamp.getTime())) {
        setErrorMessage('Please choose a valid date and time.')
        return
      }

      if (parsedTimestamp.getTime() > Date.now()) {
        setErrorMessage('Please choose a time in the past.')
        return
      }

      await onSave({
        activity: activityText,
        category,
        durationMinutes,
        timestamp: parsedTimestamp,
      })
    } catch (error) {
      console.error('Failed to save activity edits:', error)
      setErrorMessage('Unable to save edits right now.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    setErrorMessage(null)
    try {
      await onDelete()
    } catch (error) {
      console.error('Failed to delete activity:', error)
      setErrorMessage('Unable to delete this activity right now.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/45 p-0 sm:items-center sm:p-6">
      <section className="w-full rounded-t-2xl bg-white p-4 sm:max-w-md sm:rounded-2xl sm:p-6">
        <h3 className="text-lg font-semibold text-slate-900">Edit activity</h3>
        <p className="mt-1 text-xs text-slate-600">Logged at {timestampLabel}</p>

        <div className="mt-4 space-y-3">
          <label className="block" htmlFor="activity-edit-text">
            <span className="mb-1 block text-xs font-medium text-slate-600">Activity</span>
            <input
              className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              id="activity-edit-text"
              onChange={(event) => setActivityText(event.target.value)}
              value={activityText}
            />
          </label>

          <label className="block" htmlFor="activity-edit-category">
            <span className="mb-1 block text-xs font-medium text-slate-600">Category</span>
            <select
              className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              id="activity-edit-category"
              onChange={(event) => setCategory(event.target.value as ActivityCategory)}
              value={category}
            >
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="block" htmlFor="activity-edit-duration">
            <span className="mb-1 block text-xs font-medium text-slate-600">Duration (minutes)</span>
            <input
              className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              id="activity-edit-duration"
              onChange={(event) => {
                const next = event.target.value.trim()
                if (!next) {
                  setDurationMinutes(null)
                  return
                }
                const parsed = Number(next)
                setDurationMinutes(Number.isFinite(parsed) && parsed > 0 ? parsed : null)
              }}
              placeholder="Leave empty for point-in-time"
              type="number"
              value={durationMinutes ?? ''}
            />
          </label>

          <label className="block" htmlFor="activity-edit-time">
            <span className="mb-1 block text-xs font-medium text-slate-600">Date and time</span>
            <input
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
              id="activity-edit-time"
              max={maxDateTimeValue}
              onChange={(event) => setTimestampInput(event.target.value)}
              type="datetime-local"
              value={timestampInput}
            />
          </label>
        </div>

        {errorMessage ? <p className="mt-3 text-xs text-rose-600">{errorMessage}</p> : null}

        <div className="mt-5 flex items-center justify-between">
          <button
            className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 disabled:opacity-60"
            disabled={isDeleting || isSaving}
            onClick={() => void handleDelete()}
            type="button"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
          <div className="flex items-center gap-2">
            <button
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700"
              disabled={isDeleting || isSaving}
              onClick={onCancel}
              type="button"
            >
              Cancel
            </button>
            <button
              className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white disabled:opacity-60"
              disabled={isDeleting || isSaving}
              onClick={() => void handleSave()}
              type="button"
            >
              {isSaving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

export default ActivityEditModal
