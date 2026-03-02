// types/index.ts — All TypeScript interfaces for WITNESS
// Import from '@/types' everywhere. Never re-declare types inline.

export type SupportedAudioFormat = 'audio/mpeg' | 'audio/wav' | 'audio/mp4' | 'audio/webm' | 'audio/ogg'
export type EntityType = 'PERSON' | 'LOCATION' | 'ORGANIZATION' | 'DATE' | 'INCIDENT' | 'MILITARY_ID' | 'SIGINT'
export type EvidentiaryWeight = 'HIGH' | 'MEDIUM' | 'LOW'
export type MatchType = 'EXACT' | 'FUZZY' | 'DATE_PROXIMITY'
export type CorroborationSource = 'ICC' | 'UN' | 'ACLED'
export type ProcessingStep = 'idle' | 'uploading' | 'transcribing' | 'analyzing' | 'crossreferencing' | 'generating' | 'complete' | 'error'

export interface TranscriptSegment {
  start: number
  end: number
  text: string
  confidence: number
}

export interface TranscriptionResult {
  transcript: string
  detectedLanguage: string
  languageConfidence: number
  segments: TranscriptSegment[]
}

export interface ExtractedEntity {
  text: string
  type: EntityType
  confidence: number
  evidentiaryWeight: EvidentiaryWeight
  context: string
}

export interface KeyPhrase {
  phrase: string
  evidentiarySignificance: string
  legalRelevance: string
}

export interface AnalysisResult {
  translatedText: string
  originalText: string
  entities: ExtractedEntity[]
  keyPhrases: KeyPhrase[]
  ambiguities: string[]
  sourceLanguage: string
}

export interface CrossReferenceMatch {
  entityText: string
  matchedCaseId: string
  matchedCaseTitle: string
  matchType: MatchType
  corroborationStrength: number
  source: CorroborationSource
}

export interface CrossReferenceResult {
  matches: CrossReferenceMatch[]
  overallCorroborationScore: number
}

export interface VeracityScore {
  score: number
  basis: string
}

export interface EvidentiaryMemo {
  caseRef: string
  executiveSummary: string
  entityMap: ExtractedEntity[]
  corroborationAnalysis: string
  confidenceScore: number
  flaggedInconsistencies: string[]
  recommendedFollowUp: string[]
  veracity: VeracityScore
  generatedAt: string
  disclaimer: string
}

export interface CaseMetadata {
  recordedAt: string
  location: string
  sourceFile: string
}

export interface SessionState {
  currentStep: ProcessingStep
  inputMode: 'audio' | 'text' | null
  sourceFile: string | null
  transcriptionResult: TranscriptionResult | null
  analysisResult: AnalysisResult | null
  crossReferenceResult: CrossReferenceResult | null
  memo: EvidentiaryMemo | null
  error: string | null
}

// ─── Data File Types ─────────────────────────────────────────────────────────

export interface ICCCase {
  caseId: string
  title: string
  situation: string
  startDate: string
  decisionDate: string
  charges: string[]
  keywords: string[]
  locations: string[]
  perpetrators: string[]
  status: string
  sourceUrl: string
}

export interface UNIncident {
  incidentId: string
  date: string
  location: string
  coordinates: { lat: number; lng: number }
  incidentType: string
  summary: string
  keywords: string[]
  callsigns: string[]
  unitMarkings: string[]
  sourceReport: string
  sourceUrl: string
}
