'use client'

import { Component, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex items-center justify-center h-screen bg-navy">
          <div className="max-w-lg p-8 border border-witness-border bg-navy-light">
            <div className="text-xs text-witness-grey uppercase tracking-widest mb-3">
              System Error
            </div>
            <h1 className="font-serif text-xl text-white mb-4">
              Something went wrong
            </h1>
            <p className="text-sm text-witness-grey mb-6">
              An unexpected error occurred. Your testimony data has not been stored or transmitted.
            </p>
            {this.state.error && (
              <div className="p-3 border border-red-900 bg-red-950/30 text-red-300 text-xs mb-6 break-words">
                {this.state.error.message}
              </div>
            )}
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null })
                window.location.href = '/'
              }}
              className="px-6 py-3 text-xs uppercase tracking-wider bg-witness-red border border-witness-red text-white hover:bg-witness-red-bright transition-colors"
            >
              Return to Intake
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
