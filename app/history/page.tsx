'use client'

import { useRouter } from 'next/navigation'
import { useSessionStore, type SavedSession } from '@/store/session'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/theme-toggle'
import toast from 'react-hot-toast'

export default function HistoryPage() {
  const router = useRouter()
  const { savedSessions, loadSavedSession, deleteSavedSession } = useSessionStore()

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
    <div className="flex h-[calc(100vh-32px)] overflow-hidden">
      {/* Sidebar */}
      <nav className="w-[60px] flex-shrink-0 border-r border-white/10 flex items-center justify-center bg-[#050810]" aria-label="Navigation">
        <span
          className="font-serif text-xs tracking-wide text-white/30"
          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
        >
          Case History
        </span>
      </nav>

      <main className="flex-1 flex flex-col overflow-hidden" role="main" aria-label="Session history">
        {/* Header */}
        <header className="flex items-center justify-between px-8 py-4 border-b border-witness-border flex-shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="font-serif text-xl tracking-wide">WITNESS</h1>
            <span className="text-xs text-witness-grey border border-witness-border px-2 py-0.5 uppercase tracking-widest">
              Case History
            </span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              onClick={() => router.push('/')}
              className="text-xs uppercase tracking-wider border border-witness-border text-witness-grey hover:border-white hover:text-white transition-colors px-4 py-2"
            >
              ← New Analysis
            </button>
            <span className="text-xs text-witness-grey">{savedSessions.length} saved sessions</span>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
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
          ) : (
            <div className="flex flex-col gap-3">
              {/* Column headers */}
              <div className="grid grid-cols-[1fr_140px_120px_100px_80px_80px] gap-4 px-4 text-[10px] text-witness-grey uppercase tracking-widest border-b border-witness-border pb-2">
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
                  className="grid grid-cols-[1fr_140px_120px_100px_80px_80px] gap-4 px-4 py-3 border border-witness-border/50 bg-white/[0.02] hover:bg-white/[0.04] transition-colors items-center"
                >
                  <div>
                    <div className="text-sm text-white font-medium">{session.caseRef}</div>
                    <div className="text-[10px] text-witness-grey mt-0.5">{session.sourceFile}</div>
                  </div>
                  <div className="text-xs text-witness-grey">{formatDate(session.createdAt)}</div>
                  <div className="text-xs text-witness-grey truncate" title={session.location}>
                    {session.location}
                  </div>
                  <div className="text-xs">
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
                    {session.crossReferenceResult.matches.length}
                  </div>
                  <div className="flex gap-1">
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
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
