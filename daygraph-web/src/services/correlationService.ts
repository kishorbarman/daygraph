import { httpsCallable } from 'firebase/functions'
import { functions } from '../firebase'
import type { GetCorrelationsInput, GetCorrelationsOutput } from '../types'

export async function getCorrelations(
  input: GetCorrelationsInput,
): Promise<GetCorrelationsOutput> {
  const callable = httpsCallable<GetCorrelationsInput, GetCorrelationsOutput>(
    functions,
    'getCorrelations',
  )
  const result = await callable(input)
  return result.data
}
