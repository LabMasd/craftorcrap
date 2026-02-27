'use client'

import { useState, useEffect } from 'react'
import { SignedIn } from '@clerk/nextjs'
import ActiveBoardButton from './ActiveBoardButton'

interface FloatingToolbarProps {
  darkMode: boolean
  show: boolean
  onFilterClick: () => void
  onColorClick: () => void
  activeCategory: string
  activeColor: string | null
}

export default function FloatingToolbar({
  darkMode,
  show,
  onFilterClick,
  onColorClick,
  activeCategory,
  activeColor,
}: FloatingToolbarProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (show) {
      // Small delay for smooth appearance
      const timer = setTimeout(() => setIsVisible(true), 50)
      return () => clearTimeout(timer)
    } else {
      setIsVisible(false)
    }
  }, [show])

  if (!show) return null

  return (
    <div
      className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-40 transition-all duration-300 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <div
        className={`flex items-center gap-2 px-2 py-2 rounded-full shadow-2xl border backdrop-blur-xl ${
          darkMode
            ? 'bg-neutral-900/90 border-white/10'
            : 'bg-white/90 border-black/10'
        }`}
      >
        {/* Filter button */}
        <button
          onClick={onFilterClick}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-full transition-all ${
            activeCategory !== 'all'
              ? darkMode ? 'bg-white text-black' : 'bg-black text-white'
              : darkMode ? 'bg-white/10 text-white/70 hover:bg-white/20' : 'bg-black/10 text-black/70 hover:bg-black/20'
          }`}
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          {activeCategory !== 'all' ? activeCategory : 'Filter'}
        </button>

        {/* Color button */}
        <button
          onClick={onColorClick}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-full transition-all ${
            activeColor
              ? darkMode ? 'bg-white text-black' : 'bg-black text-white'
              : darkMode ? 'bg-white/10 text-white/70 hover:bg-white/20' : 'bg-black/10 text-black/70 hover:bg-black/20'
          }`}
        >
          {activeColor ? (
            <span className="w-3 h-3 rounded-full border border-current" style={{ backgroundColor: activeColor }} />
          ) : (
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
          )}
          Color
        </button>

        {/* Board button - only for signed in */}
        <SignedIn>
          <ActiveBoardButton darkMode={darkMode} />
        </SignedIn>

        {/* Scroll to top button */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className={`p-2 rounded-full transition-all ${
            darkMode ? 'bg-white/10 text-white/70 hover:bg-white/20' : 'bg-black/10 text-black/70 hover:bg-black/20'
          }`}
          title="Scroll to top"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
        </button>
      </div>
    </div>
  )
}
