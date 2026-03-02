import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO } from 'date-fns'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
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

export function generateCaseRef(location: string, date: string): string {
  const loc = location.slice(0, 2).toUpperCase().replace(/[^A-Z]/g, 'X')
  const year = new Date(date).getFullYear() || new Date().getFullYear()
  const num = Math.floor(Math.random() * 900) + 100
  return `${loc}-${year}-X${num}`
}

export function truncateForVoice(text: string, maxChars = 4000): string {
  if (text.length <= maxChars) return text
  return text.slice(0, maxChars) + '...'
}

export function scoreToPercentage(score: number): string {
  return `${(score * 100).toFixed(1)}%`
}
