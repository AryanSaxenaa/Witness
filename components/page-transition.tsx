'use client'

import { useEffect, useState, type ReactNode } from 'react'

interface PageTransitionProps {
  children: ReactNode
}

/**
 * CSS-based page entrance animation.
 * Fades in + slides up on mount. No external dependencies.
 */
export function PageTransition({ children }: PageTransitionProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Small delay to ensure CSS transition fires
    const raf = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div
      className="page-transition-wrapper"
      style={{
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(8px)',
        transition: 'opacity 0.35s ease-out, transform 0.35s ease-out',
        height: '100%',
      }}
    >
      {children}
    </div>
  )
}
