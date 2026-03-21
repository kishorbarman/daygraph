import { useEffect, useState } from 'react'
import type { ActivityCategory, ParsedActivityDraft } from '../../types'

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

interface ParsePreviewModalProps {
  rawInput: string
  confidence: number
  warnings: string[]
  initialDrafts: ParsedActivityDraft[]
  onCancel: () => void
  onConfirm: (drafts: ParsedActivityDraft[]) => Promise<void>
}

function ParsePreviewModal({
  rawInput,
  confidence,
  warnings,
  initialDrafts,
  onCancel,
  onConfirm,
}: ParsePreviewModalProps) {
  const [drafts, setDrafts] = useState<ParsedActivityDraft[]>(initialDrafts)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    setDrafts(initialDrafts)
  }, [initialDrafts])

  const updateDraft = (index: number, next: Partial<ParsedActivityDraft>) => {
    setDrafts((current) =>
      current.map((draft, idx) => (idx === index ? { ...draft, ...next } : draft)),
    )
  }

  const handleConfirm = async () => {
    setIsSaving(true)
    setErrorMessage(null)
    try {
      await onConfirm(drafts)
    } catch (error) {
      console.error('Failed to save parsed activities:', error)
      setErrorMessage('Could not save parsed activities. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/45 p-0 sm:items-center sm:p-6">
      <section className="max-h-[85vh] w-full overflow-y-auto rounded-t-2xl bg-white p-4 sm:max-w-2xl sm:rounded-2xl sm:p-6">
        <h3 className="text-lg font-semibold text-slate-900">Review parsed activity</h3>
        <p className="mt-1 text-sm text-slate-600">
          Confidence {(confidence * 100).toFixed(0)}% • Source: "{rawInput}"
        </p>
        {warnings.length > 0 ? (
          <p className="mt-2 text-xs text-amber-700">{warnings.join(' ')}</p>
        ) : null}

        <div className="mt-4 space-y-3">
          {drafts.map((draft, index) => (
            <div key={`${draft.activity}-${index}`} className="rounded-lg border border-slate-200 p-3">
              <input
                className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                onChange={(event) =>
                  updateDraft(index, { activity: event.target.value })
                }
                value={draft.activity}
              />
              <div className="mt-2 grid grid-cols-2 gap-2">
                <select
                  className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                  onChange={(event) =>
                    updateDraft(index, {
                      category: event.target.value as ActivityCategory,
                    })
                  }
                  value={draft.category}
                >
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <input
                  className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                  onChange={(event) => {
                    const nextDuration = Number(event.target.value)
                    if (!Number.isFinite(nextDuration) || nextDuration <= 0) {
                      updateDraft(index, {
                        durationMinutes: null,
                        isPointInTime: true,
                        endTimestamp: null,
                      })
                      return
                    }
                    const start = new Date(draft.timestamp).getTime()
                    updateDraft(index, {
                      durationMinutes: nextDuration,
                      isPointInTime: false,
                      endTimestamp: new Date(
                        start + nextDuration * 60_000,
                      ).toISOString(),
                    })
                  }}
                  placeholder="Duration (min)"
                  type="number"
                  value={draft.durationMinutes ?? ''}
                />
              </div>
            </div>
          ))}
        </div>

        {errorMessage ? (
          <p className="mt-3 text-xs text-rose-600">{errorMessage}</p>
        ) : null}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700"
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
          <button
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            disabled={isSaving}
            onClick={() => void handleConfirm()}
            type="button"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </section>
    </div>
  )
}

export default ParsePreviewModal
