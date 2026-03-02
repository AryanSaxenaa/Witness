import { describe, it, expect, beforeEach, vi } from 'vitest'
import { checkRateLimit } from '../lib/rate-limit'

// The rate limiter uses a module-level Map, so we need to work around
// stale state between tests by using unique IPs per test.

describe('checkRateLimit', () => {
  it('allows the first request from a new IP', () => {
    const result = checkRateLimit('10.0.0.1', { maxRequests: 5, windowMs: 60_000 })
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(4) // 5 - 1
    expect(result.retryAfterMs).toBe(0)
  })

  it('allows requests up to the limit', () => {
    const ip = '10.0.0.2'
    const config = { maxRequests: 3, windowMs: 60_000 }

    const r1 = checkRateLimit(ip, config)
    expect(r1.allowed).toBe(true)
    expect(r1.remaining).toBe(2)

    const r2 = checkRateLimit(ip, config)
    expect(r2.allowed).toBe(true)

    const r3 = checkRateLimit(ip, config)
    expect(r3.allowed).toBe(true)
  })

  it('rejects requests beyond the limit', () => {
    const ip = '10.0.0.3'
    const config = { maxRequests: 2, windowMs: 60_000 }

    checkRateLimit(ip, config) // 1
    checkRateLimit(ip, config) // 2

    const r3 = checkRateLimit(ip, config)
    expect(r3.allowed).toBe(false)
    expect(r3.remaining).toBe(0)
    expect(r3.retryAfterMs).toBeGreaterThan(0)
  })

  it('refills tokens after time elapses', () => {
    const ip = '10.0.0.4'
    const config = { maxRequests: 2, windowMs: 1000 } // 2 per second

    checkRateLimit(ip, config)
    checkRateLimit(ip, config)

    // Simulate time passing by manually adjusting the entry
    // Since the rate limiter recalculates based on Date.now(), we use vi.useFakeTimers
    vi.useFakeTimers()
    vi.advanceTimersByTime(1000) // advance 1 full window

    const result = checkRateLimit(ip, config)
    expect(result.allowed).toBe(true)

    vi.useRealTimers()
  })

  it('uses default config when none provided', () => {
    const result = checkRateLimit('10.0.0.5')
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(19) // default is 20
  })

  it('returns retryAfterMs as a positive number when rejected', () => {
    const ip = '10.0.0.6'
    const config = { maxRequests: 1, windowMs: 60_000 }

    checkRateLimit(ip, config) // uses the one token

    const result = checkRateLimit(ip, config)
    expect(result.allowed).toBe(false)
    expect(result.retryAfterMs).toBeGreaterThan(0)
    expect(typeof result.retryAfterMs).toBe('number')
  })
})
