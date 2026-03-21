import { useCallback, useMemo, useState } from 'react'

interface SpeechRecognitionResultLike {
  0: { transcript: string }
}

interface SpeechRecognitionEventLike {
  results: SpeechRecognitionResultLike[]
}

interface SpeechRecognitionLike {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  onstart: (() => void) | null
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
  start: () => void
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike

type BrowserWindow = Window &
  typeof globalThis & {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }

export function useVoiceInput() {
  const [isListening, setIsListening] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const recognitionCtor = useMemo(() => {
    const win = window as BrowserWindow
    return win.SpeechRecognition || win.webkitSpeechRecognition || null
  }, [])

  const isSupported = recognitionCtor !== null

  const startListening = useCallback(
    (onTranscript: (text: string) => void) => {
      if (!recognitionCtor) {
        setErrorMessage('Voice input is not supported in this browser.')
        return
      }

      const recognition = new recognitionCtor()
      recognition.lang = 'en-US'
      recognition.interimResults = false
      recognition.maxAlternatives = 1

      recognition.onstart = () => {
        setErrorMessage(null)
        setIsListening(true)
      }

      recognition.onresult = (event: SpeechRecognitionEventLike) => {
        const text = event.results[0]?.[0]?.transcript?.trim()
        if (text) onTranscript(text)
      }

      recognition.onerror = () => {
        setErrorMessage('Voice capture failed. Please try again.')
      }

      recognition.onend = () => {
        setIsListening(false)
      }

      recognition.start()
    },
    [recognitionCtor],
  )

  return { isSupported, isListening, errorMessage, startListening }
}
