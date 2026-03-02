import { NextRequest, NextResponse } from 'next/server'
import { transcribeAudio, TranscriptionError } from '@/lib/whisper'

export const maxDuration = 60

export async function POST(req: NextRequest): Promise<NextResponse> {
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
    if (status === 401) {
      return NextResponse.json(
        { error: 'Invalid Groq API key. Check GROQ_API_KEY in .env.local.' },
        { status: 401 }
      )
    }

    return NextResponse.json({ error: 'Transcription service unavailable' }, { status: 503 })
  }
}
