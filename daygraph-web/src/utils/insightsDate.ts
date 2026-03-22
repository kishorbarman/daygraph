export function formatDateKey(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function addDaysToDateKey(dateKey: string, days: number) {
  const [yearRaw, monthRaw, dayRaw] = dateKey.split('-')
  const year = Number(yearRaw)
  const month = Number(monthRaw)
  const day = Number(dayRaw)

  const date = new Date(year, month - 1, day)
  date.setDate(date.getDate() + days)

  return formatDateKey(date)
}

export function getRangeDateKeys(rangeDays: number, now = new Date()) {
  const endDateKey = formatDateKey(now)
  const startDateKey = addDaysToDateKey(endDateKey, -(rangeDays - 1))
  return { startDateKey, endDateKey }
}
