import { httpsCallable } from 'firebase/functions'
import { auth, functions } from '../firebase'
import type { ParseActivityPreviewResponse } from '../types'

interface ParseActivityPreviewInput {
  text: string
  timezone: string
}

export async function parseActivityPreview(
  input: ParseActivityPreviewInput,
): Promise<ParseActivityPreviewResponse> {
  if (!auth.currentUser) {
    throw new Error('Please sign in again to use AI parsing.')
  }

  const callable = httpsCallable<ParseActivityPreviewInput, ParseActivityPreviewResponse>(
    functions,
    'parseActivityPreview',
  )

  const toFriendlyParseError = (error: unknown) => {
    const code = (error as { code?: string })?.code ?? ''
    const message = (error as { message?: string })?.message ?? ''
    const normalizedCode = `${code}`.toLowerCase()
    const normalizedMessage = `${message}`.toLowerCase().trim()

    if (normalizedCode.includes('unauthenticated')) {
      return new Error('Session expired. Please sign out and sign back in.')
    }

    if (normalizedCode.includes('internal') || normalizedMessage === 'internal') {
      return new Error('AI parser is temporarily unavailable. Please try again in a moment.')
    }

    if (normalizedMessage.length > 0) {
      return new Error(message)
    }

    return new Error('Could not parse with AI right now. Please try again.')
  }

  try {
    const result = await callable(input)
    return result.data
  } catch (error) {
    const code = (error as { code?: string })?.code
    const normalizedCode = `${code ?? ''}`.toLowerCase()

    if (
      auth.currentUser &&
      (normalizedCode.includes('unauthenticated') ||
        normalizedCode.includes('internal'))
    ) {
      try {
        await auth.currentUser.getIdToken(true)
        const retryResult = await callable(input)
        return retryResult.data
      } catch (retryError) {
        throw toFriendlyParseError(retryError)
      }
    }

    throw toFriendlyParseError(error)
  }
}
