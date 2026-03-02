import { NextRequest } from 'next/server'
import { AnalyzeInputSchema } from '@/lib/schemas'
import { analyzeTestimonyStream } from '@/lib/mistral'
import { checkRateLimit } from '@/lib/rate-limit'

const MAX_TRANSCRIPT_LENGTH = 100_000

export const maxDuration = 60

export async function POST(req: NextRequest) {
  // Rate limit
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? 'unknown'
  const limit = checkRateLimit(ip, { maxRequests: 10, windowMs: 60_000 })
  if (!limit.allowed) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': String(Math.ceil(limit.retryAfterMs / 1000)) },
    })
  }

  try {
    const body = await req.json()

    if (typeof body?.transcript === 'string' && body.transcript.length > MAX_TRANSCRIPT_LENGTH) {
      return new Response(JSON.stringify({ error: `Transcript too long (${body.transcript.length} chars)` }), {
        status: 413,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const input = AnalyzeInputSchema.safeParse(body)
    if (!input.success) {
      return new Response(JSON.stringify({ error: 'Invalid input', details: input.error.flatten() }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const encoder = new TextEncoder()
    const generator = analyzeTestimonyStream(input.data.transcript, input.data.detectedLanguage)

    const stream = new ReadableStream({
      async start(controller) {
        try {
          let finalResult: unknown = undefined
          while (true) {
            const { value, done } = await generator.next()
            if (done) {
              // The return value is the parsed AnalysisResult
              finalResult = value
              break
            }
            // Send each token as an SSE "chunk" event
            controller.enqueue(encoder.encode(`event: chunk\ndata: ${JSON.stringify(value)}\n\n`))
          }
          // Send the final parsed result as a "result" event
          controller.enqueue(encoder.encode(`event: result\ndata: ${JSON.stringify(finalResult)}\n\n`))
          controller.close()
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Stream error'
          controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ error: message })}\n\n`))
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    console.error('[/api/analyze-stream]', error)
    return new Response(JSON.stringify({ error: 'Analysis streaming service unavailable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
