import type { InsightsRangeDays } from '../../types'

const RANGE_OPTIONS: InsightsRangeDays[] = [7, 30, 90]

interface DateRangeSelectorProps {
  value: InsightsRangeDays
  onChange: (value: InsightsRangeDays) => void
}

function DateRangeSelector({ value, onChange }: DateRangeSelectorProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
      <div className="grid grid-cols-3 gap-2">
        {RANGE_OPTIONS.map((days) => {
          const isActive = days === value
          return (
            <button
              key={days}
              className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
              onClick={() => onChange(days)}
              type="button"
            >
              {days} days
            </button>
          )
        })}
      </div>
    </section>
  )
}

export default DateRangeSelector
