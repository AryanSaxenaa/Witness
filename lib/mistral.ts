import { Mistral } from '@mistralai/mistralai'
import { getEnv } from '@/lib/env'
import { AnalysisResultSchema, EvidentiaryMemoSchema } from '@/lib/schemas'
import type { AnalysisResult, CaseMetadata, CrossReferenceResult, EvidentiaryMemo } from '@/types'

function getMistral() {
  return new Mistral({ apiKey: getEnv().MISTRAL_API_KEY })
}

// ─── System Prompts ──────────────────────────────────────────────────────────

export const ANALYSIS_SYSTEM_PROMPT = `You are a legal linguistics analyst specializing in international criminal law and human rights documentation. You are processing testimony evidence that may be used in ICC proceedings.

Your task is to analyze testimony text and return a structured JSON object. You must:

1. TRANSLATE the testimony to English if it is not already in English.
   - Preserve legally significant phrasing — do NOT simplify nuanced language
   - A phrase like "he came at night with the others" carries specific evidentiary weight; preserve the exact construction
   - Flag phrases where literal translation differs significantly from colloquial meaning

2. EXTRACT all entities and classify them as exactly one of:
   - PERSON: Named individuals, described roles ("the commander")
   - LOCATION: Geographic locations, buildings, infrastructure
   - ORGANIZATION: Military units, government bodies, armed groups
   - DATE: Any temporal reference, explicit or relative
   - INCIDENT: Specific acts (detention, attack, displacement, killing)
   - MILITARY_ID: Vehicle markings, unit insignia, uniforms, equipment
   - SIGINT: Radio callsigns, frequencies, communication references

3. ASSIGN evidentiaryWeight to each entity:
   - HIGH: Specific, verifiable, corroborable
   - MEDIUM: Plausible but requires corroboration
   - LOW: Vague, general, or potentially unreliable

4. IDENTIFY keyPhrases with specific legal significance under IHL/ICL.

5. FLAG all ambiguities, contradictions, or gaps as an array of strings.

Return ONLY a valid JSON object. No prose. No markdown fences. No explanation outside the JSON.
Exact structure required:
{
  "translatedText": "string",
  "originalText": "string",
  "entities": [{"text":"string","type":"PERSON|LOCATION|ORGANIZATION|DATE|INCIDENT|MILITARY_ID|SIGINT","confidence":0.0,"evidentiaryWeight":"HIGH|MEDIUM|LOW","context":"string"}],
  "keyPhrases": [{"phrase":"string","evidentiarySignificance":"string","legalRelevance":"string"}],
  "ambiguities": ["string"],
  "sourceLanguage": "string"
}`

export const MEMO_SYSTEM_PROMPT = `You are a senior legal analyst drafting an evidentiary pre-analysis memo for review by ICC legal staff.

You have been provided:
- Translated testimony with extracted entities and key phrases
- Cross-reference results showing matches to known ICC cases and UN incidents

Draft a structured evidentiary memo. Be precise, formal, and legally conservative. Never overstate confidence. Always cap confidence scores below 1.0.

Return ONLY a valid JSON object. No prose. No markdown. Exact structure:
{
  "caseRef": "string — format XX-YYYY-N## based on location and date",
  "executiveSummary": "string — 3 to 5 sentences in formal legal register",
  "corroborationAnalysis": "string — paragraph analyzing database matches",
  "confidenceScore": 0.0,
  "flaggedInconsistencies": ["string"],
  "recommendedFollowUp": ["string — specific actionable investigative steps"],
  "veracity": {"score": 0.0, "basis": "string — explain scoring basis"},
  "disclaimer": "AI-assisted pre-analysis only. Not a legal document. Not admissible as evidence. Must be reviewed by qualified legal counsel before use in any legal proceeding."
}`

// ─── Analysis Call ───────────────────────────────────────────────────────────

