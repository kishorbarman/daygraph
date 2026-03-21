import { httpsCallable } from 'firebase/functions'
import { functions } from '../firebase'
import type { ParseActivityPreviewResponse } from '../types'

interface ParseActivityPreviewInput {
  text: string
  timezone: string
}

export async function parseActivityPreview(
  input: ParseActivityPreviewInput,
): Promise<ParseActivityPreviewResponse> {
  const callable = httpsCallable<ParseActivityPreviewInput, ParseActivityPreviewResponse>(
    functions,
    'parseActivityPreview',
  )

  const result = await callable(input)
  return result.data
}
