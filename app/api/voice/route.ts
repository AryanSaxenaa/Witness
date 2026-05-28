import { NextRequest, NextResponse } from 'next/server'
import { VoiceInputSchema } from '@/lib/schemas'
import { synthesizeSpeech } from '@/lib/elevenlabs'
import { checkRateLimit } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/utils'

export const maxDuration = 30

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ip = getClientIp(req)
  const limit = checkRateLimit(ip, { maxRequests: 10, windowMs: 60_000 })
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please slow down.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(limit.retryAfterMs / 1000)) } }
    )
  }

  try {
    const body = await req.json()
    const input = VoiceInputSchema.safeParse(body)

    if (!input.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: input.error.flatten() },
        { status: 400 }
      )
    }

    const audioBuffer = await synthesizeSpeech(input.data.text)

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
      },
    })
  } catch (error) {
    console.error('[/api/voice]', error)

    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 })
    }

    const message = error instanceof Error ? error.message : ''
    if (message.includes('ELEVENLABS_API_KEY') || message.includes('API key')) {
      return NextResponse.json(
        { error: 'Invalid ElevenLabs API key. Check ELEVENLABS_API_KEY in .env.local.' },
        { status: 401 }
      )
    }

    const status = (error as { statusCode?: number })?.statusCode
      ?? (error as { status?: number })?.status
    if (status === 401) {
      return NextResponse.json(
        { error: 'Invalid ElevenLabs API key. Check ELEVENLABS_API_KEY in .env.local.' },
        { status: 401 }
      )
    }

    return NextResponse.json({ error: 'Voice synthesis unavailable' }, { status: 503 })
  }
}
