import { useState } from 'react'
import type { Preset } from '../../types'

const DEFAULT_PRESETS: Preset[] = [
  {
    id: 'coffee',
    emoji: '☕',
    label: 'Coffee',
    category: 'caffeine',
    subCategory: 'coffee',
    isPointInTime: true,
    usageCount: 0,
  },
  {
    id: 'breakfast',
    emoji: '🍳',
    label: 'Breakfast',
    category: 'meal',
    subCategory: 'breakfast',
    isPointInTime: true,
    usageCount: 0,
  },
  {
    id: 'lunch',
    emoji: '🍽️',
    label: 'Lunch',
    category: 'meal',
    subCategory: 'lunch',
    isPointInTime: true,
    usageCount: 0,
  },
  {
    id: 'walk',
    emoji: '🐕',
    label: 'Walk Nugget',
    category: 'exercise',
    subCategory: 'walk',
    isPointInTime: false,
    defaultDuration: 30,
    usageCount: 0,
  },
]

interface PresetGridProps {
  onPresetClick: (preset: Preset) => Promise<void>
}

function PresetGrid({ onPresetClick }: PresetGridProps) {
  const [activePresetId, setActivePresetId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

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

  return (
    <section className="border-y border-slate-200 bg-white px-4 py-4 sm:rounded-xl sm:border">
      <h3 className="mb-3 text-sm font-medium text-slate-700">Quick Presets</h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {DEFAULT_PRESETS.map((preset) => (
          <button
            key={preset.id}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-left text-sm text-slate-700 transition hover:bg-slate-100"
            disabled={activePresetId !== null}
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
      {errorMessage ? (
        <p className="mt-2 text-xs text-rose-600">{errorMessage}</p>
      ) : null}
    </section>
  )
}

export default PresetGrid
