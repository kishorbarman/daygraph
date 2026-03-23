import { httpsCallable } from 'firebase/functions'
import {
  addDoc,
  collection,
  serverTimestamp,
} from 'firebase/firestore'
import { functions, db } from '../firebase'
import type { GetSuggestionInput, GetSuggestionOutput } from '../types'
import { sanitizeSuggestionId } from './inputGuards'

export async function getSuggestion(
  input: GetSuggestionInput,
): Promise<GetSuggestionOutput> {
  const callable = httpsCallable<GetSuggestionInput, GetSuggestionOutput>(
    functions,
    'getSuggestion',
  )
  const result = await callable(input)
  return result.data
}

export async function dismissSuggestion(uid: string, suggestionId: string) {
  const sanitizedSuggestionId = sanitizeSuggestionId(suggestionId)
  if (!sanitizedSuggestionId) return

  await addDoc(collection(db, `users/${uid}/suggestionDismissals`), {
    suggestionId: sanitizedSuggestionId,
    dismissedAt: serverTimestamp(),
  })
}
