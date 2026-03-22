import { describe, expect, it } from 'vitest'
import type { DailyStatsRecord } from '../../types'
import {
  computeCategoryMinutes,
  computeDailySummary,
  countMoodEnergyPoints,
} from '../insightsMetrics'

function createDailyStatsRecord(partial: Partial<DailyStatsRecord>): DailyStatsRecord {
  return {
    id: partial.id ?? partial.date ?? 'day',
    date: partial.date ?? '2026-03-21',
    timezone: 'America/Los_Angeles',
    totalActivities: partial.totalActivities ?? 0,
    totalMinutes: partial.totalMinutes ?? 0,
    pointInTimeCount: 0,
    categoryCounts: {
      meal: 0,
      caffeine: 0,
      sleep: 0,
      exercise: 0,
      social: 0,
      work: 0,
      leisure: 0,
      self_care: 0,
      errand: 0,
      transit: 0,
      ...(partial.categoryCounts ?? {}),
    },
    categoryMinutes: {
      meal: 0,
      caffeine: 0,
      sleep: 0,
      exercise: 0,
      social: 0,
      work: 0,
      leisure: 0,
      self_care: 0,
      errand: 0,
      transit: 0,
      ...(partial.categoryMinutes ?? {}),
    },
    moodCount: partial.moodCount ?? 0,
    moodAverage: partial.moodAverage ?? null,
    energyCount: partial.energyCount ?? 0,
    energyAverage: partial.energyAverage ?? null,
  }
}

describe('insights metrics', () => {
  it('computes today vs average summary', () => {
    const daily = [
      createDailyStatsRecord({ date: '2026-03-20', totalMinutes: 60, totalActivities: 2 }),
      createDailyStatsRecord({ date: '2026-03-21', totalMinutes: 120, totalActivities: 4 }),
    ]

    const summary = computeDailySummary(daily, 7, '2026-03-21')

    expect(summary.todayMinutes).toBe(120)
    expect(summary.todayActivities).toBe(4)
    expect(summary.averageMinutes).toBeCloseTo(25.71, 1)
    expect(summary.minutesDelta).toBe(94)
  })

  it('aggregates category minutes across days', () => {
    const daily = [
      createDailyStatsRecord({ categoryMinutes: { meal: 45, work: 60 } as DailyStatsRecord['categoryMinutes'] }),
      createDailyStatsRecord({ categoryMinutes: { meal: 15, exercise: 30 } as DailyStatsRecord['categoryMinutes'] }),
    ]

    const result = computeCategoryMinutes(daily)

    expect(result.find((item) => item.category === 'meal')?.minutes).toBe(60)
    expect(result.find((item) => item.category === 'work')?.minutes).toBe(60)
    expect(result.find((item) => item.category === 'exercise')?.minutes).toBe(30)
  })

  it('counts mood and energy points for chart thresholding', () => {
    const daily = [
      createDailyStatsRecord({ moodAverage: 3.8 }),
      createDailyStatsRecord({ energyAverage: 3.2 }),
      createDailyStatsRecord({ moodAverage: 4.1, energyAverage: 4.0 }),
    ]

    const counts = countMoodEnergyPoints(daily)

    expect(counts.moodCount).toBe(2)
    expect(counts.energyCount).toBe(2)
    expect(counts.totalPoints).toBe(4)
  })
})
