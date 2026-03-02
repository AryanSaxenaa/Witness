import { NextRequest, NextResponse } from 'next/server'
import { AnalyzeInputSchema } from '@/lib/schemas'
import { analyzeTestimony } from '@/lib/mistral'

export const maxDuration = 60

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json()
    const input = AnalyzeInputSchema.safeParse(body)

    if (!input.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: input.error.flatten() },
        { status: 400 }
      )
    }

    const result = await analyzeTestimony(input.data.transcript, input.data.detectedLanguage)
    return NextResponse.json(result)
  } catch (error) {
    console.error('[/api/analyze]', error)

    const status = (error as { statusCode?: number })?.statusCode
      ?? (error as { status?: number })?.status
    if (status === 401) {
      return NextResponse.json(
        { error: 'Invalid Mistral API key. Check MISTRAL_API_KEY in .env.local.' },
        { status: 401 }
      )
    }

    return NextResponse.json({ error: 'Analysis service unavailable' }, { status: 503 })
  }
}
