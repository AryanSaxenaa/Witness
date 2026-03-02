import { NextRequest, NextResponse } from 'next/server'
import { MemoInputSchema } from '@/lib/schemas'
import { generateMemo } from '@/lib/mistral'

export const maxDuration = 60

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json()
    const input = MemoInputSchema.safeParse(body)

    if (!input.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: input.error.flatten() },
        { status: 400 }
      )
    }

    const { analysisResult, crossReferenceResult, caseMetadata } = input.data
    const result = await generateMemo(analysisResult, crossReferenceResult, caseMetadata)
    return NextResponse.json(result)
  } catch (error) {
    console.error('[/api/memo]', error)

    const status = (error as { statusCode?: number })?.statusCode
      ?? (error as { status?: number })?.status
    if (status === 401) {
      return NextResponse.json(
        { error: 'Invalid Mistral API key. Check MISTRAL_API_KEY in .env.local.' },
        { status: 401 }
      )
    }

    return NextResponse.json({ error: 'Memo generation service unavailable' }, { status: 503 })
  }
}
