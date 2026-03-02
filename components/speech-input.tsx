'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

// TypeScript declarations for Web Speech API
interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number
  readonly results: SpeechRecognitionResultList
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string
  readonly message: string
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  abort(): void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  onstart: (() => void) | null
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition
    webkitSpeechRecognition: new () => SpeechRecognition
  }
}

// ─── Supported Languages ─────────────────────────────────────────────────────
const LANGUAGES = [
  { code: '',       native: '🌐 Auto-detect (Whisper AI)',  english: 'Auto-detect' },
  { code: 'en-US',  native: 'English',               english: 'English' },
  { code: 'ar-SA',  native: 'العربية',                english: 'Arabic' },
  { code: 'uk-UA',  native: 'Українська',             english: 'Ukrainian' },
  { code: 'ru-RU',  native: 'Русский',                english: 'Russian' },
  { code: 'fr-FR',  native: 'Français',               english: 'French' },
  { code: 'es-ES',  native: 'Español',                english: 'Spanish' },
  { code: 'pt-BR',  native: 'Português',              english: 'Portuguese' },
  { code: 'sw-KE',  native: 'Kiswahili',              english: 'Swahili' },
  { code: 'am-ET',  native: 'አማርኛ',                   english: 'Amharic' },
  { code: 'my-MM',  native: 'မြန်မာဘာသာ',              english: 'Burmese' },
  { code: 'fa-IR',  native: 'فارسی',                   english: 'Farsi' },
  { code: 'ps-AF',  native: 'پښتو',                    english: 'Pashto' },
  { code: 'ku-TR',  native: 'Kurdî',                  english: 'Kurdish' },
  { code: 'ti-ER',  native: 'ትግርኛ',                   english: 'Tigrinya' },
  { code: 'so-SO',  native: 'Soomaali',               english: 'Somali' },
  { code: 'ha-NG',  native: 'Hausa',                  english: 'Hausa' },
  { code: 'zh-CN',  native: '中文',                    english: 'Chinese' },
  { code: 'hi-IN',  native: 'हिन्दी',                    english: 'Hindi' },
  { code: 'bn-BD',  native: 'বাংলা',                    english: 'Bengali' },
  { code: 'ur-PK',  native: 'اردو',                    english: 'Urdu' },
  { code: 'tr-TR',  native: 'Türkçe',                 english: 'Turkish' },
  { code: 'de-DE',  native: 'Deutsch',                english: 'German' },
  { code: 'ja-JP',  native: '日本語',                   english: 'Japanese' },
  { code: 'ko-KR',  native: '한국어',                   english: 'Korean' },
]

type RecordingMode = 'whisper' | 'browser'

interface SpeechInputProps {
  onTranscript: (text: string, langCode: string) => void
  disabled?: boolean
}

