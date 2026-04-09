import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO } from 'date-fns'
import type { NextRequest } from 'next/server'

export const MAX_AUDIO_SIZE_BYTES = 25 * 1024 * 1024
export const MAX_TRANSCRIPT_LENGTH = 100_000

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

export function getClientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? 'unknown'
}

export function formatTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function formatDate(isoString: string): string {
  try {
    return format(parseISO(isoString), 'dd MMM yyyy HH:mm UTC')
  } catch {
    return isoString
  }
}

export function truncateForVoice(text: string, maxChars = 4000): string {
  if (text.length <= maxChars) return text
  return text.slice(0, maxChars) + '...'
}

export function scoreToPercentage(score: number): string {
  return `${(score * 100).toFixed(1)}%`
}
