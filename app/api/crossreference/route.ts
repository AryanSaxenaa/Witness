import { NextRequest, NextResponse } from 'next/server'
import { CrossRefInputSchema } from '@/lib/schemas'
import { crossReferenceEntities } from '@/lib/crossreference'

export async function POST(req: NextRequest): Promise<NextResponse> {
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
