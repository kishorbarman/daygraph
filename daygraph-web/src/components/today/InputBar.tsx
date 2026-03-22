import { useState } from 'react'
import { useVoiceInput } from '../../hooks/useVoiceInput'

interface InputBarProps {
  onSubmit: (text: string) => Promise<void>
  canLog: boolean
  disabledMessage?: string
}

function InputBar({ onSubmit, canLog, disabledMessage }: InputBarProps) {
  const [inputValue, setInputValue] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const { isSupported, isListening, errorMessage: voiceError, startListening } =
    useVoiceInput()

  const handleSubmit = async () => {
    const trimmed = inputValue.trim()
    if (!trimmed || isSubmitting || !canLog) return

    setIsSubmitting(true)
    setErrorMessage(null)
    try {
      await onSubmit(trimmed)
      setInputValue('')
    } catch (error) {
      console.error('Failed to save manual activity:', error)
      const nextError =
        error instanceof Error && error.message
          ? error.message
          : 'Could not save your activity. Please try again.'
      setErrorMessage(nextError)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="border-y border-slate-200 bg-white px-4 py-4 sm:rounded-xl sm:border">
      <label
        className="mb-2 block text-sm font-medium text-slate-700"
        htmlFor="activity-input"
      >
        What do you want to log?
      </label>
      <div className="flex gap-2">
        <input
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-500"
          disabled={!canLog}
          id="activity-input"
          onChange={(event) => setInputValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              void handleSubmit()
            }
          }}
          placeholder="e.g. Walked Nugget for 30 mins"
          value={inputValue}
        />
        <button
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          disabled={!canLog || !isSupported || isListening || isSubmitting}
          onClick={() =>
            startListening((transcript) => {
              setInputValue((previous) =>
                previous.trim().length === 0 ? transcript : `${previous} ${transcript}`,
              )
            })
          }
          type="button"
        >
          {isListening ? 'Listening...' : 'Voice'}
        </button>
        <button
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!canLog || !inputValue.trim() || isSubmitting}
          onClick={() => void handleSubmit()}
          type="button"
        >
          {isSubmitting ? 'Saving...' : 'Log'}
        </button>
      </div>
      {!canLog && disabledMessage ? (
        <p className="mt-2 text-xs text-amber-700">{disabledMessage}</p>
      ) : null}
      {errorMessage ? (
        <p className="mt-2 text-xs text-rose-600">{errorMessage}</p>
      ) : null}
      {!errorMessage && voiceError ? (
        <p className="mt-2 text-xs text-amber-700">{voiceError}</p>
      ) : null}
      {!errorMessage && !voiceError && !isSupported ? (
        <p className="mt-2 text-xs text-slate-500">
          Voice input isn’t supported in this browser.
        </p>
      ) : null}
    </section>
  )
}

export default InputBar
