import type { BaseActivityCategory } from '../types'

export const BASE_ACTIVITY_CATEGORIES: BaseActivityCategory[] = [
  'meal',
  'caffeine',
  'sleep',
  'exercise',
  'social',
  'work',
  'leisure',
  'self_care',
  'errand',
  'transit',
]

function normalizeCategoryKey(value: string) {
  return value.trim().toLowerCase()
}

export function normalizeCategoryLabel(value: string) {
  return value.trim().replace(/\s+/g, ' ')
}

export function isBaseActivityCategory(value: string) {
  const normalized = normalizeCategoryKey(value)
  return BASE_ACTIVITY_CATEGORIES.some((category) => normalizeCategoryKey(category) === normalized)
}

