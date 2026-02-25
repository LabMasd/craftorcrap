'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function AboutPage() {
  const [darkMode, setDarkMode] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem('craftorcrap-theme')
    if (saved) setDarkMode(saved === 'dark')
  }, [])

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-black text-white' : 'bg-white text-black'}`}>
      <header className={`border-b ${darkMode ? 'border-white/10' : 'border-black/10'}`}>
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            craft<span className={darkMode ? 'text-white/40' : 'text-black/40'}>or</span>crap
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16 sm:py-24">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-12">
          The Manifesto
        </h1>

        <div className={`space-y-8 text-lg sm:text-xl leading-relaxed ${darkMode ? 'text-white/70' : 'text-black/70'}`}>
          <p>
            <span className={darkMode ? 'text-white' : 'text-black'}>Too much mediocre work gets celebrated.</span>{' '}
            Algorithms reward engagement, not quality. Likes are free. Praise is cheap.
          </p>

          <p>
            <span className={darkMode ? 'text-white' : 'text-black'}>We built craftorcrap to cut through the noise.</span>{' '}
            One question. Two buttons. No middle ground.
          </p>

          <p>
            Is it craft? Or is it crap?
          </p>

          <div className={`border-l-2 pl-6 my-12 ${darkMode ? 'border-white/20' : 'border-black/20'}`}>
            <p className={`text-2xl sm:text-3xl font-medium ${darkMode ? 'text-white' : 'text-black'}`}>
              "Good design is honest."
            </p>
            <p className={`mt-2 text-base ${darkMode ? 'text-white/40' : 'text-black/40'}`}>
              — Dieter Rams
            </p>
          </div>

          <p>
            <span className={darkMode ? 'text-white' : 'text-black'}>No ads. No influencers. No sponsored posts.</span>{' '}
            Just work, and the honest verdict of the community.
          </p>

          <p>
            Submit your best. Vote with conviction. Let the work speak for itself.
          </p>

          <p>
            <span className={darkMode ? 'text-white' : 'text-black'}>If it's good, we'll know.</span>{' '}
            If it's not, we'll know that too.
          </p>
        </div>

        <div className="mt-16 pt-8 border-t border-dashed ${darkMode ? 'border-white/10' : 'border-black/10'}">
          <Link
            href="/"
            className={`inline-flex items-center gap-2 text-sm font-medium ${darkMode ? 'text-white/50 hover:text-white' : 'text-black/50 hover:text-black'} transition-colors`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to voting
          </Link>
        </div>
      </main>
    </div>
  )
}
