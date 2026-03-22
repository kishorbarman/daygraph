import { useState } from 'react'

interface MoodEnergyPromptCardProps {
  onDismiss: () => void
  onSave: (input: { mood: number; energy: number }) => Promise<void>
}

function MoodEnergyPromptCard({ onDismiss, onSave }: MoodEnergyPromptCardProps) {
  const [mood, setMood] = useState(3)
  const [energy, setEnergy] = useState(3)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSave = async () => {
    setIsSaving(true)
    setErrorMessage(null)

    try {
      await onSave({ mood, energy })
    } catch (error) {
      console.error('Failed to save mood/energy:', error)
      setErrorMessage('Unable to save right now.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
      <h3 className="text-sm font-semibold text-blue-900">Quick check-in</h3>
      <p className="mt-1 text-xs text-blue-800">
        Help improve your insights by rating your current mood and energy.
      </p>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="block" htmlFor="mood-slider">
          <span className="mb-1 block text-xs font-medium text-blue-900">Mood: {mood}</span>
          <input
            className="w-full"
            id="mood-slider"
            max={5}
            min={1}
            onChange={(event) => setMood(Number(event.target.value))}
            type="range"
            value={mood}
          />
        </label>

        <label className="block" htmlFor="energy-slider">
          <span className="mb-1 block text-xs font-medium text-blue-900">Energy: {energy}</span>
          <input
            className="w-full"
            id="energy-slider"
            max={5}
            min={1}
            onChange={(event) => setEnergy(Number(event.target.value))}
            type="range"
            value={energy}
          />
        </label>
      </div>

      {errorMessage ? <p className="mt-2 text-xs text-rose-700">{errorMessage}</p> : null}

      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          className="rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-xs font-medium text-blue-800"
          onClick={onDismiss}
          type="button"
        >
          Later
        </button>
        <button
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
          disabled={isSaving}
          onClick={() => void handleSave()}
          type="button"
        >
          {isSaving ? 'Saving...' : 'Save check-in'}
        </button>
      </div>
    </section>
  )
}

export default MoodEnergyPromptCard
