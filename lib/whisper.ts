import OpenAI from 'openai'
import { getEnv } from '@/lib/env'
import type { TranscriptionResult } from '@/types'

function getGroqClient() {
  return new OpenAI({
    apiKey: getEnv().GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1',
  })
}

const SUPPORTED_FORMATS = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/webm', 'audio/ogg']
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024 // Groq limit: 25MB

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
      `File exceeds 25MB limit (Groq). Compress your audio or use a shorter clip.`,
      'FILE_TOO_LARGE'
    )
  }

  if (!SUPPORTED_FORMATS.includes(file.type)) {
    throw new TranscriptionError(
      `Unsupported format: ${file.type}. Use MP3, WAV, M4A, WebM, or OGG.`,
      'UNSUPPORTED_FORMAT'
    )
  }

  const response = await getGroqClient().audio.transcriptions.create({
    file,
    model: 'whisper-large-v3',
    response_format: 'verbose_json',
    timestamp_granularities: ['segment'],
  })

  if (!response.text || response.text.trim().length === 0) {
    throw new TranscriptionError('No speech detected in audio', 'EMPTY_TRANSCRIPT')
  }

  const segments = (((response as unknown as Record<string, unknown>).segments as Array<{
    start: number
    end: number
    text: string
    avg_logprob?: number
  }>) ?? []).map((seg) => ({
    start: seg.start,
    end: seg.end,
    text: seg.text,
    confidence: seg.avg_logprob ? Math.exp(seg.avg_logprob) : 0.8,
  }))

  return {
    transcript: response.text,
    detectedLanguage: (response as unknown as Record<string, unknown>).language as string ?? 'unknown',
    languageConfidence: 0.95,
    segments,
  }
}
