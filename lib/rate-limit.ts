// ─── In-Memory Rate Limiter for API Routes ─────────────────────────────────
// Simple sliding window per-IP rate limiter. Resets on server restart.
// For production, swap with Redis-backed limiter.

interface RateLimitEntry {
  tokens: number
  lastRefill: number
}

const store = new Map<string, RateLimitEntry>()

interface RateLimitConfig {
  maxRequests: number    // max burst
  windowMs: number       // refill window in ms
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 20,
  windowMs: 60_000, // 20 requests per minute
}

export function checkRateLimit(
  ip: string,
  config: RateLimitConfig = DEFAULT_CONFIG
): { allowed: boolean; remaining: number; retryAfterMs: number } {
  const now = Date.now()
  let entry = store.get(ip)

  if (!entry) {
    entry = { tokens: config.maxRequests - 1, lastRefill: now }
    store.set(ip, entry)
    return { allowed: true, remaining: entry.tokens, retryAfterMs: 0 }
  }

  // Refill tokens based on elapsed time
  const elapsed = now - entry.lastRefill
  const refillRate = config.maxRequests / config.windowMs
  const tokensToAdd = elapsed * refillRate
  entry.tokens = Math.min(config.maxRequests, entry.tokens + tokensToAdd)
  entry.lastRefill = now

  if (entry.tokens < 1) {
    const waitMs = Math.ceil((1 - entry.tokens) / refillRate)
    return { allowed: false, remaining: 0, retryAfterMs: waitMs }
  }

  entry.tokens -= 1
  return { allowed: true, remaining: Math.floor(entry.tokens), retryAfterMs: 0 }
}

// Clean up stale entries every 5 minutes
setInterval(() => {
  const cutoff = Date.now() - 300_000
  for (const [key, value] of store.entries()) {
    if (value.lastRefill < cutoff) store.delete(key)
  }
}, 300_000)
