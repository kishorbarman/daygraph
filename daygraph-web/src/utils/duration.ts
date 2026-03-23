export type DurationUnit = 'min' | 'hr' | 'sec'
export type PresetDurationUnit = Extract<DurationUnit, 'min' | 'hr'>

export function formatDateTimeLocalValue(value: Date) {
  const year = value.getFullYear()
  const month = `${value.getMonth() + 1}`.padStart(2, '0')
  const day = `${value.getDate()}`.padStart(2, '0')
  const hours = `${value.getHours()}`.padStart(2, '0')
  const minutes = `${value.getMinutes()}`.padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

export function minutesFromDurationValue(value: string, unit: DurationUnit) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return null

  if (unit === 'hr') return Number((parsed * 60).toFixed(2))
  if (unit === 'sec') return Number((parsed / 60).toFixed(2))
  return Number(parsed.toFixed(2))
}

export function presetMinutesFromDurationValue(
  value: string,
  unit: PresetDurationUnit,
) {
  const minutes = minutesFromDurationValue(value, unit)
  return minutes === null ? undefined : Math.round(minutes)
}

export function durationEditorDefaults(minutes?: number) {
  if (typeof minutes !== 'number' || minutes <= 0) {
    return { value: '30', unit: 'min' as PresetDurationUnit }
  }
  if (minutes % 60 === 0) {
    return { value: `${minutes / 60}`, unit: 'hr' as PresetDurationUnit }
  }
  return { value: `${minutes}`, unit: 'min' as PresetDurationUnit }
}
