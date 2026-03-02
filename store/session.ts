import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type {
  SessionState,
  ProcessingStep,
  TranscriptionResult,
  AnalysisResult,
  CrossReferenceResult,
  EvidentiaryMemo,
} from '@/types'

// ─── Audit Log ───────────────────────────────────────────────────────────────

export interface AuditEntry {
  timestamp: string
  step: string
  action: string
  detail?: string
  inputHash?: string
}

export interface SavedSession {
  id: string
  caseRef: string
  createdAt: string
  location: string
  sourceFile: string
  memo: EvidentiaryMemo
  analysisResult: AnalysisResult
  crossReferenceResult: CrossReferenceResult
  transcriptionResult: TranscriptionResult | null
  auditLog: AuditEntry[]
}

interface SessionStore extends SessionState {
  // Pipeline actions
  setStep: (step: ProcessingStep) => void
  setInputMode: (mode: 'audio' | 'text') => void
  setSourceFile: (name: string | null) => void
  setTranscriptionResult: (result: TranscriptionResult) => void
  setAnalysisResult: (result: AnalysisResult) => void
  setCrossReferenceResult: (result: CrossReferenceResult) => void
  setMemo: (memo: EvidentiaryMemo) => void
  setError: (error: string | null) => void
  clearResults: () => void
  reset: () => void

  // Audit log
  auditLog: AuditEntry[]
  addAuditEntry: (entry: Omit<AuditEntry, 'timestamp'>) => void

  // Session history
  savedSessions: SavedSession[]
  saveCurrentSession: (caseRef: string, location: string) => void
  deleteSavedSession: (id: string) => void
  loadSavedSession: (id: string) => void
}

const initialState: SessionState = {
  currentStep: 'idle',
  inputMode: null,
  sourceFile: null,
  transcriptionResult: null,
  analysisResult: null,
  crossReferenceResult: null,
  memo: null,
  error: null,
}

export const useSessionStore = create<SessionStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      auditLog: [],
      savedSessions: [],

      setStep: (step) => {
        set({ currentStep: step })
        get().addAuditEntry({ step, action: 'STEP_CHANGE' })
      },
      setInputMode: (mode) => set({ inputMode: mode }),
      setSourceFile: (name) => set({ sourceFile: name }),
      setTranscriptionResult: (result) => {
        set({ transcriptionResult: result })
        get().addAuditEntry({
          step: 'transcribing',
          action: 'TRANSCRIPTION_COMPLETE',
          detail: `Language: ${result.detectedLanguage}, Segments: ${result.segments.length}`,
        })
      },
      setAnalysisResult: (result) => {
        set({ analysisResult: result })
        get().addAuditEntry({
          step: 'analyzing',
          action: 'ANALYSIS_COMPLETE',
          detail: `Entities: ${result.entities.length}, Language: ${result.sourceLanguage}`,
        })
      },
      setCrossReferenceResult: (result) => {
        set({ crossReferenceResult: result })
        get().addAuditEntry({
          step: 'crossreferencing',
          action: 'CROSSREF_COMPLETE',
          detail: `Matches: ${result.matches.length}, Score: ${result.overallCorroborationScore}`,
        })
      },
      setMemo: (memo) => {
        set({ memo })
        get().addAuditEntry({
          step: 'generating',
          action: 'MEMO_GENERATED',
          detail: `CaseRef: ${memo.caseRef}, Confidence: ${memo.confidenceScore}`,
        })
      },
      setError: (error) => {
        set({ error, currentStep: error ? 'error' : 'idle' })
        if (error) {
          get().addAuditEntry({ step: 'error', action: 'ERROR', detail: error })
        }
      },
      clearResults: () => set({
        transcriptionResult: null,
        analysisResult: null,
        crossReferenceResult: null,
        memo: null,
        error: null,
      }),
      reset: () => set({ ...initialState, auditLog: [], savedSessions: get().savedSessions }),

      // Audit log
      addAuditEntry: (entry) => set((state) => ({
        auditLog: [
          ...state.auditLog,
          { ...entry, timestamp: new Date().toISOString() },
        ],
      })),

      // Session history
      saveCurrentSession: (caseRef, location) => {
        const state = get()
        if (!state.memo || !state.analysisResult || !state.crossReferenceResult) return
        const session: SavedSession = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          caseRef,
          createdAt: new Date().toISOString(),
          location,
          sourceFile: state.sourceFile || 'unknown',
          memo: state.memo,
          analysisResult: state.analysisResult,
          crossReferenceResult: state.crossReferenceResult,
          transcriptionResult: state.transcriptionResult,
          auditLog: state.auditLog,
        }
        set((s) => ({ savedSessions: [session, ...s.savedSessions].slice(0, 50) }))
      },
      deleteSavedSession: (id) => set((s) => ({
        savedSessions: s.savedSessions.filter((sess) => sess.id !== id),
      })),
      loadSavedSession: (id) => {
        const session = get().savedSessions.find((s) => s.id === id)
        if (!session) return
        set({
          memo: session.memo,
          analysisResult: session.analysisResult,
          crossReferenceResult: session.crossReferenceResult,
          transcriptionResult: session.transcriptionResult,
          currentStep: 'complete',
          auditLog: session.auditLog,
          sourceFile: session.sourceFile,
        })
      },
    }),
    {
      name: 'witness-session',
      storage: createJSONStorage(() => localStorage),
      // Only persist session history — NOT in-flight pipeline state
      partialize: (state) => ({
        savedSessions: state.savedSessions,
      }),
    }
  )
)
