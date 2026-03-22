import type { ChatChartConfig } from '../../types'

interface InlineChartProps {
  chart: ChatChartConfig
}

function InlineChart({ chart }: InlineChartProps) {
  const maxValue = Math.max(
    1,
    ...chart.series.flatMap((series) => series.values),
  )

  if (chart.type === 'bar') {
    return (
      <section className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
        <h4 className="text-xs font-semibold text-slate-700">{chart.title}</h4>
        <div className="mt-2 space-y-1.5">
          {chart.labels.map((label, index) => {
            const total = chart.series.reduce(
              (sum, series) => sum + (series.values[index] ?? 0),
              0,
            )
            const width = (total / maxValue) * 100
            return (
              <div className="space-y-0.5" key={label}>
                <div className="flex justify-between text-xs text-slate-600">
                  <span>{label}</span>
                  <span>{total}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-blue-500"
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </section>
    )
  }

  const pointsBySeries = chart.series.map((series) => {
    const points = series.values.map((value, index) => {
      const x = chart.labels.length <= 1 ? 0 : (index / (chart.labels.length - 1)) * 100
      const y = 100 - (value / maxValue) * 100
      return `${x},${y}`
    })
    return {
      name: series.name,
      points: points.join(' '),
    }
  })

  return (
    <section className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
      <h4 className="text-xs font-semibold text-slate-700">{chart.title}</h4>
      <svg className="mt-2 h-28 w-full" role="img" viewBox="0 0 100 100">
        <line stroke="#e2e8f0" strokeDasharray="2 2" x1="0" x2="100" y1="25" y2="25" />
        <line stroke="#e2e8f0" strokeDasharray="2 2" x1="0" x2="100" y1="50" y2="50" />
        <line stroke="#e2e8f0" strokeDasharray="2 2" x1="0" x2="100" y1="75" y2="75" />
        {pointsBySeries.map((series, index) => (
          <polyline
            fill="none"
            key={series.name}
            points={series.points}
            stroke={index % 2 === 0 ? '#2563eb' : '#0ea5e9'}
            strokeWidth="2"
          />
        ))}
      </svg>
      <div className="mt-2 flex flex-wrap gap-3">
        {pointsBySeries.map((series, index) => (
          <span className="inline-flex items-center gap-1 text-xs text-slate-600" key={series.name}>
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: index % 2 === 0 ? '#2563eb' : '#0ea5e9' }}
            />
            {series.name}
          </span>
        ))}
      </div>
    </section>
  )
}

export default InlineChart
