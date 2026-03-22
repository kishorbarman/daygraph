import type { CorrelationInsight } from '../../types'

interface HealthCorrelationsPanelProps {
  correlations: CorrelationInsight[]
  isLoading: boolean
  errorMessage: string | null
}

function toPercent(signal: number) {
  return `${Math.round(signal * 100)}%`
}

function HealthCorrelationsPanel({
  correlations,
  isLoading,
  errorMessage,
}: HealthCorrelationsPanelProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">Health Correlations</h3>
      <p className="mt-1 text-sm text-slate-600">
        Sample-size-aware signals between activity patterns and mood/energy.
      </p>

      {isLoading ? (
        <p className="mt-3 text-sm text-slate-500">Computing correlations...</p>
      ) : null}
      {errorMessage ? (
        <p className="mt-3 text-sm text-rose-600">{errorMessage}</p>
      ) : null}

      {!isLoading && !errorMessage ? (
        correlations.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            Not enough rated samples yet. Keep logging mood/energy to unlock this panel.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {correlations.map((item) => (
              <article
                className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                key={item.id}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold capitalize text-slate-900">
                    {item.metric.replaceAll('_', ' ')}
                  </p>
                  <p className="text-xs text-slate-600">
                    {toPercent(item.signal)} • n={item.sampleSize}
                  </p>
                </div>
                <div className="mt-2 h-2 rounded-full bg-slate-200">
                  <div
                    className={`h-2 rounded-full ${
                      item.signal >= 0 ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.abs(item.signal) * 150)}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-600">{item.insight}</p>
              </article>
            ))}
          </div>
        )
      ) : null}
    </section>
  )
}

export default HealthCorrelationsPanel
