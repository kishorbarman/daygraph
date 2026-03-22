import type { ActivityCategory, DailyStatsRecord, InsightsRangeDays } from '../types'

export function computeDailySummary(
  dailyStats: DailyStatsRecord[],
  rangeDays: InsightsRangeDays,
  todayKey: string,
) {
  const todayStats = dailyStats.find((item) => item.date === todayKey)
  const totalMinutes = dailyStats.reduce((sum, item) => sum + (item.totalMinutes ?? 0), 0)
  const totalActivities = dailyStats.reduce(
    (sum, item) => sum + (item.totalActivities ?? 0),
    0,
  )

  const averageMinutes = totalMinutes / rangeDays
  const averageActivities = totalActivities / rangeDays

  const todayMinutes = todayStats?.totalMinutes ?? 0
  const todayActivities = todayStats?.totalActivities ?? 0

  return {
    todayMinutes,
    todayActivities,
    averageMinutes,
    averageActivities,
    minutesDelta: Math.round(todayMinutes - averageMinutes),
    activitiesDelta: Number((todayActivities - averageActivities).toFixed(1)),
  }
}

export function computeCategoryMinutes(dailyStats: DailyStatsRecord[]) {
  const categories: ActivityCategory[] = [
    'sleep',
    'work',
    'exercise',
    'meal',
    'social',
    'leisure',
    'self_care',
    'transit',
    'errand',
    'caffeine',
  ]

  return categories.map((category) => {
    const minutes = dailyStats.reduce(
      (sum, day) => sum + (day.categoryMinutes?.[category] ?? 0),
      0,
    )

    return {
      category,
      minutes,
    }
  })
}

export function countMoodEnergyPoints(dailyStats: DailyStatsRecord[]) {
  const moodCount = dailyStats.filter((item) => typeof item.moodAverage === 'number').length
  const energyCount = dailyStats.filter((item) => typeof item.energyAverage === 'number').length

  return {
    moodCount,
    energyCount,
    totalPoints: moodCount + energyCount,
  }
}
