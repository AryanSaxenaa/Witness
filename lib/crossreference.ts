import { z } from 'zod'
import type { ExtractedEntity, CrossReferenceMatch, CrossReferenceResult } from '@/types'
import iccData from '@/data/icc.json'
import unData from '@/data/un-incidents.json'
import acledData from '@/data/acled-events.json'
import hrData from '@/data/hr-reports.json'

const ICCCaseSchema = z.object({
  caseId: z.string().min(1),
  title: z.string().min(1),
  situation: z.string(),
  startDate: z.string(),
  decisionDate: z.string(),
  charges: z.array(z.string()),
  keywords: z.array(z.string()),
  locations: z.array(z.string()),
  perpetrators: z.array(z.string()),
  status: z.string(),
  sourceUrl: z.string(),
})

const UNIncidentSchema = z.object({
  incidentId: z.string().min(1),
  date: z.string(),
  location: z.string(),
  coordinates: z.object({ lat: z.number(), lng: z.number() }),
  incidentType: z.string(),
  summary: z.string(),
  keywords: z.array(z.string()),
  callsigns: z.array(z.string()),
  unitMarkings: z.array(z.string()),
  sourceReport: z.string(),
  sourceUrl: z.string(),
})

const ACLEDEventSchema = z.object({
  eventId: z.string().min(1),
  date: z.string(),
  location: z.string(),
  coordinates: z.object({ lat: z.number(), lng: z.number() }),
  eventType: z.string(),
  subEventType: z.string(),
  actors: z.array(z.string()),
  fatalities: z.number().min(0),
  summary: z.string(),
  keywords: z.array(z.string()),
  sourceScale: z.string(),
  source: z.string(),
  sourceUrl: z.string(),
})

const HRReportSchema = z.object({
  reportId: z.string().min(1),
  organization: z.string().min(1),
  date: z.string(),
  title: z.string(),
  location: z.string(),
  regions: z.array(z.string()),
  summary: z.string(),
  keywords: z.array(z.string()),
  perpetrators: z.array(z.string()),
  violations: z.array(z.string()),
  sourceUrl: z.string(),
})

function validateData<T>(schema: z.ZodSchema<T>, data: unknown, label: string): T {
  const result = schema.safeParse(data)
  if (!result.success) {
    console.error(`[crossreference] ${label} validation failed:`, result.error.issues)
    throw new Error(`Invalid ${label} data — check data/${label.toLowerCase()}.json`)
  }
  return result.data
}

const ICC_CASES = validateData(z.array(ICCCaseSchema), iccData, 'ICC')
const UN_INCIDENTS = validateData(z.array(UNIncidentSchema), unData, 'UN')
const ACLED_EVENTS = validateData(z.array(ACLEDEventSchema), acledData, 'ACLED')
const HR_REPORTS = validateData(z.array(HRReportSchema), hrData, 'HR')

// ─── Levenshtein Distance ───────────────────────────────────────────────────

function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

function normalizeText(text: string): string {
  return text.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '')
}

// ─── Matching Logic ──────────────────────────────────────────────────────────

function matchEntityAgainstKeywords(
  entity: ExtractedEntity,
  keywords: string[],
  callsigns: string[] = [],
  unitMarkings: string[] = []
): { matched: boolean; matchType: 'EXACT' | 'FUZZY'; strength: number } {
  const needle = normalizeText(entity.text)
  const allTerms = [
    ...keywords.map(normalizeText),
    ...callsigns.map(normalizeText),
    ...unitMarkings.map(normalizeText),
  ]

  // 1. Exact match (full string equality)
  if (allTerms.some((term) => term === needle)) {
    return { matched: true, matchType: 'EXACT', strength: 0.9 }
  }

  // 2. Substring / partial match
  if (allTerms.some((term) => term.includes(needle) || needle.includes(term))) {
    return { matched: true, matchType: 'FUZZY', strength: 0.65 }
  }

  // 3. Fuzzy match (Levenshtein <= 2 for strings longer than 4 chars)
  if (needle.length > 4) {
    for (const term of allTerms) {
      if (term.length > 4 && levenshtein(needle, term) <= 2) {
        return { matched: true, matchType: 'FUZZY', strength: 0.5 }
      }
    }
  }

  return { matched: false, matchType: 'FUZZY', strength: 0 }
}

function matchDateProximity(
  entityText: string,
  incidentDate: string,
  dayThreshold = 7
): boolean {
  const entityDate = new Date(entityText)
  const iDate = new Date(incidentDate)
  if (isNaN(entityDate.getTime()) || isNaN(iDate.getTime())) return false
  const diffDays = Math.abs(entityDate.getTime() - iDate.getTime()) / (1000 * 60 * 60 * 24)
  return diffDays <= dayThreshold
}

