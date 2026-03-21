import { useState } from 'react'
import type { ActivityRawRecord } from '../../types'

interface RawQueueStatusProps {
  rawItems: ActivityRawRecord[]
  onRetry: (item: ActivityRawRecord) => Promise<void>
}

function RawQueueStatus({ rawItems, onRetry }: RawQueueStatusProps) {
  const [retryingId, setRetryingId] = useState<string | null>(null)

  if (rawItems.length === 0) return null

  return (
    <section className="border-y border-amber-200 bg-amber-50 px-4 py-3 sm:rounded-xl sm:border">
      <h3 className="text-sm font-medium text-amber-900">Background parsing</h3>
      <ul className="mt-2 space-y-2">
        {rawItems.map((item) => (
          <li
            key={item.id}
            className="rounded-md border border-amber-200 bg-white px-3 py-2"
          >
            <p className="text-xs text-slate-700">"{item.input}"</p>
            <div className="mt-1 flex items-center justify-between gap-2">
              <p className="text-xs text-amber-800">
                {item.status === 'pending'
                  ? 'Processing in background...'
                  : item.errorMessage || 'Parsing failed.'}
              </p>
              {item.status === 'failed' ? (
                <button
                  className="rounded-md border border-amber-300 bg-amber-100 px-2 py-1 text-xs font-medium text-amber-900 disabled:opacity-60"
                  disabled={retryingId === item.id}
                  onClick={async () => {
                    setRetryingId(item.id)
                    try {
                      await onRetry(item)
                    } finally {
                      setRetryingId(null)
                    }
                  }}
                  type="button"
                >
                  {retryingId === item.id ? 'Retrying...' : 'Retry'}
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default RawQueueStatus
