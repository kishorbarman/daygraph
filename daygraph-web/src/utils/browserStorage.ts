function hasStorageMethod(method: 'getItem' | 'setItem') {
  return (
    typeof globalThis !== 'undefined' &&
    typeof globalThis.localStorage?.[method] === 'function'
  )
}

export function getBrowserStorage() {
  if (hasStorageMethod('getItem') && hasStorageMethod('setItem')) {
    return globalThis.localStorage
  }

  return null
}

export function readStoredJson<T>(storageKey: string, fallback: T) {
  const storage = getBrowserStorage()
  const raw = storage?.getItem(storageKey)
  if (!raw) return fallback

  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function writeStoredJson(storageKey: string, value: unknown) {
  getBrowserStorage()?.setItem(storageKey, JSON.stringify(value))
}

export function readStoredNumber(storageKey: string) {
  const storage = getBrowserStorage()
  const raw = storage?.getItem(storageKey)
  if (!raw) return null

  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : null
}