export async function analyzeTestimony(
  transcript: string,
  detectedLanguage: string
): Promise<AnalysisResult> {
  const languageHint = detectedLanguage === 'auto'
    ? 'Auto-detect the source language from the content.'
    : `Source language: ${detectedLanguage}.`

  const userMessage = `Analyze the following testimony. ${languageHint}

TESTIMONY:
${transcript}`

  const response = await getMistral().chat.complete({
    model: 'mistral-large-latest',
    messages: [
      { role: 'system', content: ANALYSIS_SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.1,
    maxTokens: 4096,
  })

  const content = response.choices?.[0]?.message?.content
  if (!content || typeof content !== 'string') {
    throw new Error('Mistral returned empty response')
  }

  const cleaned = content
    .trim()
    .replace(/^```(?:json)?\s*\n?/i, '')
    .replace(/\n?\s*```\s*$/i, '')
    .trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error(`Mistral returned invalid JSON: ${cleaned.slice(0, 200)}`)
  }

  const result = AnalysisResultSchema.safeParse(parsed)
  if (!result.success) {
    throw new Error(`Analysis schema validation failed: ${result.error.message}`)
  }

  return result.data
}

// ─── Streaming Analysis Call ──────────────────────────────────────────────────

export async function* analyzeTestimonyStream(
  transcript: string,
  detectedLanguage: string
): AsyncGenerator<string, AnalysisResult> {
  const languageHint = detectedLanguage === 'auto'
    ? 'Auto-detect the source language from the content.'
    : `Source language: ${detectedLanguage}.`

  const userMessage = `Analyze the following testimony. ${languageHint}

TESTIMONY:
${transcript}`

  const stream = await getMistral().chat.stream({
    model: 'mistral-large-latest',
    messages: [
      { role: 'system', content: ANALYSIS_SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.1,
    maxTokens: 4096,
  })

  let accumulated = ''
  for await (const event of stream) {
    const delta = event.data?.choices?.[0]?.delta?.content
    if (delta && typeof delta === 'string') {
      accumulated += delta
      yield delta
    }
  }

  const cleaned = accumulated
    .trim()
    .replace(/^```(?:json)?\s*\n?/i, '')
    .replace(/\n?\s*```\s*$/i, '')
    .trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error(`Mistral returned invalid JSON: ${cleaned.slice(0, 200)}`)
  }

  const result = AnalysisResultSchema.safeParse(parsed)
  if (!result.success) {
    throw new Error(`Analysis schema validation failed: ${result.error.message}`)
  }

  return result.data
}

// ─── Memo Generation Call ────────────────────────────────────────────────────

export async function generateMemo(
  analysisResult: AnalysisResult,
  crossReferenceResult: CrossReferenceResult,
  caseMetadata: CaseMetadata
): Promise<EvidentiaryMemo> {
  const userMessage = `Generate an evidentiary memo from the following analysis.

CASE METADATA:
- Recorded: ${caseMetadata.recordedAt}
- Location: ${caseMetadata.location}
- Source: ${caseMetadata.sourceFile}

ANALYSIS RESULT:
${JSON.stringify(analysisResult, null, 2)}

CROSS-REFERENCE RESULTS:
${JSON.stringify(crossReferenceResult, null, 2)}`

  const response = await getMistral().chat.complete({
    model: 'mistral-large-latest',
    messages: [
      { role: 'system', content: MEMO_SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.2,
    maxTokens: 2048,
  })

  const content = response.choices?.[0]?.message?.content
  if (!content || typeof content !== 'string') {
    throw new Error('Mistral returned empty memo response')
  }

  const cleaned = content
    .trim()
    .replace(/^```(?:json)?\s*\n?/i, '')
    .replace(/\n?\s*```\s*$/i, '')
    .trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error(`Mistral memo returned invalid JSON`)
  }

  const withMeta = {
    ...(parsed as object),
    entityMap: analysisResult.entities,
    generatedAt: new Date().toISOString(),
  }

  const result = EvidentiaryMemoSchema.safeParse(withMeta)
  if (!result.success) {
    throw new Error(`Memo schema validation failed: ${result.error.message}`)
  }

  return result.data
}

// ─── Streaming Memo Generation Call ──────────────────────────────────────────

export async function* generateMemoStream(
  analysisResult: AnalysisResult,
  crossReferenceResult: CrossReferenceResult,
  caseMetadata: CaseMetadata
): AsyncGenerator<string, EvidentiaryMemo> {
  const userMessage = `Generate an evidentiary memo from the following analysis.

CASE METADATA:
- Recorded: ${caseMetadata.recordedAt}
- Location: ${caseMetadata.location}
- Source: ${caseMetadata.sourceFile}

ANALYSIS RESULT:
${JSON.stringify(analysisResult, null, 2)}

CROSS-REFERENCE RESULTS:
${JSON.stringify(crossReferenceResult, null, 2)}`

  const stream = await getMistral().chat.stream({
    model: 'mistral-large-latest',
    messages: [
      { role: 'system', content: MEMO_SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.2,
    maxTokens: 2048,
  })

  let accumulated = ''
  for await (const event of stream) {
    const delta = event.data?.choices?.[0]?.delta?.content
    if (delta && typeof delta === 'string') {
      accumulated += delta
      yield delta
    }
  }

  const cleaned = accumulated
    .trim()
    .replace(/^```(?:json)?\s*\n?/i, '')
    .replace(/\n?\s*```\s*$/i, '')
    .trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error(`Mistral memo returned invalid JSON`)
  }

  const withMeta = {
    ...(parsed as object),
    entityMap: analysisResult.entities,
    generatedAt: new Date().toISOString(),
  }

  const memoResult = EvidentiaryMemoSchema.safeParse(withMeta)
  if (!memoResult.success) {
    throw new Error(`Memo schema validation failed: ${memoResult.error.message}`)
  }

  return memoResult.data
}
