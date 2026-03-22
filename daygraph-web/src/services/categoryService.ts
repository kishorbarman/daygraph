import { arrayUnion, doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { isBaseActivityCategory, normalizeCategoryLabel } from '../constants/categories'

interface UserCategoriesDoc {
  customCategories?: string[]
}

function sanitizeCustomCategoryList(input: unknown) {
  if (!Array.isArray(input)) return []

  const seen = new Set<string>()
  const next: string[] = []

  for (const item of input) {
    if (typeof item !== 'string') continue
    const label = normalizeCategoryLabel(item)
    if (!label) continue
    if (isBaseActivityCategory(label)) continue

    const key = label.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    next.push(label)
  }

  return next
}

export function subscribeUserCustomCategories(
  uid: string,
  onData: (categories: string[]) => void,
  onError?: (error: unknown) => void,
) {
  const ref = doc(db, `users/${uid}/appConfig/categories`)
  return onSnapshot(
    ref,
    (snapshot) => {
      const data = snapshot.data() as UserCategoriesDoc | undefined
      onData(sanitizeCustomCategoryList(data?.customCategories))
    },
    (error) => {
      if (onError) {
        onError(error)
      } else {
        console.error('Failed to subscribe custom categories:', error)
      }
      onData([])
    },
  )
}

export async function saveUserCustomCategories(uid: string, labels: string[]) {
  const sanitized = sanitizeCustomCategoryList(labels)
  if (sanitized.length === 0) return

  const ref = doc(db, `users/${uid}/appConfig/categories`)
  await setDoc(
    ref,
    {
      customCategories: arrayUnion(...sanitized),
    },
    { merge: true },
  )
}

