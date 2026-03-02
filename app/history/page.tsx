'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSessionStore, type SavedSession, type CaseFile } from '@/store/session'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/theme-toggle'
import { PageTransition } from '@/components/page-transition'
import toast from 'react-hot-toast'

export default function HistoryPage() {
  const router = useRouter()
  const { savedSessions, loadSavedSession, deleteSavedSession, caseFiles, createCaseFile, deleteCaseFile, assignSessionToCaseFile } = useSessionStore()
  const [viewMode, setViewMode] = useState<'flat' | 'cases'>('flat')
  const [showNewCaseForm, setShowNewCaseForm] = useState(false)
  const [newCaseName, setNewCaseName] = useState('')
  const [newCaseDesc, setNewCaseDesc] = useState('')

  const handleLoad = (session: SavedSession) => {
    loadSavedSession(session.id)
    toast.success(`Loaded session ${session.caseRef}`)
    router.push('/results')
  }

  const handleDelete = (id: string, caseRef: string) => {
    deleteSavedSession(id)
    toast.success(`Deleted session ${caseRef}`)
  }

  return (
    <PageTransition>
    <div className="flex flex-col md:flex-row h-[calc(100vh-32px)] overflow-hidden">
      {/* Sidebar — hidden on mobile */}
      <nav className="hidden md:w-[60px] md:flex flex-shrink-0 border-r border-white/10 items-center justify-center bg-[#050810]" aria-label="Navigation">
        <span
          className="font-serif text-xs tracking-wide text-white/30"
          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
        >
          Case History
        </span>
      </nav>

      <main className="flex-1 flex flex-col overflow-hidden" role="main" aria-label="Session history">
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between px-4 md:px-8 py-4 border-b border-witness-border flex-shrink-0 gap-2">
          <div className="flex items-center gap-4">
            <h1 className="font-serif text-xl tracking-wide">WITNESS</h1>
            <span className="text-xs text-witness-grey border border-witness-border px-2 py-0.5 uppercase tracking-widest">
              Case History
            </span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              onClick={() => router.push('/compare')}
              className="text-xs uppercase tracking-wider border border-witness-border text-witness-grey hover:border-white hover:text-white transition-colors px-3 py-1.5"
              aria-label="Compare testimonies"
            >
              Compare
            </button>
            <button
              onClick={() => router.push('/')}
              className="text-xs uppercase tracking-wider border border-witness-border text-witness-grey hover:border-white hover:text-white transition-colors px-4 py-2"
            >
              ← New Analysis
            </button>
            <span className="text-xs text-witness-grey">{savedSessions.length} saved sessions</span>
          </div>
        </header>

        {/* View Mode Toggle & Case File Controls */}
        <div className="flex flex-wrap items-center gap-3 px-4 md:px-8 py-3 border-b border-witness-border bg-navy-light">
          <div className="flex gap-1">
            <button
              onClick={() => setViewMode('flat')}
              className={cn(
                'px-3 py-1 text-[10px] uppercase tracking-wider border transition-colors',
                viewMode === 'flat'
                  ? 'border-witness-red bg-witness-red/20 text-white'
                  : 'border-witness-border text-witness-grey hover:text-white'
              )}
            >
              All Sessions
            </button>
            <button
              onClick={() => setViewMode('cases')}
              className={cn(
                'px-3 py-1 text-[10px] uppercase tracking-wider border transition-colors',
                viewMode === 'cases'
                  ? 'border-witness-red bg-witness-red/20 text-white'
                  : 'border-witness-border text-witness-grey hover:text-white'
              )}
            >
              Case Files ({caseFiles.length})
            </button>
          </div>
          {viewMode === 'cases' && (
            <button
              onClick={() => setShowNewCaseForm(!showNewCaseForm)}
              className="px-3 py-1 text-[10px] uppercase tracking-wider border border-witness-border text-witness-grey hover:border-green-500 hover:text-green-400 transition-colors"
            >
              + New Case File
            </button>
          )}
        </div>

        {/* New Case File Form */}
        {showNewCaseForm && viewMode === 'cases' && (
          <div className="px-4 md:px-8 py-4 border-b border-witness-border bg-navy-light flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="text-[10px] text-witness-grey uppercase tracking-widest block mb-1">Case Name</label>
              <input
                type="text"
                value={newCaseName}
                onChange={(e) => setNewCaseName(e.target.value)}
                className="w-full bg-navy border border-witness-border text-white text-sm px-3 py-1.5 focus:border-witness-red outline-none"
                placeholder="e.g. Kherson Oblast Investigation"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-[10px] text-witness-grey uppercase tracking-widest block mb-1">Description</label>
              <input
                type="text"
                value={newCaseDesc}
                onChange={(e) => setNewCaseDesc(e.target.value)}
                className="w-full bg-navy border border-witness-border text-white text-sm px-3 py-1.5 focus:border-witness-red outline-none"
                placeholder="Brief description..."
              />
            </div>
            <button
              onClick={() => {
                if (newCaseName.trim()) {
                  createCaseFile(newCaseName.trim(), newCaseDesc.trim())
                  setNewCaseName('')
                  setNewCaseDesc('')
                  setShowNewCaseForm(false)
                  toast.success('Case file created')
                }
              }}
              className="px-4 py-1.5 text-xs uppercase tracking-wider bg-witness-red border border-witness-red text-white hover:bg-witness-red-bright transition-colors"
            >
              Create
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {savedSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="font-serif text-lg text-witness-grey/50">No saved sessions</div>
              <p className="text-xs text-witness-grey/40">
                Complete an analysis and it will automatically appear here.
              </p>
              <button
                onClick={() => router.push('/')}
                className="mt-4 px-6 py-2 text-xs uppercase tracking-wider border border-witness-red text-witness-red hover:bg-witness-red hover:text-white transition-colors"
              >
                Start Analysis
              </button>
            </div>
          ) : viewMode === 'cases' ? (
            /* ─── Case Files View ─── */
            <div className="flex flex-col gap-6">
              {caseFiles.length === 0 ? (
                <div className="text-center py-12">
                  <div className="font-serif text-lg text-witness-grey/50 mb-2">No case files yet</div>
                  <p className="text-xs text-witness-grey">Create a case file to group related testimonies together.</p>
                </div>
              ) : (
                caseFiles.map((cf) => {
                  const cfSessions = savedSessions.filter((s) => s.caseFileId === cf.id)
                  return (
                    <div key={cf.id} className="border border-witness-border">
                      <div className="flex items-center justify-between px-4 py-3 bg-navy-light border-b border-witness-border">
                        <div>
                          <div className="font-serif text-sm">{cf.name}</div>
                          {cf.description && <div className="text-[10px] text-witness-grey mt-0.5">{cf.description}</div>}
                          <div className="text-[10px] text-witness-grey mt-0.5">{cfSessions.length} testimonies · Created {formatDate(cf.createdAt)}</div>
                        </div>
                        <button
                          onClick={() => { deleteCaseFile(cf.id); toast.success(`Deleted case file "${cf.name}"`) }}
                          className="px-2 py-1 text-[10px] uppercase tracking-wider border border-witness-border text-witness-grey hover:border-red-500 hover:text-red-400 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                      {cfSessions.length === 0 ? (
                        <div className="px-4 py-6 text-center text-xs text-witness-grey italic">
                          No testimonies assigned. Use the dropdown on sessions in &quot;All Sessions&quot; view.
                        </div>
                      ) : (
                        <div className="flex flex-col">
                          {cfSessions.map((session) => (
                            <div key={session.id} className="flex flex-wrap items-center gap-4 px-4 py-2 border-b border-witness-border/30 hover:bg-white/[0.02]">
                              <span className="text-sm text-white font-medium">{session.caseRef}</span>
                              <span className="text-xs text-witness-grey">{session.location}</span>
                              <span className="text-xs text-witness-grey ml-auto">{formatDate(session.createdAt)}</span>
                              <button onClick={() => handleLoad(session)} className="px-2 py-0.5 text-[10px] uppercase tracking-wider border border-witness-red/60 text-witness-red hover:bg-witness-red hover:text-white transition-colors">Open</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })
              )}

              {/* Unassigned sessions */}
              {savedSessions.filter((s) => !s.caseFileId).length > 0 && (
                <div className="border border-witness-border/50">
                  <div className="px-4 py-3 bg-navy-light border-b border-witness-border/50">
                    <div className="text-xs text-witness-grey uppercase tracking-widest">Unassigned Sessions</div>
                  </div>
                  {savedSessions.filter((s) => !s.caseFileId).map((session) => (
                    <div key={session.id} className="flex flex-wrap items-center gap-3 px-4 py-2 border-b border-witness-border/20 hover:bg-white/[0.02]">
                      <span className="text-sm text-white">{session.caseRef}</span>
                      <span className="text-xs text-witness-grey">{session.location}</span>
                      <select
                        className="ml-auto bg-navy border border-witness-border text-witness-grey text-[10px] px-2 py-0.5 focus:border-witness-red outline-none"
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            assignSessionToCaseFile(session.id, e.target.value)
                            toast.success('Session assigned to case file')
                          }
                        }}
                      >
                        <option value="">Assign to case...</option>
                        {caseFiles.map((cf) => (
                          <option key={cf.id} value={cf.id}>{cf.name}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {/* Column headers — desktop only */}
              <div className="hidden md:grid grid-cols-[1fr_140px_120px_100px_80px_80px] gap-4 px-4 text-[10px] text-witness-grey uppercase tracking-widest border-b border-witness-border pb-2">
                <span>Case Reference</span>
                <span>Date</span>
                <span>Location</span>
                <span>Confidence</span>
                <span>Matches</span>
                <span>Actions</span>
              </div>

              {savedSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex flex-col gap-2 md:grid md:grid-cols-[1fr_140px_120px_100px_80px_80px] md:gap-4 px-4 py-3 border border-witness-border/50 bg-white/[0.02] hover:bg-white/[0.04] transition-colors md:items-center"
                >
                  <div>
                    <div className="text-sm text-white font-medium">{session.caseRef}</div>
                    <div className="text-[10px] text-witness-grey mt-0.5">{session.sourceFile}</div>
                  </div>
                  <div className="text-xs text-witness-grey">
                    <span className="md:hidden text-[10px] uppercase tracking-widest mr-2">Date:</span>
                    {formatDate(session.createdAt)}
                  </div>
                  <div className="text-xs text-witness-grey truncate" title={session.location}>
                    <span className="md:hidden text-[10px] uppercase tracking-widest mr-2">Location:</span>
                    {session.location}
                  </div>
                  <div className="text-xs">
                    <span className="md:hidden text-[10px] text-witness-grey uppercase tracking-widest mr-2">Confidence:</span>
                    <span className={cn(
                      'px-1.5 py-0.5 border',
                      session.memo.confidenceScore >= 0.7
                        ? 'border-green-600 text-green-400 bg-green-900/20'
                        : session.memo.confidenceScore >= 0.4
                          ? 'border-yellow-600 text-yellow-400 bg-yellow-900/20'
                          : 'border-red-600 text-red-400 bg-red-900/20'
                    )}>
                      {(session.memo.confidenceScore * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="text-xs text-witness-grey">
                    <span className="md:hidden text-[10px] uppercase tracking-widest mr-2">Matches:</span>
                    {session.crossReferenceResult.matches.length}
                  </div>
                  <div className="flex gap-1 items-center">
                    <button
                      onClick={() => handleLoad(session)}
                      className="px-2 py-1 text-[10px] uppercase tracking-wider border border-witness-red/60 text-witness-red hover:bg-witness-red hover:text-white transition-colors"
                      aria-label={`Open session ${session.caseRef}`}
                    >
                      Open
                    </button>
                    <button
                      onClick={() => handleDelete(session.id, session.caseRef)}
                      className="px-2 py-1 text-[10px] uppercase tracking-wider border border-witness-border text-witness-grey hover:border-red-500 hover:text-red-400 transition-colors"
                      aria-label={`Delete session ${session.caseRef}`}
                    >
                      ×
                    </button>
                    {caseFiles.length > 0 && (
                      <select
                        className="bg-navy border border-witness-border text-witness-grey text-[10px] px-1 py-0.5 focus:border-witness-red outline-none max-w-[80px]"
                        value={session.caseFileId ?? ''}
                        onChange={(e) => {
                          assignSessionToCaseFile(session.id, e.target.value || null)
                          toast.success(e.target.value ? 'Assigned to case' : 'Unassigned from case')
                        }}
                        aria-label={`Assign ${session.caseRef} to case file`}
                      >
                        <option value="">No case</option>
                        {caseFiles.map((cf) => (
                          <option key={cf.id} value={cf.id}>{cf.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
    </PageTransition>
  )
}
