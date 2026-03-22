import { describe, expect, it } from 'vitest'
import { addDaysToDateKey, getRangeDateKeys } from '../insightsDate'

describe('insightsDate utilities', () => {
  it('adds days across month and year boundaries', () => {
    expect(addDaysToDateKey('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDaysToDateKey('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDaysToDateKey('2026-01-01', -1)).toBe('2025-12-31')
  })

  it('stays consistent across US DST transition dates', () => {
    expect(addDaysToDateKey('2026-03-08', 1)).toBe('2026-03-09')
    expect(addDaysToDateKey('2026-11-01', 1)).toBe('2026-11-02')
    expect(addDaysToDateKey('2026-03-09', -1)).toBe('2026-03-08')
  })

  it('returns correct range window keys', () => {
    const fixedNow = new Date('2026-03-21T12:00:00Z')
    const result = getRangeDateKeys(7, fixedNow)

    expect(result.startDateKey).toBe('2026-03-15')
    expect(result.endDateKey).toBe('2026-03-21')
  })
})
