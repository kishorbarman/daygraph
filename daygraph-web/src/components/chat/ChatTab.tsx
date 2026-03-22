import { useMemo, useState } from 'react'
import type { User } from 'firebase/auth'
import { getChatResponse } from '../../services/chatService'
import type { ChatMessage } from '../../types'
import InlineChart from './InlineChart'

interface ChatTabProps {
  user: User
}

function ChatTab({ user }: ChatTabProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: `Hi ${user.displayName || 'there'}, ask about your patterns and I will use your DayGraph data.`,
      createdAt: Date.now(),
      confidence: 'medium',
    },
  ])
  const [sessionId, setSessionId] = useState<string | undefined>(undefined)
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [deepResearch, setDeepResearch] = useState(false)

  const followups = useMemo(() => {
    const latestAssistant = [...messages].reverse().find((item) => item.role === 'assistant')
    return latestAssistant?.followups ?? []
  }, [messages])

  const sendMessage = async (messageText: string) => {
    const trimmed = messageText.trim()
    if (!trimmed || isSending) return

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text: trimmed,
      createdAt: Date.now(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsSending(true)
    setErrorMessage(null)

    try {
      const response = await getChatResponse({
        message: trimmed,
        sessionId,
        deepResearch,
      })

      setSessionId(response.sessionId)

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: response.answer,
        createdAt: Date.now(),
        confidence: response.confidence,
        chart: response.chart,
        followups: response.suggestedFollowups,
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error('Failed to get chat response:', error)
      setErrorMessage('Chat is temporarily unavailable. Please try again.')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <main className="space-y-3 px-3 sm:space-y-4 sm:px-0">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Chat</h2>
        <p className="mt-1 text-sm text-slate-600">
          Ask questions about recent trends, routines, and consistency.
        </p>
        <label className="mt-3 inline-flex items-center gap-2 text-xs text-slate-700">
          <input
            checked={deepResearch}
            onChange={(event) => setDeepResearch(event.target.checked)}
            type="checkbox"
          />
          Deep Research mode (longer, deeper answers)
        </label>
      </section>

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="max-h-[55vh] space-y-2 overflow-y-auto pr-1">
          {messages.map((message) => (
            <article
              className={`rounded-xl px-3 py-2 ${
                message.role === 'user'
                  ? 'ml-6 bg-blue-600 text-white'
                  : 'mr-6 border border-slate-200 bg-slate-50 text-slate-900'
              }`}
              key={message.id}
            >
              <p className="whitespace-pre-wrap text-sm">{message.text}</p>
              {message.role === 'assistant' && message.confidence ? (
                <p className="mt-1 text-xs text-slate-500">
                  Confidence: {message.confidence}
                </p>
              ) : null}
              {message.role === 'assistant' && message.chart ? (
                <InlineChart chart={message.chart} />
              ) : null}
            </article>
          ))}
        </div>

        {errorMessage ? <p className="text-xs text-rose-600">{errorMessage}</p> : null}

        {followups.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {followups.map((followup) => (
              <button
                className="rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs text-slate-700 hover:bg-slate-200"
                disabled={isSending}
                key={followup}
                onClick={() => void sendMessage(followup)}
                type="button"
              >
                {followup}
              </button>
            ))}
          </div>
        ) : null}

        <form
          className="sticky bottom-0 flex items-end gap-2 border-t border-slate-200 bg-white pt-3"
          onSubmit={(event) => {
            event.preventDefault()
            void sendMessage(input)
          }}
        >
          <label className="sr-only" htmlFor="chat-input">
            Ask DayGraph chat
          </label>
          <textarea
            className="min-h-20 flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm"
            id="chat-input"
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask: How does this week compare to my usual?"
            value={input}
          />
          <button
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            disabled={isSending || input.trim().length === 0}
            type="submit"
          >
            {isSending ? 'Thinking...' : 'Send'}
          </button>
        </form>
      </section>
    </main>
  )
}

export default ChatTab