export function SpeechInput({ onTranscript, disabled = false }: SpeechInputProps) {
  const [isListening, setIsListening] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false) // Whisper server processing
  const [interimText, setInterimText] = useState('')
  const [finalText, setFinalText] = useState('')
  const [detectedLang, setDetectedLang] = useState('') // Language detected by Whisper
  const [duration, setDuration] = useState(0)
  const [selectedLang, setSelectedLang] = useState('')
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const hasBrowserSTT = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  // When language is "" (auto-detect) or browser STT is unavailable → use Whisper
  // When a specific language is selected AND browser STT is available → use browser STT (real-time)
  const mode: RecordingMode = (!selectedLang || !hasBrowserSTT) ? 'whisper' : 'browser'

  const selectedLangObj = LANGUAGES.find(l => l.code === selectedLang) ?? LANGUAGES[0]

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.abort()
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  // ─── Timer helpers ──────────────────────────────────────────────────────────
  const startTimer = useCallback(() => {
    setDuration(0)
    timerRef.current = setInterval(() => setDuration(prev => prev + 1), 1000)
  }, [])

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  // ─── Whisper Mode: MediaRecorder → /api/transcribe ──────────────────────────
  const startWhisperRecording = useCallback(async () => {
    if (disabled) return

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      chunksRef.current = []

      // Prefer webm (Whisper supports it), fallback to whatever browser offers
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4'

      const recorder = new MediaRecorder(stream, { mimeType })

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        // Stop all mic tracks
        stream.getTracks().forEach(t => t.stop())

        const audioBlob = new Blob(chunksRef.current, { type: mimeType })

        // Check size (Groq limit: 25MB)
        if (audioBlob.size > 25 * 1024 * 1024) {
          toast.error('Recording too large (>25MB). Try a shorter recording.')
          return
        }

        if (audioBlob.size < 1000) {
          toast.error('Recording too short. Please speak for at least a few seconds.')
          return
        }

        // Send to Whisper via /api/transcribe
        setIsTranscribing(true)
        try {
          const ext = mimeType.includes('webm') ? 'webm' : 'm4a'
          const file = new File([audioBlob], `mic-recording.${ext}`, { type: mimeType })
          const formData = new FormData()
          formData.append('file', file)

          const res = await fetch('/api/transcribe', {
            method: 'POST',
            body: formData,
          })

          if (!res.ok) {
            const err = await res.json()
            throw new Error(err.error || 'Transcription failed')
          }

          const result = await res.json()
          setFinalText(result.transcript)
          setDetectedLang(result.detectedLanguage || '')
          toast.success(
            `Whisper transcribed ${result.transcript.length} chars` +
            (result.detectedLanguage ? ` (detected: ${result.detectedLanguage})` : '')
          )
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Transcription failed'
          toast.error(msg)
        } finally {
          setIsTranscribing(false)
        }
      }

      mediaRecorderRef.current = recorder
      recorder.start(1000) // collect chunks every 1s
      setIsListening(true)
      startTimer()
    } catch (err) {
      if ((err as DOMException)?.name === 'NotAllowedError') {
        toast.error('Microphone access denied. Please allow microphone permissions.')
      } else {
        toast.error('Could not access microphone.')
      }
    }
  }, [disabled, startTimer])

  const stopWhisperRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    setIsListening(false)
    stopTimer()
  }, [stopTimer])

  // ─── Browser STT Mode: Web Speech API (real-time, specific language) ────────
  const startBrowserSTT = useCallback(() => {
    if (!hasBrowserSTT || disabled) return

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognitionAPI()

    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = selectedLang

    recognition.onstart = () => {
      setIsListening(true)
      startTimer()
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = ''
      let final = ''
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          final += result[0].transcript + ' '
        } else {
          interim += result[0].transcript
        }
      }
      setFinalText(final)
      setInterimText(interim)
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'not-allowed') {
        toast.error('Microphone access denied. Please allow microphone permissions.')
      } else if (event.error === 'language-not-supported') {
        toast.error('Language not supported by browser STT. Switch to Auto-detect to use Whisper AI instead.')
      } else if (event.error !== 'aborted') {
        toast.error(`Speech recognition error: ${event.error}`)
      }
      stopBrowserSTT()
    }

    recognition.onend = () => {
      setIsListening(false)
      stopTimer()
    }

    recognitionRef.current = recognition
    recognition.start()
  }, [hasBrowserSTT, disabled, selectedLang, startTimer, stopTimer])

  const stopBrowserSTT = useCallback(() => {
    if (recognitionRef.current) recognitionRef.current.stop()
    setIsListening(false)
    stopTimer()
  }, [stopTimer])

  // ─── Unified start/stop ─────────────────────────────────────────────────────
  const handleStart = mode === 'whisper' ? startWhisperRecording : startBrowserSTT
  const handleStop = mode === 'whisper' ? stopWhisperRecording : stopBrowserSTT

  const handleConfirm = useCallback(() => {
    const text = (finalText + interimText).trim()
    if (text) {
      // For Whisper mode, pass the detected language; for browser STT, pass selected lang
      const langCode = mode === 'whisper' ? detectedLang : selectedLang
      onTranscript(text, langCode)
      toast.success(`Speech captured: ${text.length} characters`)
    }
    setFinalText('')
    setInterimText('')
    setDetectedLang('')
    setDuration(0)
  }, [finalText, interimText, onTranscript, selectedLang, detectedLang, mode])

  const handleDiscard = useCallback(() => {
    setFinalText('')
    setInterimText('')
    setDetectedLang('')
    setDuration(0)
  }, [])

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const currentTranscript = (finalText + interimText).trim()
  const isBusy = isListening || isTranscribing

  return (
    <div className="border border-witness-border bg-white/[0.02] p-4 flex flex-col gap-3">
      <div className="text-xs text-witness-grey uppercase tracking-widest pb-2 border-b border-witness-border flex items-center justify-between">
        <span>VOICE INPUT</span>
        <div className="flex items-center gap-3">
          {isTranscribing && (
            <span className="flex items-center gap-1.5 text-yellow-400">
              <span className="w-2 h-2 bg-yellow-400 animate-pulse" />
              TRANSCRIBING...
            </span>
          )}
          {isListening && (
            <span className="flex items-center gap-1.5 text-witness-red">
              <span className="w-2 h-2 bg-red-500 animate-pulse" />
              REC {formatDuration(duration)}
            </span>
          )}
        </div>
      </div>

      {/* Language Selector */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] text-witness-grey uppercase tracking-widest">
          Witness Language / لغة الشاهد / Мова свідка
        </label>
        <select
          value={selectedLang}
          onChange={(e) => setSelectedLang(e.target.value)}
          disabled={isBusy || disabled}
          className="bg-navy-light border border-witness-border text-white text-sm px-2 py-1.5 focus:border-witness-red outline-none appearance-none cursor-pointer disabled:opacity-50"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.native}{lang.code ? ` — ${lang.english}` : ''}
            </option>
          ))}
        </select>

        {/* Mode indicator */}
        <div className="text-[10px] text-witness-grey/60 flex items-center gap-1.5">
          {mode === 'whisper' ? (
            <>
              <span className="inline-block w-1.5 h-1.5 bg-yellow-400/80" />
              <span>
                <strong>Whisper AI</strong> — records audio, sends to server for transcription.
                Automatically detects any language. Best for non-English witnesses.
              </span>
            </>
          ) : (
            <>
              <span className="inline-block w-1.5 h-1.5 bg-blue-400/80" />
              <span>
                <strong>Browser STT</strong> — real-time recognition in {selectedLangObj.english}.
                Faster but requires correct language selection.
              </span>
            </>
          )}
        </div>
      </div>

      {/* Transcript Preview */}
      {currentTranscript ? (
        <div className="min-h-[100px] max-h-[200px] overflow-y-auto text-sm text-white/90 leading-relaxed">
          <span>{finalText}</span>
          {interimText && <span className="text-witness-grey/60 italic">{interimText}</span>}
          {detectedLang && (
            <div className="mt-2 pt-2 border-t border-witness-border/50">
              <span className="text-[10px] text-yellow-400/80 uppercase tracking-wider">
                Detected language: {detectedLang}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="min-h-[100px] flex items-center justify-center">
          <div className="text-center">
            {isTranscribing ? (
              <div className="flex flex-col items-center gap-2">
                <div className="flex gap-1.5 items-center">
                  <svg className="animate-spin h-4 w-4 text-yellow-400" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="31.4 31.4" />
                  </svg>
                  <span className="text-xs text-yellow-400">Whisper AI is transcribing...</span>
                </div>
                <span className="text-[10px] text-witness-grey">Auto-detecting language and generating transcript</span>
              </div>
            ) : isListening ? (
              <div className="flex flex-col items-center gap-2">
                <div className="flex gap-1 items-end h-8">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1 bg-witness-red animate-pulse"
                      style={{
                        height: `${12 + Math.random() * 20}px`,
                        animationDelay: `${i * 0.15}s`,
                        animationDuration: '0.6s',
                      }}
                    />
                  ))}
                </div>
                <div className="text-xs text-witness-grey">
                  {mode === 'whisper'
                    ? 'Recording... speak in any language'
                    : selectedLang === 'ar-SA' ? 'جاري الاستماع... تحدث بوضوح' :
                      selectedLang === 'uk-UA' ? 'Слухаю... говоріть чітко' :
                      selectedLang === 'ru-RU' ? 'Слушаю... говорите чётко' :
                      selectedLang === 'fr-FR' ? 'Écoute en cours... parlez clairement' :
                      selectedLang === 'es-ES' ? 'Escuchando... hable claramente' :
                      selectedLang === 'sw-KE' ? 'Inasikiliza... sema kwa uwazi' :
                      selectedLang === 'hi-IN' ? 'सुन रहा हूँ... स्पष्ट बोलें' :
                      'Listening... speak clearly'}
                </div>
                {mode === 'whisper' && (
                  <span className="text-[10px] text-witness-grey/50">
                    تحدث بأي لغة • Говоріть будь-якою мовою • Parlez dans n&apos;importe quelle langue
                  </span>
                )}
              </div>
            ) : (
              <div className="text-xs text-witness-grey/50 flex flex-col gap-1">
                <span>Click the microphone to start recording</span>
                <span className="text-[10px]">اضغط على الميكروفون للتسجيل • Натисніть мікрофон</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-2 pt-2 border-t border-witness-border">
        <button
          onClick={isListening ? handleStop : handleStart}
          disabled={disabled || isTranscribing}
          className={cn(
            'flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-wider border transition-colors',
            isListening
              ? 'border-red-500 bg-red-500/20 text-red-400 hover:bg-red-500/30'
              : 'border-witness-red bg-witness-red/20 text-white hover:bg-witness-red/30',
            (disabled || isTranscribing) && 'opacity-50 cursor-not-allowed'
          )}
        >
          {isListening ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" />
              </svg>
              Stop
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
              {mode === 'whisper' ? 'Record (Whisper)' : 'Record'}
            </>
          )}
        </button>

        {currentTranscript && !isBusy && (
          <>
            <button
              onClick={handleConfirm}
              className="px-4 py-2 text-xs uppercase tracking-wider border border-green-600 bg-green-600/20 text-green-400 hover:bg-green-600/30 transition-colors"
            >
              ✓ Use Text
            </button>
            <button
              onClick={handleDiscard}
              className="px-4 py-2 text-xs uppercase tracking-wider border border-witness-border text-witness-grey hover:text-white transition-colors"
            >
              ✕ Discard
            </button>
          </>
        )}
      </div>
    </div>
  )
}
