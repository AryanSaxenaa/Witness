import { NextRequest, NextResponse } from 'next/server'
import { VoiceInputSchema } from '@/lib/schemas'
import { synthesizeSpeech } from '@/lib/elevenlabs'

export const maxDuration = 30

export async function POST(req: NextRequest): Promise<NextResponse> {
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
    return NextResponse.json({ error: 'Voice synthesis unavailable' }, { status: 503 })
  }
}
