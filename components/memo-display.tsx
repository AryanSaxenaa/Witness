'use client'

import { useState } from 'react'
import type { EvidentiaryMemo, CrossReferenceResult } from '@/types'
import { EntityTable } from './entity-table'
import { ConfidenceChart } from './confidence-chart'
import { CrossRefTable } from './cross-ref-table'
import { formatDate } from '@/lib/utils'

interface MemoDisplayProps {
  memo: EvidentiaryMemo
  crossReferenceResult?: CrossReferenceResult | null
  onExportPDF: () => void
  onGenerateVoice: () => void
  isGeneratingVoice?: boolean
}

export function MemoDisplay({
  memo,
  crossReferenceResult,
  onExportPDF,
  onGenerateVoice,
  isGeneratingVoice = false,
}: MemoDisplayProps) {
  const [activeTab, setActiveTab] = useState<'summary' | 'entities' | 'corroboration' | 'actions'>('summary')

  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify(memo, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `WITNESS-${memo.caseRef}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const tabs = [
    { key: 'summary' as const, label: 'Executive Summary' },
    { key: 'entities' as const, label: 'Entity Map' },
    { key: 'corroboration' as const, label: 'Corroboration' },
    { key: 'actions' as const, label: 'Follow-Up' },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Memo Header */}
      <div className="px-6 py-4 border-b border-witness-border bg-navy-light flex justify-between items-start flex-shrink-0">
        <div>
          <div className="text-xs text-witness-grey uppercase tracking-widest mb-1">
            Pre-Analysis Memo
          </div>
          <div className="font-serif text-lg">{memo.caseRef}</div>
          <div className="text-xs text-witness-grey mt-1">{formatDate(memo.generatedAt)}</div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold border border-witness-grey px-2 py-1 text-witness-grey tracking-wider">
            DRAFT
          </span>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex border-b border-witness-border flex-shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-3 text-xs uppercase tracking-wider transition-colors ${
              activeTab === tab.key
                ? 'text-white border-b-2 border-witness-red -mb-px'
                : 'text-witness-grey hover:text-white'
            }`}
            aria-selected={activeTab === tab.key}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'summary' && (
          <div className="flex flex-col gap-6">
            <div>
              <div className="text-xs text-witness-grey uppercase tracking-widest mb-2">
                Executive Summary
              </div>
              <p className="text-sm leading-relaxed text-white/90">{memo.executiveSummary}</p>
            </div>

            <ConfidenceChart score={memo.veracity.score} label="Veracity Score" />

            <div className="text-xs text-witness-grey border-l-2 border-witness-red pl-3">
              {memo.veracity.basis}
            </div>

            {memo.flaggedInconsistencies.length > 0 && (
              <div>
                <div className="text-xs text-witness-grey uppercase tracking-widest mb-2">
                  Flagged Inconsistencies
                </div>
                <ul className="flex flex-col gap-1">
                  {memo.flaggedInconsistencies.map((item, i) => (
                    <li key={i} className="text-sm text-yellow-300/90 flex gap-2">
                      <span className="text-witness-red flex-shrink-0">⚑</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {activeTab === 'entities' && (
          <EntityTable entities={memo.entityMap} />
        )}

        {activeTab === 'corroboration' && (
          <div className="flex flex-col gap-4">
            <div>
              <div className="text-xs text-witness-grey uppercase tracking-widest mb-2">
                Corroboration Analysis
              </div>
              <p className="text-sm leading-relaxed text-white/90">{memo.corroborationAnalysis}</p>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3 p-4 border border-witness-border bg-white/[0.02]">
                <div className="text-xs text-witness-grey uppercase tracking-widest">
                  AI Confidence Score
                </div>
                <div className="font-serif text-2xl text-witness-red ml-auto">
                  {(memo.confidenceScore * 100).toFixed(1)}%
                </div>
              </div>
              {crossReferenceResult && (
                <div className="flex items-center gap-3 p-4 border border-witness-border bg-white/[0.02]">
                  <div className="text-xs text-witness-grey uppercase tracking-widest">
                    Database Corroboration Score
                  </div>
                  <div className="font-serif text-2xl text-witness-red ml-auto">
                    {(crossReferenceResult.overallCorroborationScore * 100).toFixed(1)}%
                  </div>
                </div>
              )}
            </div>
            {crossReferenceResult && crossReferenceResult.matches.length > 0 && (
              <div>
                <div className="text-xs text-witness-grey uppercase tracking-widest mb-3 pb-2 border-b border-witness-border">
                  Database Matches
                </div>
                <CrossRefTable matches={crossReferenceResult.matches} />
              </div>
            )}
          </div>
        )}

        {activeTab === 'actions' && (
          <div>
            <div className="text-xs text-witness-grey uppercase tracking-widest mb-3">
              Recommended Follow-Up Actions
            </div>
            <ol className="flex flex-col gap-3">
              {memo.recommendedFollowUp.map((action, i) => (
                <li key={i} className="flex gap-3 text-sm text-white/90">
                  <span className="font-serif text-witness-red flex-shrink-0 w-5">{i + 1}.</span>
                  {action}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>

      {/* Action Bar */}
      <div className="flex gap-2 p-4 border-t border-witness-border flex-shrink-0">
        <button
          onClick={onGenerateVoice}
          disabled={isGeneratingVoice}
          className="flex-1 py-3 text-xs uppercase tracking-wider border border-witness-border text-witness-grey hover:border-white hover:text-white transition-colors disabled:opacity-50"
          aria-label="Generate audio readout via ElevenLabs"
        >
          {isGeneratingVoice ? 'Generating...' : '♪ Audio'}
        </button>
        <button
          onClick={handleExportJSON}
          className="py-3 px-4 text-xs uppercase tracking-wider border border-witness-border text-witness-grey hover:border-white hover:text-white transition-colors"
          aria-label="Export memo as JSON"
        >
          JSON
        </button>
        <button
          onClick={onExportPDF}
          className="flex-1 py-3 text-xs uppercase tracking-wider bg-witness-red border border-witness-red text-white hover:bg-witness-red-bright transition-colors"
          aria-label="Export memo as PDF"
        >
          Export PDF
        </button>
      </div>
    </div>
  )
}
