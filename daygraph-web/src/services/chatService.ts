import { httpsCallable } from 'firebase/functions'
import { functions } from '../firebase'
import type { GetChatResponseInput, GetChatResponseOutput } from '../types'
import { extractAndValidateChartConfig } from '../utils/chatChart'

export async function getChatResponse(
  input: GetChatResponseInput,
): Promise<GetChatResponseOutput> {
  const callable = httpsCallable<GetChatResponseInput, GetChatResponseOutput>(
    functions,
    'getChatResponse',
  )

  const result = await callable(input)
  const data = result.data

  return {
    ...data,
    chart: extractAndValidateChartConfig(data.chart, data.answer),
  }
}
