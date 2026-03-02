/**
 * Consume an SSE stream from a POST endpoint.
 * Calls onChunk for each text delta, and returns the final parsed result.
 */
export async function consumeSSEStream<T>(
  url: string,
  body: unknown,
  options: {
    signal?: AbortSignal
    onChunk?: (text: string) => void
  } = {}
): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: options.signal,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Stream request failed' }))
    throw new Error(err.error || `Stream failed with status ${res.status}`)
  }

  const reader = res.body?.getReader()
  if (!reader) throw new Error('No readable stream')

  const decoder = new TextDecoder()
  let buffer = ''
  let result: T | null = null

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })

    // Process complete SSE messages (double newline separated)
    const messages = buffer.split('\n\n')
    // Keep the last incomplete chunk in buffer
    buffer = messages.pop() || ''

    for (const msg of messages) {
      if (!msg.trim()) continue

      const lines = msg.split('\n')
      let eventType = ''
      let data = ''

      for (const line of lines) {
        if (line.startsWith('event: ')) {
          eventType = line.slice(7)
        } else if (line.startsWith('data: ')) {
          data = line.slice(6)
        }
      }

      if (eventType === 'chunk' && data) {
        try {
          const text = JSON.parse(data) as string
          options.onChunk?.(text)
        } catch {
          // Non-JSON chunk, use raw
          options.onChunk?.(data)
        }
      } else if (eventType === 'result' && data) {
        result = JSON.parse(data) as T
      } else if (eventType === 'error' && data) {
        const errData = JSON.parse(data)
        throw new Error(errData.error || 'Stream error')
      }
    }
  }

  if (!result) {
    throw new Error('Stream completed without a result')
  }

  return result
}
