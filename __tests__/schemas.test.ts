import { describe, it, expect } from 'vitest'
import {
  EntityTypeSchema,
  EvidentiaryWeightSchema,
  MatchTypeSchema,
  CorroborationSourceSchema,
  ProcessingStepSchema,
  TranscriptSegmentSchema,
  TranscriptionResultSchema,
  ExtractedEntitySchema,
  AnalyzeInputSchema,
  AnalysisResultSchema,
  CrossRefInputSchema,
  CrossReferenceMatchSchema,
  CrossReferenceResultSchema,
  MemoInputSchema,
  EvidentiaryMemoSchema,
  VoiceInputSchema,
} from '../lib/schemas'

describe('Zod Schemas', () => {
  // ── Enum schemas ──────────────────────────────────────────────

  describe('EntityTypeSchema', () => {
    it('accepts valid entity types', () => {
      for (const t of ['PERSON', 'LOCATION', 'ORGANIZATION', 'DATE', 'INCIDENT', 'MILITARY_ID', 'SIGINT']) {
        expect(EntityTypeSchema.parse(t)).toBe(t)
      }
    })

    it('rejects invalid entity types', () => {
      expect(() => EntityTypeSchema.parse('ANIMAL')).toThrow()
    })
  })

  describe('CorroborationSourceSchema', () => {
    it('accepts all valid sources including AMNESTY and HRW', () => {
      for (const s of ['ICC', 'UN', 'ACLED', 'AMNESTY', 'HRW']) {
        expect(CorroborationSourceSchema.parse(s)).toBe(s)
      }
    })

    it('rejects removed sources', () => {
      expect(() => CorroborationSourceSchema.parse('IHL')).toThrow()
    })

    it('rejects arbitrary strings', () => {
      expect(() => CorroborationSourceSchema.parse('NATO')).toThrow()
    })
  })

  describe('ProcessingStepSchema', () => {
    it('accepts all pipeline steps', () => {
      for (const s of ['idle', 'uploading', 'transcribing', 'analyzing', 'crossreferencing', 'generating', 'complete', 'error']) {
        expect(ProcessingStepSchema.parse(s)).toBe(s)
      }
    })
  })

  // ── Object schemas ────────────────────────────────────────────

  describe('TranscriptSegmentSchema', () => {
    it('validates a correct segment', () => {
      const seg = { start: 0, end: 5.2, text: 'Hello world', confidence: 0.95 }
      expect(TranscriptSegmentSchema.parse(seg)).toEqual(seg)
    })

    it('rejects negative start', () => {
      expect(() => TranscriptSegmentSchema.parse({ start: -1, end: 5, text: 'x', confidence: 0.5 })).toThrow()
    })

    it('rejects confidence > 1', () => {
      expect(() => TranscriptSegmentSchema.parse({ start: 0, end: 1, text: 'x', confidence: 1.5 })).toThrow()
    })
  })

  describe('TranscriptionResultSchema', () => {
    it('validates a well-formed transcription result', () => {
      const result = {
        transcript: 'Some testimony text',
        detectedLanguage: 'en',
        languageConfidence: 0.98,
        segments: [{ start: 0, end: 3, text: 'Some testimony text', confidence: 0.98 }],
      }
      expect(TranscriptionResultSchema.parse(result)).toEqual(result)
    })

    it('rejects empty transcript', () => {
      expect(() =>
        TranscriptionResultSchema.parse({
          transcript: '',
          detectedLanguage: 'en',
          languageConfidence: 0.9,
          segments: [],
        })
      ).toThrow()
    })
  })

  describe('ExtractedEntitySchema', () => {
    const validEntity = {
      text: 'John Doe',
      type: 'PERSON',
      confidence: 0.85,
      evidentiaryWeight: 'HIGH',
      context: 'Witness identified John Doe as the commander',
    }

    it('validates a correct entity', () => {
      expect(ExtractedEntitySchema.parse(validEntity)).toEqual(validEntity)
    })

    it('rejects empty text', () => {
      expect(() => ExtractedEntitySchema.parse({ ...validEntity, text: '' })).toThrow()
    })

    it('rejects invalid type', () => {
      expect(() => ExtractedEntitySchema.parse({ ...validEntity, type: 'ANIMAL' })).toThrow()
    })
  })

  describe('AnalyzeInputSchema', () => {
    it('accepts valid input', () => {
      expect(AnalyzeInputSchema.parse({ transcript: 'test', detectedLanguage: 'en' })).toBeDefined()
    })

    it('rejects empty transcript', () => {
      expect(() => AnalyzeInputSchema.parse({ transcript: '', detectedLanguage: 'en' })).toThrow()
    })

    it('rejects missing language', () => {
      expect(() => AnalyzeInputSchema.parse({ transcript: 'test' })).toThrow()
    })
  })

  describe('CrossReferenceMatchSchema', () => {
    const validMatch = {
      entityText: 'Bucha',
      matchedCaseId: 'ICC-001',
      matchedCaseTitle: 'Test Case',
      matchType: 'EXACT',
      corroborationStrength: 0.85,
      source: 'ICC',
    }

    it('validates a correct match', () => {
      expect(CrossReferenceMatchSchema.parse(validMatch)).toEqual(validMatch)
    })

    it('rejects corroborationStrength >= 1', () => {
      expect(() => CrossReferenceMatchSchema.parse({ ...validMatch, corroborationStrength: 1.0 })).toThrow()
    })

    it('accepts AMNESTY as source', () => {
      expect(CrossReferenceMatchSchema.parse({ ...validMatch, source: 'AMNESTY' })).toBeDefined()
    })

    it('accepts HRW as source', () => {
      expect(CrossReferenceMatchSchema.parse({ ...validMatch, source: 'HRW' })).toBeDefined()
    })
  })

  describe('VoiceInputSchema', () => {
    it('accepts text within limits', () => {
      expect(VoiceInputSchema.parse({ text: 'Read this aloud' })).toBeDefined()
    })

    it('rejects empty text', () => {
      expect(() => VoiceInputSchema.parse({ text: '' })).toThrow()
    })

    it('rejects text over 5000 chars', () => {
      expect(() => VoiceInputSchema.parse({ text: 'x'.repeat(5001) })).toThrow()
    })
  })

  describe('EvidentiaryMemoSchema', () => {
    const validMemo = {
      caseRef: 'WIT-2025-001',
      executiveSummary: 'Summary text',
      entityMap: [],
      corroborationAnalysis: 'Analysis text',
      confidenceScore: 0.75,
      flaggedInconsistencies: [],
      recommendedFollowUp: [],
      veracity: { score: 0.8, basis: 'Cross-referenced against ICC' },
      generatedAt: '2025-01-01T00:00:00Z',
      disclaimer: 'AI-generated',
    }

    it('validates a correct memo', () => {
      expect(EvidentiaryMemoSchema.parse(validMemo)).toEqual(validMemo)
    })

    it('rejects confidence >= 1', () => {
      expect(() => EvidentiaryMemoSchema.parse({ ...validMemo, confidenceScore: 1.0 })).toThrow()
    })
  })
})
