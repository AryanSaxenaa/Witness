import { NextRequest, NextResponse } from 'next/server'
import { CrossRefInputSchema } from '@/lib/schemas'
import { crossReferenceEntities } from '@/lib/crossreference'
import { checkRateLimit } from '@/lib/rate-limit'

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Rate limit
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? 'unknown'
  const limit = checkRateLimit(ip, { maxRequests: 20, windowMs: 60_000 })
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please slow down.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(limit.retryAfterMs / 1000)) } }
    )
  }

  try {
    const body = await req.json()
    const input = CrossRefInputSchema.safeParse(body)

    if (!input.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: input.error.flatten() },
        { status: 400 }
      )
    }

    const result = crossReferenceEntities(input.data.entities)
    return NextResponse.json(result)
  } catch (error) {
    console.error('[/api/crossreference]', error)
    return NextResponse.json({ error: 'Cross-reference service unavailable' }, { status: 503 })
  }
}
