import { httpsCallable } from 'firebase/functions'
import { functions } from '../firebase'

interface ResetUserDataResponse {
  success: boolean
}

export async function resetUserData() {
  const callable = httpsCallable<Record<string, never>, ResetUserDataResponse>(
    functions,
    'resetUserData',
  )
  const result = await callable({})
  return result.data
}
