import { NextRequest, NextResponse } from 'next/server'
import { AnalyzeInputSchema } from '@/lib/schemas'
import { analyzeTestimony } from '@/lib/mistral'
import { checkRateLimit } from '@/lib/rate-limit'

const MAX_TRANSCRIPT_LENGTH = 100_000 // ~100k chars

export const maxDuration = 60

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Rate limit
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? 'unknown'
  const limit = checkRateLimit(ip, { maxRequests: 10, windowMs: 60_000 })
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please slow down.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(limit.retryAfterMs / 1000)) } }
    )
  }

  try {
    const body = await req.json()

    // Input size check
    if (typeof body?.transcript === 'string' && body.transcript.length > MAX_TRANSCRIPT_LENGTH) {
      return NextResponse.json(
        { error: `Transcript too long (${body.transcript.length} chars). Max ${MAX_TRANSCRIPT_LENGTH}.` },
        { status: 413 }
      )
    }

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
