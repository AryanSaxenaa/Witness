import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchWithRetry } from '../lib/retry'

describe('fetchWithRetry', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns response on first successful attempt', async () => {
    const mockResponse = new Response(JSON.stringify({ ok: true }), { status: 200 })
    vi.mocked(fetch).mockResolvedValueOnce(mockResponse)

    const result = await fetchWithRetry('/api/test')
    expect(result.status).toBe(200)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('retries on 500 status and eventually succeeds', async () => {
    const failResponse = new Response('error', { status: 500 })
    const okResponse = new Response('ok', { status: 200 })

    vi.mocked(fetch)
      .mockResolvedValueOnce(failResponse)
      .mockResolvedValueOnce(okResponse)

    const result = await fetchWithRetry('/api/test', undefined, {
      maxRetries: 2,
      baseDelayMs: 10, // fast for tests
      maxDelayMs: 50,
    })

    expect(result.status).toBe(200)
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('retries on 429 status', async () => {
    const rateLimited = new Response('rate limited', {
      status: 429,
      headers: { 'Retry-After': '1' },
    })
    const okResponse = new Response('ok', { status: 200 })

    vi.mocked(fetch)
      .mockResolvedValueOnce(rateLimited)
      .mockResolvedValueOnce(okResponse)

    const result = await fetchWithRetry('/api/test', undefined, {
      maxRetries: 2,
      baseDelayMs: 10,
      maxDelayMs: 50,
    })

    expect(result.status).toBe(200)
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('returns the failed response after exhausting all retries', async () => {
    const failResponse = new Response('error', { status: 502 })

    vi.mocked(fetch)
      .mockResolvedValueOnce(failResponse)
      .mockResolvedValueOnce(new Response('error', { status: 502 }))
      .mockResolvedValueOnce(new Response('error', { status: 502 }))
      .mockResolvedValueOnce(new Response('error', { status: 502 }))

    const result = await fetchWithRetry('/api/test', undefined, {
      maxRetries: 3,
      baseDelayMs: 10,
      maxDelayMs: 50,
    })

    // After exhausting retries, returns the last failed response
    expect(result.status).toBe(502)
    expect(fetch).toHaveBeenCalledTimes(4) // 1 initial + 3 retries
  })

  it('throws on network error after exhausting retries', async () => {
    vi.mocked(fetch)
      .mockRejectedValueOnce(new Error('Network failed'))
      .mockRejectedValueOnce(new Error('Network failed'))

    await expect(
      fetchWithRetry('/api/test', undefined, {
        maxRetries: 1,
        baseDelayMs: 10,
        maxDelayMs: 50,
      })
    ).rejects.toThrow('Network failed')

    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('does not retry on non-retryable status codes', async () => {
    const notFound = new Response('not found', { status: 404 })
    vi.mocked(fetch).mockResolvedValueOnce(notFound)

    const result = await fetchWithRetry('/api/test', undefined, {
      maxRetries: 3,
      baseDelayMs: 10,
    })

    expect(result.status).toBe(404)
    expect(fetch).toHaveBeenCalledTimes(1) // no retries
  })

  it('passes through RequestInit options', async () => {
    const okResponse = new Response('ok', { status: 200 })
    vi.mocked(fetch).mockResolvedValueOnce(okResponse)

    await fetchWithRetry('/api/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: 'test' }),
    })

    expect(fetch).toHaveBeenCalledWith('/api/test', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }))
  })
})
