import { useMemo, useState } from 'react'
import { doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import { DEFAULT_PRESETS } from '../../services/presetService'

interface OnboardingFlowProps {
  uid: string
  onComplete: () => void
}

function OnboardingFlow({ uid, onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(0)
  const [selectedIds, setSelectedIds] = useState<string[]>(
    DEFAULT_PRESETS.slice(0, 4).map((item) => item.id),
  )
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const selectedPresets = useMemo(
    () => DEFAULT_PRESETS.filter((preset) => selectedIds.includes(preset.id)),
    [selectedIds],
  )

  const completeOnboarding = async () => {
    setIsSaving(true)
    setErrorMessage(null)

    try {
      await setDoc(
        doc(db, `users/${uid}/appConfig/presets`),
        {
          items: selectedPresets,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      )
      await updateDoc(doc(db, `users/${uid}`), {
        onboardingCompleted: true,
        onboardingCompletedAt: serverTimestamp(),
      })
      onComplete()
    } catch (error) {
      console.error('Failed to complete onboarding:', error)
      setErrorMessage('Unable to save onboarding right now.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/45 p-0 sm:items-center sm:p-6">
      <section className="w-full rounded-t-2xl bg-white p-5 sm:max-w-lg sm:rounded-2xl sm:p-6">
        {step === 0 ? (
          <>
            <h2 className="text-xl font-semibold text-slate-900">Welcome to DayGraph</h2>
            <p className="mt-2 text-sm text-slate-600">
              Track daily activities quickly and turn logs into useful patterns.
            </p>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <h2 className="text-xl font-semibold text-slate-900">How it works</h2>
            <p className="mt-2 text-sm text-slate-600">
              Log by text, voice, or preset. DayGraph then builds trend insights and
              suggestions from your own data.
            </p>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <h2 className="text-xl font-semibold text-slate-900">Choose quick presets</h2>
            <p className="mt-2 text-sm text-slate-600">
              Pick the buttons you want on your Today screen.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {DEFAULT_PRESETS.map((preset) => {
                const isSelected = selectedIds.includes(preset.id)
                return (
                  <button
                    className={`rounded-lg border px-3 py-2 text-left text-sm ${
                      isSelected
                        ? 'border-blue-300 bg-blue-50 text-blue-900'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                    key={preset.id}
                    onClick={() => {
                      setSelectedIds((prev) =>
                        prev.includes(preset.id)
                          ? prev.filter((item) => item !== preset.id)
                          : [...prev, preset.id],
                      )
                    }}
                    type="button"
                  >
                    <span className="mr-2">{preset.emoji}</span>
                    {preset.label}
                  </button>
                )
              })}
            </div>
          </>
        ) : null}

        {errorMessage ? <p className="mt-3 text-xs text-rose-600">{errorMessage}</p> : null}

        <div className="mt-5 flex items-center justify-between">
          <p className="text-xs text-slate-500">Step {step + 1} of 3</p>
          <div className="flex items-center gap-2">
            {step > 0 ? (
              <button
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700"
                onClick={() => setStep((prev) => prev - 1)}
                type="button"
              >
                Back
              </button>
            ) : null}
            {step < 2 ? (
              <button
                className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white"
                onClick={() => setStep((prev) => prev + 1)}
                type="button"
              >
                Next
              </button>
            ) : (
              <button
                className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white disabled:opacity-60"
                disabled={isSaving || selectedIds.length === 0}
                onClick={() => void completeOnboarding()}
                type="button"
              >
                {isSaving ? 'Saving...' : 'Finish setup'}
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

export default OnboardingFlow
