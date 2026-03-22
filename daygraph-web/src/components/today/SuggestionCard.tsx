import { useState } from 'react'
import type { SuggestionItem } from '../../types'

interface SuggestionCardProps {
  suggestion: SuggestionItem
  onDismiss: (suggestion: SuggestionItem) => Promise<void>
  onLogNow: (suggestion: SuggestionItem) => Promise<void>
}

function SuggestionCard({ suggestion, onDismiss, onLogNow }: SuggestionCardProps) {
  const [isWorking, setIsWorking] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleDismiss = async () => {
    setIsWorking(true)
    setErrorMessage(null)
    try {
      await onDismiss(suggestion)
    } catch (error) {
      console.error('Failed to dismiss suggestion:', error)
      setErrorMessage('Unable to dismiss right now.')
    } finally {
      setIsWorking(false)
    }
  }

  const handleLogNow = async () => {
    setIsWorking(true)
    setErrorMessage(null)
    try {
      await onLogNow(suggestion)
    } catch (error) {
      console.error('Failed to log suggestion:', error)
      setErrorMessage('Unable to log suggestion right now.')
    } finally {
      setIsWorking(false)
    }
  }

  return (
    <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
      <h3 className="text-sm font-semibold text-emerald-900">{suggestion.title}</h3>
      <p className="mt-1 text-xs text-emerald-800">{suggestion.reason}</p>

      {errorMessage ? <p className="mt-2 text-xs text-rose-700">{errorMessage}</p> : null}

      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          className="rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-medium text-emerald-800"
          disabled={isWorking}
          onClick={() => void handleDismiss()}
          type="button"
        >
          Dismiss
        </button>
        <button
          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
          disabled={isWorking}
          onClick={() => void handleLogNow()}
          type="button"
        >
          {isWorking ? 'Working...' : suggestion.actionText}
        </button>
      </div>
    </section>
  )
}

export default SuggestionCard
