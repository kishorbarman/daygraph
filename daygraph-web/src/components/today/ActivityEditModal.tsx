import { useMemo, useState } from 'react'
import { normalizeCategoryLabel } from '../../constants/categories'
import type { ActivityCategory, ActivityRecord } from '../../types'
import {
  formatDateTimeLocalValue,
  minutesFromDurationValue,
  type DurationUnit,
} from '../../utils/duration'

interface ActivityEditModalProps {
  activity: ActivityRecord
  categoryOptions: string[]
  onCancel: () => void
  onDelete: () => Promise<void>
  onSave: (input: {
    activity: string
    category: ActivityCategory
    durationMinutes: number | null
    timestamp: Date
  }) => Promise<void>
}

function ActivityEditModal({
  activity,
  categoryOptions,
  onCancel,
  onDelete,
  onSave,
}: ActivityEditModalProps) {
  const [activityText, setActivityText] = useState(activity.activity)
  const [category, setCategory] = useState<ActivityCategory>(
    normalizeCategoryLabel(activity.category),
  )
  const [durationValue, setDurationValue] = useState(
    activity.durationMinutes === null ? '' : `${activity.durationMinutes}`,
  )
  const [durationUnit, setDurationUnit] = useState<DurationUnit>('min')
  const [timestampInput, setTimestampInput] = useState(
    formatDateTimeLocalValue(activity.timestamp.toDate()),
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
  const maxDateTimeValue = useMemo(() => formatDateTimeLocalValue(new Date()), [])

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

      const nextDurationMinutes =
        durationValue.trim().length === 0
          ? null
          : minutesFromDurationValue(durationValue, durationUnit)

      if (durationValue.trim().length > 0 && nextDurationMinutes === null) {
        setErrorMessage('Please enter a valid duration.')
        return
      }

      const normalizedCategory = normalizeCategoryLabel(category)
      if (!normalizedCategory) {
        setErrorMessage('Please select or enter a category.')
        return
      }

      await onSave({
        activity: activityText,
        category: normalizedCategory,
        durationMinutes: nextDurationMinutes,
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
            <input
              className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              id="activity-edit-category"
              list="activity-edit-category-options"
              onChange={(event) => setCategory(event.target.value)}
              placeholder="Pick or type category"
              value={category}
            />
            <datalist id="activity-edit-category-options">
              {categoryOptions.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </label>

          <div className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">Duration</span>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <input
                className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                id="activity-edit-duration"
                onChange={(event) => setDurationValue(event.target.value)}
                placeholder="Leave empty for point-in-time"
                type="number"
                value={durationValue}
              />
              <select
                className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                onChange={(event) => setDurationUnit(event.target.value as DurationUnit)}
                value={durationUnit}
              >
                <option value="min">min</option>
                <option value="hr">hr</option>
                <option value="sec">sec</option>
              </select>
            </div>
          </div>

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
