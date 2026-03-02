import { z } from 'zod'

// ─── Shared Enums ───────────────────────────────────────────────────────────

export const EntityTypeSchema = z.enum([
  'PERSON', 'LOCATION', 'ORGANIZATION', 'DATE', 'INCIDENT', 'MILITARY_ID', 'SIGINT'
])

export const EvidentiaryWeightSchema = z.enum(['HIGH', 'MEDIUM', 'LOW'])

export const MatchTypeSchema = z.enum(['EXACT', 'FUZZY', 'DATE_PROXIMITY'])

export const CorroborationSourceSchema = z.enum(['ICC', 'UN', 'ACLED', 'AMNESTY', 'HRW'])

export const ProcessingStepSchema = z.enum([
  'idle', 'uploading', 'transcribing', 'analyzing', 'crossreferencing', 'generating', 'complete', 'error'
])

// ─── Transcription ───────────────────────────────────────────────────────────

export const TranscriptSegmentSchema = z.object({
  start: z.number().min(0),
  end: z.number().min(0),
  text: z.string(),
  confidence: z.number().min(0).max(1),
})

export const TranscriptionResultSchema = z.object({
  transcript: z.string().min(1),
  detectedLanguage: z.string(),
  languageConfidence: z.number().min(0).max(1),
  segments: z.array(TranscriptSegmentSchema),
})

// ─── Analysis ────────────────────────────────────────────────────────────────

export const ExtractedEntitySchema = z.object({
  text: z.string().min(1),
  type: EntityTypeSchema,
  confidence: z.number().min(0).max(1),
  evidentiaryWeight: EvidentiaryWeightSchema,
  context: z.string(),
})

export const KeyPhraseSchema = z.object({
  phrase: z.string().min(1),
  evidentiarySignificance: z.string(),
  legalRelevance: z.string(),
})

export const AnalyzeInputSchema = z.object({
  transcript: z.string().min(1, 'Transcript is required'),
  detectedLanguage: z.string().min(1, 'Language is required'),
})

export const AnalysisResultSchema = z.object({
  translatedText: z.string(),
  originalText: z.string(),
  entities: z.array(ExtractedEntitySchema),
  keyPhrases: z.array(KeyPhraseSchema),
  ambiguities: z.array(z.string()),
  sourceLanguage: z.string(),
})

// ─── Cross-Reference ─────────────────────────────────────────────────────────

export const CrossRefInputSchema = z.object({
  entities: z.array(ExtractedEntitySchema),
})

export const CrossReferenceMatchSchema = z.object({
  entityText: z.string(),
  matchedCaseId: z.string(),
  matchedCaseTitle: z.string(),
  matchType: MatchTypeSchema,
  corroborationStrength: z.number().min(0).max(0.99),
  source: CorroborationSourceSchema,
})

export const CrossReferenceResultSchema = z.object({
  matches: z.array(CrossReferenceMatchSchema),
  overallCorroborationScore: z.number().min(0).max(0.99),
})

// ─── Memo ────────────────────────────────────────────────────────────────────

export const CaseMetadataSchema = z.object({
  recordedAt: z.string(),
  location: z.string().default('Unknown'),
  sourceFile: z.string().default('text-input'),
})

export const MemoInputSchema = z.object({
  analysisResult: AnalysisResultSchema,
  crossReferenceResult: CrossReferenceResultSchema,
  caseMetadata: CaseMetadataSchema,
})

export const VeracityScoreSchema = z.object({
  score: z.number().min(0).max(0.99),
  basis: z.string(),
})

export const EvidentiaryMemoSchema = z.object({
  caseRef: z.string(),
  executiveSummary: z.string(),
  entityMap: z.array(ExtractedEntitySchema),
  corroborationAnalysis: z.string(),
  confidenceScore: z.number().min(0).max(0.99),
  flaggedInconsistencies: z.array(z.string()),
  recommendedFollowUp: z.array(z.string()),
  veracity: VeracityScoreSchema,
  generatedAt: z.string(),
  disclaimer: z.string(),
})

// ─── Voice ───────────────────────────────────────────────────────────────────

export const VoiceInputSchema = z.object({
  text: z.string().min(1).max(5000, 'Text must be under 5000 characters for voice synthesis'),
})
