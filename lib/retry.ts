// ─── Retry with Exponential Backoff ─────────────────────────────────────────
// Client-side utility for retrying fetch requests with jitter.

interface RetryOptions {
  maxRetries?: number
  baseDelayMs?: number
  maxDelayMs?: number
  retryableStatuses?: number[]
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  retryableStatuses: [429, 500, 502, 503, 504],
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  options?: RetryOptions
): Promise<Response> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options }
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      const response = await fetch(input, init)

      // If the status is retryable and we have attempts left, retry
      if (opts.retryableStatuses.includes(response.status) && attempt < opts.maxRetries) {
        const retryAfter = response.headers.get('Retry-After')
        const delayMs = retryAfter
          ? parseInt(retryAfter, 10) * 1000
          : Math.min(opts.baseDelayMs * Math.pow(2, attempt) + Math.random() * 500, opts.maxDelayMs)

        console.warn(
          `[fetchWithRetry] Attempt ${attempt + 1}/${opts.maxRetries + 1} failed with status ${response.status}. Retrying in ${Math.round(delayMs)}ms...`
        )
        await sleep(delayMs)
        continue
      }

      return response
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))

      if (attempt < opts.maxRetries) {
        const delayMs = Math.min(
          opts.baseDelayMs * Math.pow(2, attempt) + Math.random() * 500,
          opts.maxDelayMs
        )
        console.warn(
          `[fetchWithRetry] Attempt ${attempt + 1}/${opts.maxRetries + 1} threw: ${lastError.message}. Retrying in ${Math.round(delayMs)}ms...`
        )
        await sleep(delayMs)
      }
    }
  }

  throw lastError ?? new Error('All retry attempts exhausted')
}
