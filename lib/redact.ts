/**
 * PII Redaction Utility
 *
 * Strips personally identifiable information from text while preserving
 * evidentiary structure. Uses entity annotations from analysis when available.
 */

import type { ExtractedEntity } from '@/types'

/** Regex-based PII patterns for fallback detection */
const PII_PATTERNS: { pattern: RegExp; replacement: string }[] = [
  // Email addresses
  { pattern: /[\w.+-]+@[\w-]+\.[\w.-]+/gi, replacement: '[EMAIL REDACTED]' },
  // Phone numbers (international + local formats)
  { pattern: /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g, replacement: '[PHONE REDACTED]' },
  // National ID / Passport-like numbers (sequences of 6+ digits with optional separators)
  { pattern: /\b[A-Z]{0,2}\d[\d\s-]{5,}\d\b/gi, replacement: '[ID REDACTED]' },
  // GPS Coordinates
  { pattern: /\b-?\d{1,3}\.\d{4,},?\s*-?\d{1,3}\.\d{4,}\b/g, replacement: '[COORDS REDACTED]' },
]

/**
 * Entity types that are considered PII and should be redacted
 */
const PII_ENTITY_TYPES = new Set(['PERSON', 'MILITARY_ID', 'SIGINT'])

/**
 * Redact PII from text using entity annotations.
 * Replaces entity text of PII types with type-labeled placeholder.
 */
export function redactWithEntities(text: string, entities: ExtractedEntity[]): string {
  let redacted = text

  // Sort entities by text length descending to avoid partial-match issues
  const piiEntities = entities
    .filter((e) => PII_ENTITY_TYPES.has(e.type))
    .sort((a, b) => b.text.length - a.text.length)

  for (const entity of piiEntities) {
    // Use case-insensitive global replace for the entity text
    const escaped = entity.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp(escaped, 'gi')
    redacted = redacted.replace(re, `[${entity.type} REDACTED]`)
  }

  // Apply regex patterns for any PII not caught by entities
  for (const { pattern, replacement } of PII_PATTERNS) {
    redacted = redacted.replace(pattern, replacement)
  }

  return redacted
}

/**
 * Redact text using regex patterns only (no entity data required)
 */
export function redactPII(text: string): string {
  let redacted = text
  for (const { pattern, replacement } of PII_PATTERNS) {
    redacted = redacted.replace(pattern, replacement)
  }
  return redacted
}

/**
 * Count how many PII entities exist in the entity list
 */
export function countPII(entities: ExtractedEntity[]): number {
  return entities.filter((e) => PII_ENTITY_TYPES.has(e.type)).length
}
