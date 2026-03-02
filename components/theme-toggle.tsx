'use client'

import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'

export function ThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const saved = document.documentElement.getAttribute('data-theme') as 'dark' | 'light'
    setTheme(saved || 'dark')
  }, [])

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('witness-theme', next)
  }

  if (!mounted) return null

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-1.5 text-xs uppercase tracking-wider border border-witness-border text-witness-grey hover:border-white hover:text-white transition-colors px-3 py-1.5"
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? (
        <Sun size={12} strokeWidth={2} />
      ) : (
        <Moon size={12} strokeWidth={2} />
      )}
    </button>
  )
}
