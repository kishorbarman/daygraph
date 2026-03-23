import { normalizeCategoryLabel } from '../constants/categories'
import type { ActivityCategory, ActivitySource, Preset } from '../types'

const MAX_ACTIVITY_LENGTH = 200
const MAX_CATEGORY_LENGTH = 64
const MAX_SUBCATEGORY_LENGTH = 64
const MAX_RAW_INPUT_LENGTH = 1200
const MAX_TAGS = 10
const MAX_SUGGESTION_ID_LENGTH = 120
const MAX_PRESETS = 20
const MAX_PRESET_ID_LENGTH = 80
const MAX_PRESET_LABEL_LENGTH = 80
const MAX_PRESET_EMOJI_LENGTH = 16
const MAX_DURATION_MINUTES = 10080

const ALLOWED_ACTIVITY_SOURCES: ActivitySource[] = ['text', 'voice', 'preset', 'auto']

function trimAndLimit(value: string, maxLength: number) {
  return value.trim().slice(0, maxLength)
}

export function sanitizeActivityText(value: string) {
  return trimAndLimit(value, MAX_ACTIVITY_LENGTH)
}

export function sanitizeCategory(value: ActivityCategory) {
  return normalizeCategoryLabel(`${value}`).slice(0, MAX_CATEGORY_LENGTH)
}

export function sanitizeSubCategory(value: string) {
  return trimAndLimit(value, MAX_SUBCATEGORY_LENGTH)
}

export function sanitizeRawInput(value: string) {
  return trimAndLimit(value, MAX_RAW_INPUT_LENGTH)
}

export function sanitizeActivitySource(value: ActivitySource): ActivitySource {
  return ALLOWED_ACTIVITY_SOURCES.includes(value) ? value : 'text'
}

export function sanitizeDurationMinutes(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return null
  }

  return Number(Math.min(MAX_DURATION_MINUTES, value).toFixed(2))
}

export function sanitizeTags(value: string[] | undefined) {
  if (!Array.isArray(value)) return []

  const seen = new Set<string>()
  const next: string[] = []

  for (const item of value) {
    if (typeof item !== 'string') continue
    const tag = trimAndLimit(item, 32)
    if (!tag) continue
    const key = tag.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    next.push(tag)
    if (next.length >= MAX_TAGS) break
  }

  return next
}

export function sanitizeMoodEnergyScore(value: number) {
  if (!Number.isFinite(value)) {
    throw new Error('Mood and energy scores must be valid numbers.')
  }

  const rounded = Math.round(value)
  if (rounded < 1 || rounded > 5) {
    throw new Error('Mood and energy scores must be between 1 and 5.')
  }

  return rounded
}

export function sanitizeSuggestionId(value: string) {
  return trimAndLimit(value, MAX_SUGGESTION_ID_LENGTH)
}

export function sanitizePreset(value: Preset): Preset | null {
  const id = trimAndLimit(value.id, MAX_PRESET_ID_LENGTH)
  const label = trimAndLimit(value.label, MAX_PRESET_LABEL_LENGTH)
  const emoji = trimAndLimit(value.emoji, MAX_PRESET_EMOJI_LENGTH)
  const category = sanitizeCategory(value.category)
  const subCategory = value.subCategory ? sanitizeSubCategory(value.subCategory) : undefined
  const defaultDuration = sanitizeDurationMinutes(value.defaultDuration)

  if (!id || !label || !emoji || !category) return null

  return {
    id,
    emoji,
    label,
    category,
    subCategory,
    isPointInTime: value.isPointInTime === true,
    usageCount:
      typeof value.usageCount === 'number' && Number.isFinite(value.usageCount)
        ? Math.max(0, Math.round(value.usageCount))
        : 0,
    ...(defaultDuration !== null ? { defaultDuration } : {}),
  }
}

export function sanitizePresetList(presets: Preset[]) {
  return presets
    .map((preset) => sanitizePreset(preset))
    .filter((preset): preset is Preset => preset !== null)
    .slice(0, MAX_PRESETS)
}

