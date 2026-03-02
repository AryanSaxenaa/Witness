import { create } from 'zustand'
import type {
  SessionState,
  ProcessingStep,
  TranscriptionResult,
  AnalysisResult,
  CrossReferenceResult,
  EvidentiaryMemo,
} from '@/types'

interface SessionStore extends SessionState {
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

export const useSessionStore = create<SessionStore>((set) => ({
  ...initialState,
  setStep: (step) => set({ currentStep: step }),
  setInputMode: (mode) => set({ inputMode: mode }),
  setSourceFile: (name) => set({ sourceFile: name }),
  setTranscriptionResult: (result) => set({ transcriptionResult: result }),
  setAnalysisResult: (result) => set({ analysisResult: result }),
  setCrossReferenceResult: (result) => set({ crossReferenceResult: result }),
  setMemo: (memo) => set({ memo }),
  setError: (error) => set({ error, currentStep: error ? 'error' : 'idle' }),
  clearResults: () => set({
    transcriptionResult: null,
    analysisResult: null,
    crossReferenceResult: null,
    memo: null,
    error: null,
  }),
  reset: () => set(initialState),
}))