// ─── Main Export ─────────────────────────────────────────────────────────────

export function crossReferenceEntities(entities: ExtractedEntity[]): CrossReferenceResult {
  const matches: CrossReferenceMatch[] = []

  for (const entity of entities) {
    // Match against ICC cases
    for (const iccCase of ICC_CASES) {
      const result = matchEntityAgainstKeywords(entity, [
        ...iccCase.keywords,
        ...iccCase.locations,
        ...iccCase.perpetrators,
      ])
      if (result.matched) {
        matches.push({
          entityText: entity.text,
          matchedCaseId: iccCase.caseId,
          matchedCaseTitle: iccCase.title,
          matchType: result.matchType,
          corroborationStrength: Math.min(result.strength * entity.confidence, 0.99),
          source: 'ICC',
        })
      }
    }

    // Match against UN incidents
    for (const incident of UN_INCIDENTS) {
      const result = matchEntityAgainstKeywords(
        entity,
        incident.keywords,
        incident.callsigns,
        incident.unitMarkings
      )
      if (result.matched) {
        matches.push({
          entityText: entity.text,
          matchedCaseId: incident.incidentId,
          matchedCaseTitle: `${incident.incidentType} — ${incident.location}`,
          matchType: result.matchType,
          corroborationStrength: Math.min(result.strength * entity.confidence, 0.99),
          source: 'UN',
        })
        continue
      }

      // Date proximity match for DATE entities
      if (entity.type === 'DATE' && matchDateProximity(entity.text, incident.date)) {
        matches.push({
          entityText: entity.text,
          matchedCaseId: incident.incidentId,
          matchedCaseTitle: `${incident.incidentType} — ${incident.location}`,
          matchType: 'DATE_PROXIMITY',
          corroborationStrength: Math.min(0.4 * entity.confidence, 0.99),
          source: 'UN',
        })
      }
    }

    // Match against ACLED armed conflict events
    for (const event of ACLED_EVENTS) {
      const result = matchEntityAgainstKeywords(
        entity,
        [...event.keywords, ...event.actors]
      )
      if (result.matched) {
        matches.push({
          entityText: entity.text,
          matchedCaseId: event.eventId,
          matchedCaseTitle: `${event.eventType} — ${event.location}`,
          matchType: result.matchType,
          corroborationStrength: Math.min(result.strength * entity.confidence, 0.99),
          source: 'ACLED',
        })
        continue
      }

      if (entity.type === 'DATE' && matchDateProximity(entity.text, event.date)) {
        matches.push({
          entityText: entity.text,
          matchedCaseId: event.eventId,
          matchedCaseTitle: `${event.eventType} — ${event.location}`,
          matchType: 'DATE_PROXIMITY',
          corroborationStrength: Math.min(0.35 * entity.confidence, 0.99),
          source: 'ACLED',
        })
      }
    }

    // Match against Amnesty International & Human Rights Watch reports
    for (const report of HR_REPORTS) {
      const result = matchEntityAgainstKeywords(
        entity,
        [...report.keywords, ...report.perpetrators, ...report.violations, ...report.regions]
      )
      if (result.matched) {
        const source = report.organization.includes('Amnesty') ? 'AMNESTY' : 'HRW'
        matches.push({
          entityText: entity.text,
          matchedCaseId: report.reportId,
          matchedCaseTitle: report.title,
          matchType: result.matchType,
          corroborationStrength: Math.min(result.strength * entity.confidence * 0.95, 0.99),
          source: source as 'AMNESTY' | 'HRW',
        })
      }
    }


  }

  // Deduplicate: keep highest strength per entity+case pair
  const deduped = new Map<string, CrossReferenceMatch>()
  for (const match of matches) {
    const key = `${match.entityText}::${match.matchedCaseId}`
    const existing = deduped.get(key)
    if (!existing || match.corroborationStrength > existing.corroborationStrength) {
      deduped.set(key, match)
    }
  }

  const finalMatches = Array.from(deduped.values())

  // Overall score = weighted average, capped at 0.99
  const overallScore =
    finalMatches.length === 0
      ? 0
      : Math.min(
          finalMatches.reduce((sum, m) => sum + m.corroborationStrength, 0) / finalMatches.length,
          0.99
        )

  return {
    matches: finalMatches,
    overallCorroborationScore: Math.round(overallScore * 1000) / 1000,
  }
}
