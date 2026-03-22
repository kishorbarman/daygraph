import { useState } from 'react'
import { useInstallPrompt } from '../../hooks/useInstallPrompt'

const DISMISS_STORAGE_KEY = 'daygraph:install-banner-dismissed-at'
const DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000

function isDismissedWithinCooldown() {
  if (
    typeof globalThis === 'undefined' ||
    typeof globalThis.localStorage?.getItem !== 'function'
  ) {
    return false
  }

  const raw = globalThis.localStorage.getItem(DISMISS_STORAGE_KEY)
  if (!raw) return false
  const dismissedAt = Number(raw)
  if (!Number.isFinite(dismissedAt)) return false

  return Date.now() - dismissedAt < DISMISS_COOLDOWN_MS
}

function InstallAppBanner() {
  const [dismissed, setDismissed] = useState(() => isDismissedWithinCooldown())
  const { canPromptInstall, showIosHint, promptInstall, isInstalled } =
    useInstallPrompt()

  if (dismissed || isInstalled || (!canPromptInstall && !showIosHint)) {
    return null
  }

  return (
    <section className="mx-4 mb-3 rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50 p-4 sm:mx-0 sm:mb-4">
      <p className="text-sm font-semibold text-slate-900">Install DayGraph App</p>
      <p className="mt-1 text-xs text-slate-700">
        {canPromptInstall
          ? 'Add DayGraph to your home screen for a full-screen, standalone experience.'
          : 'On iPhone: tap Share, then choose Add to Home Screen for standalone mode.'}
      </p>
      <div className="mt-3 flex items-center gap-2">
        {canPromptInstall ? (
          <button
            className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white"
            onClick={() => void promptInstall()}
            type="button"
          >
            Install
          </button>
        ) : null}
        <button
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700"
          onClick={() => {
            setDismissed(true)
            if (
              typeof globalThis !== 'undefined' &&
              typeof globalThis.localStorage?.setItem === 'function'
            ) {
              globalThis.localStorage.setItem(
                DISMISS_STORAGE_KEY,
                Date.now().toString(),
              )
            }
          }}
          type="button"
        >
          Maybe later
        </button>
      </div>
    </section>
  )
}

export default InstallAppBanner
