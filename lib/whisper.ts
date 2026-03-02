import { getEnv } from '@/lib/env'
import type { TranscriptionResult } from '@/types'

const SUPPORTED_FORMATS = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/webm', 'audio/ogg']
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024 // conservative limit for uploads

export class TranscriptionError extends Error {
  public readonly code: string

  constructor(message: string, code: string) {
    super(message)
    this.name = 'TranscriptionError'
    this.code = code
  }
}

export async function transcribeAudio(file: File): Promise<TranscriptionResult> {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new TranscriptionError(
      `File exceeds 25MB limit. Compress your audio or use a shorter clip.`,
      'FILE_TOO_LARGE'
    )
  }

  if (!SUPPORTED_FORMATS.includes(file.type)) {
    throw new TranscriptionError(
      `Unsupported format: ${file.type}. Use MP3, WAV, M4A, WebM, or OGG.`,
      'UNSUPPORTED_FORMAT'
    )
  }

  const apiKey = getEnv().MISTRAL_API_KEY
  if (!apiKey) {
    throw new TranscriptionError('Missing MISTRAL_API_KEY', 'UNAUTHORIZED')
  }

  const formData = new FormData()
  formData.append('model', 'voxtral-mini-latest')
  formData.append('file', file)
  formData.append('response_format', 'verbose_json')
  formData.append('timestamp_granularities[]', 'segment')

  const response = await fetch('https://api.mistral.ai/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  })

  const data = await response.json() as Record<string, unknown>

  if (!response.ok) {
    const message = (data?.error as { message?: string } | undefined)?.message
      ?? (data?.detail as string | undefined)
      ?? 'Transcription failed'
    throw new TranscriptionError(message, 'SERVICE_ERROR')
  }

  const text = (data.text as string | undefined)?.trim()
  if (!text) {
    throw new TranscriptionError('No speech detected in audio', 'EMPTY_TRANSCRIPT')
  }

  const rawSegments = Array.isArray((data as { segments?: unknown }).segments)
    ? (data as { segments: Array<{ start?: number; end?: number; text?: string; confidence?: number }> }).segments
    : []

  const segments = rawSegments.map((seg) => ({
    start: seg.start ?? 0,
    end: seg.end ?? 0,
    text: seg.text ?? '',
    confidence: typeof seg.confidence === 'number' ? seg.confidence : 0.8,
  }))

  return {
    transcript: text,
    detectedLanguage: (data as { language?: string }).language ?? 'unknown',
    languageConfidence: typeof (data as { language_probability?: number }).language_probability === 'number'
      ? (data as { language_probability: number }).language_probability
      : 0.9,
    segments,
  }
}
