import { useEffect, useMemo, useState } from 'react'
import type { ActivityCategory, Preset } from '../../types'
import {
  DEFAULT_PRESETS,
  saveUserPresets,
  subscribeUserPresets,
} from '../../services/presetService'

interface PresetGridProps {
  uid: string
  onPresetClick: (preset: Preset) => Promise<void>
}

type DurationUnit = 'min' | 'hr'

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

function toSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

function durationMinutesFromValue(value: string, unit: DurationUnit) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined
  return unit === 'hr' ? Math.round(parsed * 60) : Math.round(parsed)
}

function durationEditorDefaults(minutes?: number) {
  if (typeof minutes !== 'number' || minutes <= 0) {
    return { value: '30', unit: 'min' as DurationUnit }
  }
  if (minutes % 60 === 0) {
    return { value: `${minutes / 60}`, unit: 'hr' as DurationUnit }
  }
  return { value: `${minutes}`, unit: 'min' as DurationUnit }
}

function PresetGrid({ uid, onPresetClick }: PresetGridProps) {
  const [presets, setPresets] = useState<Preset[]>(DEFAULT_PRESETS.slice(0, 4))
  const [activePresetId, setActivePresetId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isManaging, setIsManaging] = useState(false)
  const [isSavingConfig, setIsSavingConfig] = useState(false)
  const [customLabel, setCustomLabel] = useState('')
  const [customEmoji, setCustomEmoji] = useState('✨')
  const [customCategory, setCustomCategory] = useState<ActivityCategory>('leisure')
  const [customPointInTime, setCustomPointInTime] = useState(true)
  const [customDuration, setCustomDuration] = useState('30')
  const [customDurationUnit, setCustomDurationUnit] = useState<DurationUnit>('min')
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [editEmoji, setEditEmoji] = useState('✨')
  const [editCategory, setEditCategory] = useState<ActivityCategory>('leisure')
  const [editPointInTime, setEditPointInTime] = useState(true)
  const [editDuration, setEditDuration] = useState('30')
  const [editDurationUnit, setEditDurationUnit] = useState<DurationUnit>('min')

  useEffect(() => {
    const unsubscribe = subscribeUserPresets(
      uid,
      (items) => {
        setPresets(items)
      },
      (error) => {
        console.error('Failed to subscribe presets:', error)
      },
    )
    return () => unsubscribe()
  }, [uid])

  const availableToAdd = useMemo(
    () => DEFAULT_PRESETS.filter((preset) => !presets.some((item) => item.id === preset.id)),
    [presets],
  )

  const handlePresetClick = async (preset: Preset) => {
    setActivePresetId(preset.id)
    setErrorMessage(null)
    try {
      await onPresetClick(preset)
    } catch (error) {
      console.error('Failed to save preset activity:', error)
      setErrorMessage('Preset logging failed. Please try again.')
    } finally {
      setActivePresetId(null)
    }
  }

  const updatePresets = async (next: Preset[]) => {
    setPresets(next)
    setIsSavingConfig(true)
    try {
      await saveUserPresets(uid, next)
      setErrorMessage(null)
    } catch (error) {
      console.error('Failed to save preset config:', error)
      setErrorMessage('Unable to save preset changes right now.')
    } finally {
      setIsSavingConfig(false)
    }
  }

  const movePreset = async (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= presets.length) return
    const next = [...presets]
    const [item] = next.splice(index, 1)
    next.splice(target, 0, item)
    await updatePresets(next)
  }

  const addCustomPreset = async () => {
    const label = customLabel.trim()
    if (!label) {
      setErrorMessage('Custom preset label is required.')
      return
    }

    const slug = toSlug(label)
    if (!slug) {
      setErrorMessage('Use letters or numbers for custom preset label.')
      return
    }

    const normalizedDuration = customPointInTime
      ? undefined
      : durationMinutesFromValue(customDuration, customDurationUnit)

    const customPreset: Preset = {
      id: `custom-${slug}-${Date.now().toString(36)}`,
      emoji: customEmoji.trim() || '✨',
      label,
      category: customCategory,
      subCategory: slug,
      isPointInTime: customPointInTime,
      defaultDuration: normalizedDuration,
      usageCount: 0,
    }

    await updatePresets([...presets, customPreset])
    setCustomLabel('')
    setCustomEmoji('✨')
    setCustomCategory('leisure')
    setCustomPointInTime(true)
    setCustomDuration('30')
    setCustomDurationUnit('min')
  }

  const loadEditorFromPreset = (preset: Preset) => {
    setEditingPresetId(preset.id)
    setEditLabel(preset.label)
    setEditEmoji(preset.emoji || '✨')
    setEditCategory(preset.category)
    setEditPointInTime(preset.isPointInTime)
    const durationDefaults = durationEditorDefaults(preset.defaultDuration)
    setEditDuration(durationDefaults.value)
    setEditDurationUnit(durationDefaults.unit)
  }

  const saveEditedPreset = async () => {
    if (!editingPresetId) return

    const label = editLabel.trim()
    if (!label) {
      setErrorMessage('Preset label is required.')
      return
    }

    const normalizedDuration = editPointInTime
      ? undefined
      : durationMinutesFromValue(editDuration, editDurationUnit)

    const next = presets.map((preset) => {
      if (preset.id !== editingPresetId) return preset
      return {
        ...preset,
        label,
        emoji: editEmoji.trim() || '✨',
        category: editCategory,
        subCategory: toSlug(label) || preset.subCategory || 'general',
        isPointInTime: editPointInTime,
        defaultDuration: normalizedDuration,
      }
    })

    await updatePresets(next)
    setEditingPresetId(null)
  }

  return (
    <section className="border-y border-slate-200 bg-white px-4 py-4 sm:rounded-xl sm:border">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-700">Quick Presets</h3>
        <button
          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
          onClick={() => {
            setIsManaging((prev) => {
              const next = !prev
              if (!next) {
                setEditingPresetId(null)
              }
              return next
            })
          }}
          type="button"
        >
          {isManaging ? 'Done' : 'Customize'}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {presets.map((preset) => (
          <button
            key={preset.id}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-left text-sm text-slate-700 transition hover:bg-slate-100"
            disabled={activePresetId !== null || isManaging}
            onClick={() => void handlePresetClick(preset)}
            type="button"
          >
            <span className="mr-2 text-base">{preset.emoji}</span>
            <span className="font-medium">
              {activePresetId === preset.id ? 'Saving...' : preset.label}
            </span>
          </button>
        ))}
      </div>
      {isManaging ? (
        <div className="mt-4 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs text-slate-600">
            Reorder, remove, or add preset buttons. {isSavingConfig ? 'Saving...' : ''}
          </p>
          <div className="space-y-2">
            {presets.map((preset, index) => (
              <div key={preset.id}>
                <div className="flex items-center justify-between rounded-md bg-white px-2 py-2">
                  <button
                    className={`text-left text-sm ${
                      editingPresetId === preset.id ? 'text-blue-700' : 'text-slate-700'
                    }`}
                    onClick={() => loadEditorFromPreset(preset)}
                    type="button"
                  >
                    <span className="mr-2">{preset.emoji}</span>
                    {preset.label}
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      className="rounded border border-slate-300 px-2 py-0.5 text-xs"
                      onClick={() => void movePreset(index, -1)}
                      type="button"
                    >
                      ↑
                    </button>
                    <button
                      className="rounded border border-slate-300 px-2 py-0.5 text-xs"
                      onClick={() => void movePreset(index, 1)}
                      type="button"
                    >
                      ↓
                    </button>
                    <button
                      className="rounded border border-rose-200 px-2 py-0.5 text-xs text-rose-700"
                      onClick={() => void updatePresets(presets.filter((item) => item.id !== preset.id))}
                      type="button"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <div
                  className="overflow-hidden transition-all duration-300 ease-out"
                  style={{
                    maxHeight: editingPresetId === preset.id ? 280 : 0,
                    opacity: editingPresetId === preset.id ? 1 : 0,
                  }}
                >
                  <div className="mt-2 space-y-2 rounded-md border border-blue-200 bg-blue-50 p-2">
                    <p className="text-xs font-medium text-blue-900">Edit preset</p>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        className="rounded border border-slate-300 px-2 py-1.5 text-xs"
                        onChange={(event) => setEditLabel(event.target.value)}
                        placeholder="Label"
                        value={editLabel}
                      />
                      <input
                        className="rounded border border-slate-300 px-2 py-1.5 text-xs"
                        maxLength={4}
                        onChange={(event) => setEditEmoji(event.target.value)}
                        placeholder="Emoji"
                        value={editEmoji}
                      />
                      <select
                        className="rounded border border-slate-300 px-2 py-1.5 text-xs"
                        onChange={(event) => setEditCategory(event.target.value as ActivityCategory)}
                        value={editCategory}
                      >
                        {CATEGORY_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                      <div className="flex items-center overflow-hidden rounded border border-slate-300 bg-white">
                        <input
                          className="w-full border-0 px-2 py-1.5 text-xs outline-none disabled:bg-slate-100"
                          disabled={editPointInTime}
                          min={1}
                          onChange={(event) => setEditDuration(event.target.value)}
                          placeholder="Duration"
                          type="number"
                          value={editDuration}
                        />
                        <select
                          className="w-16 border-l border-slate-300 bg-slate-50 px-1 py-1.5 text-xs disabled:bg-slate-100"
                          disabled={editPointInTime}
                          onChange={(event) => setEditDurationUnit(event.target.value as DurationUnit)}
                          value={editDurationUnit}
                        >
                          <option value="min">min</option>
                          <option value="hr">hr</option>
                        </select>
                      </div>
                    </div>
                    <label className="inline-flex items-center gap-2 text-xs text-slate-700">
                      <input
                        checked={editPointInTime}
                        onChange={(event) => setEditPointInTime(event.target.checked)}
                        type="checkbox"
                      />
                      Point-in-time preset
                    </label>
                    <div className="flex justify-end gap-2">
                      <button
                        className="rounded border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700"
                        onClick={() => setEditingPresetId(null)}
                        type="button"
                      >
                        Cancel
                      </button>
                      <button
                        className="rounded border border-blue-300 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-800"
                        onClick={() => void saveEditedPreset()}
                        type="button"
                      >
                        Save preset
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {availableToAdd.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {availableToAdd.map((preset) => (
                <button
                  className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700"
                  key={preset.id}
                  onClick={() => void updatePresets([...presets, preset])}
                  type="button"
                >
                  + {preset.label}
                </button>
              ))}
            </div>
          ) : null}
          <div className="space-y-2 rounded-md border border-slate-200 bg-white p-2">
            <p className="text-xs font-medium text-slate-700">Add custom preset</p>
            <div className="grid grid-cols-2 gap-2">
              <input
                className="rounded border border-slate-300 px-2 py-1.5 text-xs"
                onChange={(event) => setCustomLabel(event.target.value)}
                placeholder="Label (required)"
                value={customLabel}
              />
              <input
                className="rounded border border-slate-300 px-2 py-1.5 text-xs"
                maxLength={4}
                onChange={(event) => setCustomEmoji(event.target.value)}
                placeholder="Emoji"
                value={customEmoji}
              />
              <select
                className="rounded border border-slate-300 px-2 py-1.5 text-xs"
                onChange={(event) => setCustomCategory(event.target.value as ActivityCategory)}
                value={customCategory}
              >
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <div className="flex items-center overflow-hidden rounded border border-slate-300 bg-white">
                <input
                  className="w-full border-0 px-2 py-1.5 text-xs outline-none disabled:bg-slate-100"
                  disabled={customPointInTime}
                  min={1}
                  onChange={(event) => setCustomDuration(event.target.value)}
                  placeholder="Duration"
                  type="number"
                  value={customDuration}
                />
                <select
                  className="w-16 border-l border-slate-300 bg-slate-50 px-1 py-1.5 text-xs disabled:bg-slate-100"
                  disabled={customPointInTime}
                  onChange={(event) => setCustomDurationUnit(event.target.value as DurationUnit)}
                  value={customDurationUnit}
                >
                  <option value="min">min</option>
                  <option value="hr">hr</option>
                </select>
              </div>
            </div>
            <label className="inline-flex items-center gap-2 text-xs text-slate-700">
              <input
                checked={customPointInTime}
                onChange={(event) => setCustomPointInTime(event.target.checked)}
                type="checkbox"
              />
              Point-in-time preset
            </label>
            <div className="flex justify-end">
              <button
                className="rounded border border-blue-300 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-800"
                onClick={() => void addCustomPreset()}
                type="button"
              >
                Add custom
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {errorMessage ? (
        <p className="mt-2 text-xs text-rose-600">{errorMessage}</p>
      ) : null}
    </section>
  )
}

export default PresetGrid
