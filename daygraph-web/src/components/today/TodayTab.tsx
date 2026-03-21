import type { User } from 'firebase/auth'
import { createManualTextActivity, createPresetActivity } from '../../services/activityService'
import type { Preset } from '../../types'
import { useTodayActivities } from '../../hooks/useTodayActivities'
import InputBar from './InputBar'
import PresetGrid from './PresetGrid'
import Timeline from './Timeline'

interface TodayTabProps {
  user: User
}

function TodayTab({ user }: TodayTabProps) {
  const { activities, isLoading, errorMessage } = useTodayActivities(user.uid)

  const handleTextLog = async (text: string) => {
    await createManualTextActivity(user.uid, text)
  }

  const handlePresetLog = async (preset: Preset) => {
    await createPresetActivity(user.uid, preset)
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <Timeline
        activities={activities}
        errorMessage={errorMessage}
        isLoading={isLoading}
      />
      <PresetGrid onPresetClick={handlePresetLog} />
      <InputBar onSubmit={handleTextLog} />
    </div>
  )
}

export default TodayTab
