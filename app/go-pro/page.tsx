'use client'

import { useState, useEffect } from 'react'
import { useUser, SignInButton } from '@clerk/nextjs'
import Link from 'next/link'

const FEATURES = [
  'Vote on submissions',
  'Save favorites to boards',
  'Organize with unlimited boards',
  'Submit your work',
  'Create your own community',
  'Share with anyone',
  'No limits, no paywalls',
]

export default function GoProPage() {
  const { isSignedIn, isLoaded } = useUser()
  const [darkMode, setDarkMode] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem('craftorcrap-theme')
    if (saved) setDarkMode(saved === 'dark')
  }, [])

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-black text-white' : 'bg-neutral-50 text-black'}`}>
      {/* Header */}
      <header className={`sticky top-0 z-50 backdrop-blur-md border-b ${darkMode ? 'bg-black/80 border-white/5' : 'bg-white/80 border-black/5'}`}>
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold">
            craft<span className={darkMode ? 'text-white/40' : 'text-black/40'}>or</span>crap
          </Link>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2 rounded-full transition-all ${darkMode ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
          >
            {darkMode ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-4 py-20 text-center">
        <div className={`inline-block px-4 py-1.5 rounded-full text-sm font-medium mb-6 ${darkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-500/10 text-emerald-600'}`}>
          100% Free
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold mb-4">
          Everything is free.
        </h1>
        <p className={`text-lg max-w-xl mx-auto mb-10 ${darkMode ? 'text-white/60' : 'text-black/60'}`}>
          No subscriptions, no paywalls, no limits. Just create, vote, and curate.
        </p>

        {/* Features */}
        <div className={`rounded-2xl p-8 border text-left max-w-md mx-auto ${darkMode ? 'bg-white/[0.02] border-white/10' : 'bg-white border-black/10'}`}>
          <ul className="space-y-4">
            {FEATURES.map((feature) => (
              <li key={feature} className="flex items-center gap-3">
                <svg className="w-5 h-5 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className={darkMode ? 'text-white/80' : 'text-black/80'}>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* CTA */}
        <div className="mt-10">
          {!isLoaded ? (
            <div className={`inline-block px-8 py-3 rounded-full ${darkMode ? 'bg-white/10' : 'bg-black/10'} animate-pulse`}>
              Loading...
            </div>
          ) : isSignedIn ? (
            <Link
              href="/dashboard"
              className={`inline-block px-8 py-3 rounded-full font-semibold transition-all ${darkMode ? 'bg-white text-black hover:bg-white/90' : 'bg-black text-white hover:bg-black/90'}`}
            >
              Go to Dashboard
            </Link>
          ) : (
            <SignInButton mode="modal">
              <button className={`px-8 py-3 rounded-full font-semibold transition-all ${darkMode ? 'bg-white text-black hover:bg-white/90' : 'bg-black text-white hover:bg-black/90'}`}>
                Get Started Free
              </button>
            </SignInButton>
          )}
        </div>

        {/* Bottom note */}
        <p className={`mt-16 text-sm ${darkMode ? 'text-white/30' : 'text-black/30'}`}>
          Built with love by the community, for the community.
        </p>
      </section>
    </div>
  )
}
