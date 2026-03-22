import { useEffect, useMemo, useState } from 'react'
import type { Preset } from '../../types'
import {
  DEFAULT_PRESETS,
  saveUserPresets,
  subscribeUserPresets,
} from '../../services/presetService'

interface PresetGridProps {
  uid: string
  onPresetClick: (preset: Preset) => Promise<void>
}

function PresetGrid({ uid, onPresetClick }: PresetGridProps) {
  const [presets, setPresets] = useState<Preset[]>(DEFAULT_PRESETS.slice(0, 4))
  const [activePresetId, setActivePresetId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isManaging, setIsManaging] = useState(false)
  const [isSavingConfig, setIsSavingConfig] = useState(false)

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

  return (
    <section className="border-y border-slate-200 bg-white px-4 py-4 sm:rounded-xl sm:border">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-700">Quick Presets</h3>
        <button
          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
          onClick={() => setIsManaging((prev) => !prev)}
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
              <div className="flex items-center justify-between rounded-md bg-white px-2 py-2" key={preset.id}>
                <span className="text-sm text-slate-700">
                  <span className="mr-2">{preset.emoji}</span>
                  {preset.label}
                </span>
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
        </div>
      ) : null}
      {errorMessage ? (
        <p className="mt-2 text-xs text-rose-600">{errorMessage}</p>
      ) : null}
    </section>
  )
}

export default PresetGrid
