import type { ChatChartConfig } from '../types'

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'number')
}

function validateChartObject(value: unknown): ChatChartConfig | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Record<string, unknown>

  if (candidate.type !== 'line' && candidate.type !== 'bar') return null
  if (typeof candidate.title !== 'string' || !candidate.title.trim()) return null
  if (!isStringArray(candidate.labels) || candidate.labels.length === 0) return null
  if (!Array.isArray(candidate.series) || candidate.series.length === 0) return null
  const labels = candidate.labels

  const validatedSeries = candidate.series
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null
      const series = entry as Record<string, unknown>
      if (typeof series.name !== 'string' || !series.name.trim()) return null
      if (!isNumberArray(series.values)) return null
      if (series.values.length !== labels.length) return null
      return {
        name: series.name,
        values: series.values,
      }
    })
    .filter((item): item is { name: string; values: number[] } => item !== null)

  if (validatedSeries.length === 0) return null

  return {
    type: candidate.type,
    title: candidate.title,
    labels,
    series: validatedSeries,
  }
}

function extractChartJsonBlock(text: string): unknown {
  const match = text.match(/```chart\s*([\s\S]*?)```/i)
  if (!match?.[1]) return null
  try {
    return JSON.parse(match[1].trim())
  } catch {
    return null
  }
}

export function extractAndValidateChartConfig(
  chart: unknown,
  answerText: string,
): ChatChartConfig | null {
  const direct = validateChartObject(chart)
  if (direct) return direct

  if (typeof answerText !== 'string' || !answerText.trim()) return null

  const extracted = extractChartJsonBlock(answerText)
  return validateChartObject(extracted)
}
