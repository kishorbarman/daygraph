import type { ActivityRecord } from '../../types'
import { addDays, formatTime, isSameDay, startOfDay } from '../../utils/dateUtils'
import { formatDateKey } from '../../utils/insightsDate'
import EmptyState from '../shared/EmptyState'
import ErrorState from '../shared/ErrorState'
import LoadingState from '../shared/LoadingState'
import { useEffect, useMemo, useRef, useState } from 'react'

interface TimelineProps {
  activities: ActivityRecord[]
  isLoading: boolean
  errorMessage: string | null
  onActivityClick: (activity: ActivityRecord) => void
  selectedDate: Date
  onDateChange: (date: Date) => void
  activityDateKeys: string[]
}

function monthLabel(date: Date) {
  return date.toLocaleDateString([], { month: 'long', year: 'numeric' })
}

function shortDateLabel(date: Date) {
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function Timeline({
  activities,
  isLoading,
  errorMessage,
  onActivityClick,
  onDateChange,
  selectedDate,
  activityDateKeys,
}: TimelineProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const calendarCloseButtonRef = useRef<HTMLButtonElement | null>(null)
  const [calendarMonth, setCalendarMonth] = useState(
    () => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1),
  )
  const today = startOfDay(new Date())

  const selectedDateLabel = isSameDay(selectedDate, today)
    ? 'Today'
    : selectedDate.toLocaleDateString([], {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })

  const highlightedDays = useMemo(() => new Set(activityDateKeys), [activityDateKeys])
  const canGoForwardOneDay = selectedDate.getTime() < today.getTime()
  const canGoForwardMonth =
    calendarMonth.getFullYear() < today.getFullYear() ||
    (calendarMonth.getFullYear() === today.getFullYear() &&
      calendarMonth.getMonth() < today.getMonth())

  const monthStart = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1)
  const leadingEmpty = monthStart.getDay()
  const daysInMonth = new Date(
    calendarMonth.getFullYear(),
    calendarMonth.getMonth() + 1,
    0,
  ).getDate()
  const totalCells = Math.ceil((leadingEmpty + daysInMonth) / 7) * 7

  useEffect(() => {
    if (!isCalendarOpen) return

    calendarCloseButtonRef.current?.focus()

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsCalendarOpen(false)
      }
    }

    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isCalendarOpen])

  if (isLoading) {
    return <LoadingState message="Loading activities..." title="Timeline" />
  }

  if (errorMessage) {
    return <ErrorState message={errorMessage} title="Timeline" />
  }

  const sortedActivities = [...activities].sort(
    (a, b) => b.timestamp.toDate().getTime() - a.timestamp.toDate().getTime(),
  )

  return (
    <>
      <section className="border-y border-slate-200 bg-white px-4 py-4 sm:rounded-xl sm:border">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium text-slate-700">Timeline</h3>
          <div className="flex items-center gap-1">
            <button
              aria-label="Previous day"
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
              onClick={() => onDateChange(addDays(selectedDate, -1))}
              type="button"
            >
              ←
            </button>
            <button
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
              onClick={() => {
                setCalendarMonth(
                  new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1),
                )
                setIsCalendarOpen(true)
              }}
              type="button"
            >
              {selectedDateLabel}
            </button>
            <button
              aria-label="Next day"
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!canGoForwardOneDay}
              onClick={() => onDateChange(addDays(selectedDate, 1))}
              type="button"
            >
              →
            </button>
          </div>
        </div>
        {activities.length === 0 ? (
          <EmptyState
            message="No activities logged for this date."
            title="No activity yet"
          />
        ) : (
          <ol className="space-y-3">
            {sortedActivities.map((activity) => (
              <li
                key={activity.id}
                className="cursor-pointer rounded-lg border border-slate-200 bg-slate-50 p-3 transition hover:border-slate-300 hover:bg-slate-100"
                onClick={() => onActivityClick(activity)}
              >
                <p className="text-sm font-medium text-slate-900">
                  {activity.activity}
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  {formatTime(activity.timestamp.toDate())} • {activity.category}
                  {activity.durationMinutes
                    ? ` • ${activity.durationMinutes} min`
                    : ''}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>

      {isCalendarOpen ? (
        <div className="fixed inset-0 z-50">
          <button
            aria-label="Close calendar"
            className="absolute inset-0 bg-slate-900/45"
            onClick={() => setIsCalendarOpen(false)}
            type="button"
          />
          <div
            aria-labelledby="timeline-calendar-title"
            aria-modal="true"
            className="absolute bottom-0 left-0 right-0 rounded-t-2xl border border-slate-200 bg-white p-4 shadow-xl sm:left-1/2 sm:w-[28rem] sm:-translate-x-1/2 sm:bottom-auto sm:top-20 sm:rounded-2xl"
            role="dialog"
          >
            <div className="mb-3 flex items-center justify-between">
              <button
                aria-label="Previous month"
                className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                onClick={() =>
                  setCalendarMonth(
                    new Date(
                      calendarMonth.getFullYear(),
                      calendarMonth.getMonth() - 1,
                      1,
                    ),
                  )
                }
                type="button"
              >
                ←
              </button>
              <p
                className="text-sm font-semibold text-slate-900"
                id="timeline-calendar-title"
              >
                {monthLabel(calendarMonth)}
              </p>
              <div className="flex items-center gap-1">
                <button
                  aria-label="Next month"
                  className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!canGoForwardMonth}
                  onClick={() =>
                    setCalendarMonth(
                      new Date(
                        calendarMonth.getFullYear(),
                        calendarMonth.getMonth() + 1,
                        1,
                      ),
                    )
                  }
                  type="button"
                >
                  →
                </button>
                <button
                  aria-label="Close calendar"
                  className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                  onClick={() => setIsCalendarOpen(false)}
                  ref={calendarCloseButtonRef}
                  type="button"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[11px] font-medium uppercase text-slate-500">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: totalCells }).map((_, index) => {
                const dayNumber = index - leadingEmpty + 1
                if (dayNumber < 1 || dayNumber > daysInMonth) {
                  return <span key={`empty-${index}`} className="h-9" />
                }

                const dayDate = new Date(
                  calendarMonth.getFullYear(),
                  calendarMonth.getMonth(),
                  dayNumber,
                )
                const dayKey = formatDateKey(dayDate)
                const isSelected = isSameDay(dayDate, selectedDate)
                const isToday = isSameDay(dayDate, today)
                const isFuture = dayDate.getTime() > today.getTime()
                const hasData = highlightedDays.has(dayKey)

                return (
                  <button
                    key={dayKey}
                    className={`relative h-9 rounded-md border text-xs font-medium transition ${
                      isSelected
                        ? 'border-blue-500 bg-blue-600 text-white'
                        : isFuture
                          ? 'border-slate-200 bg-slate-50 text-slate-400'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                    }`}
                    disabled={isFuture}
                    onClick={() => {
                      onDateChange(dayDate)
                      setIsCalendarOpen(false)
                    }}
                    type="button"
                  >
                    {dayNumber}
                    {hasData && !isSelected ? (
                      <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-blue-500" />
                    ) : null}
                    {isToday && !isSelected ? (
                      <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    ) : null}
                  </button>
                )
              })}
            </div>

            <div className="mt-3 flex items-center justify-between">
              <button
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  onDateChange(today)
                  setCalendarMonth(new Date(today.getFullYear(), today.getMonth(), 1))
                  setIsCalendarOpen(false)
                }}
                type="button"
              >
                Jump to Today
              </button>
              <p className="text-xs text-slate-500">
                Selected: {shortDateLabel(selectedDate)}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

export default Timeline
