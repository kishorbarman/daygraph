import type { ActivityRecord } from '../../types'
import { formatTime } from '../../utils/dateUtils'
import EmptyState from '../shared/EmptyState'
import ErrorState from '../shared/ErrorState'
import LoadingState from '../shared/LoadingState'

interface TimelineProps {
  activities: ActivityRecord[]
  isLoading: boolean
  errorMessage: string | null
  onActivityClick: (activity: ActivityRecord) => void
}

function Timeline({
  activities,
  isLoading,
  errorMessage,
  onActivityClick,
}: TimelineProps) {
  if (isLoading) {
    return <LoadingState message="Loading activities..." title="Today Timeline" />
  }

  if (errorMessage) {
    return <ErrorState message={errorMessage} title="Today Timeline" />
  }

  const sortedActivities = [...activities].sort(
    (a, b) => b.timestamp.toDate().getTime() - a.timestamp.toDate().getTime(),
  )

  return (
    <section className="border-y border-slate-200 bg-white px-4 py-4 sm:rounded-xl sm:border">
      <h3 className="mb-3 text-sm font-medium text-slate-700">Today Timeline</h3>
      {activities.length === 0 ? (
        <EmptyState
          message="No activities logged yet. Add your first one below."
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
  )
}

export default Timeline
