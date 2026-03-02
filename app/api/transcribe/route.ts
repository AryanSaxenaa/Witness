import { NextRequest, NextResponse } from 'next/server'
import { transcribeAudio, TranscriptionError } from '@/lib/whisper'
import { checkRateLimit } from '@/lib/rate-limit'

export const maxDuration = 60

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Rate limit
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? 'unknown'
  const limit = checkRateLimit(ip, { maxRequests: 5, windowMs: 60_000 })
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please slow down.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(limit.retryAfterMs / 1000)) } }
    )
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file')

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 })
    }

    const result = await transcribeAudio(file)
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof TranscriptionError) {
      const statusMap: Record<string, number> = {
        FILE_TOO_LARGE: 413,
        UNSUPPORTED_FORMAT: 415,
        EMPTY_TRANSCRIPT: 422,
      }
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: statusMap[error.code] ?? 400 }
      )
    }
    console.error('[/api/transcribe]', error)

    const status = (error as { statusCode?: number })?.statusCode
      ?? (error as { status?: number })?.status
    if (status === 401 || (error as { code?: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json(
        { error: 'Invalid Mistral API key. Check MISTRAL_API_KEY in .env.local.' },
        { status: 401 }
      )
    }

    return NextResponse.json({ error: 'Transcription service unavailable' }, { status: 503 })
  }
}
