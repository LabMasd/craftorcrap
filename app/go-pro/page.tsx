'use client'

import { useState, useEffect } from 'react'
import { useUser, SignInButton } from '@clerk/nextjs'
import Link from 'next/link'

const FEATURES = {
  free: [
    'Vote on public submissions',
    'Save favorites',
    'Track your votes',
    'Submit your work',
  ],
  solo: [
    'Everything in Free',
    'Create private boards',
    'Share with clients via link',
    'Password protection',
    'Up to 5 boards',
  ],
  studio: [
    'Everything in Solo',
    'Unlimited boards',
    'Team collaboration',
    'Custom branding',
    'Priority support',
    'Analytics dashboard',
  ],
}

export default function GoProPage() {
  const { isSignedIn, isLoaded } = useUser()
  const [darkMode, setDarkMode] = useState(true)
  const [currentPlan, setCurrentPlan] = useState<'free' | 'solo' | 'studio'>('free')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem('craftorcrap-theme')
    if (saved) setDarkMode(saved === 'dark')
  }, [])

  useEffect(() => {
    if (isSignedIn) {
      fetch('/api/pro/user')
        .then(res => res.json())
        .then(data => {
          if (data.plan) setCurrentPlan(data.plan)
          setLoading(false)
        })
        .catch(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [isSignedIn])

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-black text-white' : 'bg-neutral-50 text-black'}`}>
      {/* Header */}
      <header className={`sticky top-0 z-50 backdrop-blur-md border-b ${darkMode ? 'bg-black/80 border-white/5' : 'bg-white/80 border-black/5'}`}>
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
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
      <section className="max-w-5xl mx-auto px-4 py-16 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold mb-4">
          Get more from craftorcrap
        </h1>
        <p className={`text-lg max-w-2xl mx-auto ${darkMode ? 'text-white/60' : 'text-black/60'}`}>
          Create private boards, get feedback from clients, and collaborate with your team.
        </p>
      </section>

      {/* Pricing cards */}
      <section className="max-w-5xl mx-auto px-4 pb-20">
        <div className="grid md:grid-cols-3 gap-6">
          {/* Free */}
          <div className={`rounded-2xl p-6 border ${darkMode ? 'bg-white/[0.02] border-white/10' : 'bg-white border-black/10'}`}>
            <div className="mb-6">
              <h3 className="text-xl font-semibold mb-1">Free</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold">£0</span>
                <span className={darkMode ? 'text-white/40' : 'text-black/40'}>/month</span>
              </div>
            </div>
            <ul className="space-y-3 mb-8">
              {FEATURES.free.map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className={darkMode ? 'text-white/70' : 'text-black/70'}>{feature}</span>
                </li>
              ))}
            </ul>
            {currentPlan === 'free' ? (
              <div className={`w-full py-3 text-center rounded-lg border ${darkMode ? 'border-white/20 text-white/40' : 'border-black/20 text-black/40'}`}>
                Current plan
              </div>
            ) : (
              <div className={`w-full py-3 text-center rounded-lg ${darkMode ? 'bg-white/5 text-white/40' : 'bg-black/5 text-black/40'}`}>
                Free forever
              </div>
            )}
          </div>

          {/* Solo - Featured */}
          <div className={`rounded-2xl p-6 border-2 relative ${darkMode ? 'bg-white/[0.03] border-white' : 'bg-white border-black'}`}>
            <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-xs font-semibold rounded-full ${darkMode ? 'bg-white text-black' : 'bg-black text-white'}`}>
              Most Popular
            </div>
            <div className="mb-6">
              <h3 className="text-xl font-semibold mb-1">Solo</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold">£6.99</span>
                <span className={darkMode ? 'text-white/40' : 'text-black/40'}>/month</span>
              </div>
            </div>
            <ul className="space-y-3 mb-8">
              {FEATURES.solo.map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className={darkMode ? 'text-white/70' : 'text-black/70'}>{feature}</span>
                </li>
              ))}
            </ul>
            {!isLoaded || loading ? (
              <div className={`w-full py-3 text-center rounded-lg ${darkMode ? 'bg-white/10' : 'bg-black/10'} animate-pulse`}>
                Loading...
              </div>
            ) : currentPlan === 'solo' ? (
              <Link href="/pro" className={`block w-full py-3 text-center rounded-lg font-semibold transition-all ${darkMode ? 'bg-white text-black hover:bg-white/90' : 'bg-black text-white hover:bg-black/90'}`}>
                Go to Dashboard
              </Link>
            ) : isSignedIn ? (
              <button className={`w-full py-3 rounded-lg font-semibold transition-all ${darkMode ? 'bg-white text-black hover:bg-white/90' : 'bg-black text-white hover:bg-black/90'}`}>
                Upgrade to Solo
              </button>
            ) : (
              <SignInButton mode="modal">
                <button className={`w-full py-3 rounded-lg font-semibold transition-all ${darkMode ? 'bg-white text-black hover:bg-white/90' : 'bg-black text-white hover:bg-black/90'}`}>
                  Sign up for Solo
                </button>
              </SignInButton>
            )}
          </div>

          {/* Studio */}
          <div className={`rounded-2xl p-6 border ${darkMode ? 'bg-white/[0.02] border-white/10' : 'bg-white border-black/10'}`}>
            <div className="mb-6">
              <h3 className="text-xl font-semibold mb-1">Studio</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold">£24.99</span>
                <span className={darkMode ? 'text-white/40' : 'text-black/40'}>/month</span>
              </div>
            </div>
            <ul className="space-y-3 mb-8">
              {FEATURES.studio.map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className={darkMode ? 'text-white/70' : 'text-black/70'}>{feature}</span>
                </li>
              ))}
            </ul>
            {!isLoaded || loading ? (
              <div className={`w-full py-3 text-center rounded-lg ${darkMode ? 'bg-white/10' : 'bg-black/10'} animate-pulse`}>
                Loading...
              </div>
            ) : currentPlan === 'studio' ? (
              <Link href="/pro" className={`block w-full py-3 text-center rounded-lg font-semibold transition-all ${darkMode ? 'bg-white text-black hover:bg-white/90' : 'bg-black text-white hover:bg-black/90'}`}>
                Go to Dashboard
              </Link>
            ) : isSignedIn ? (
              <button className={`w-full py-3 rounded-lg font-semibold transition-all ${darkMode ? 'bg-white text-black hover:bg-white/90' : 'bg-black text-white hover:bg-black/90'}`}>
                Upgrade to Studio
              </button>
            ) : (
              <SignInButton mode="modal">
                <button className={`w-full py-3 rounded-lg font-semibold transition-all ${darkMode ? 'bg-white text-black hover:bg-white/90' : 'bg-black text-white hover:bg-black/90'}`}>
                  Sign up for Studio
                </button>
              </SignInButton>
            )}
          </div>
        </div>

        {/* FAQ or extra info */}
        <div className={`mt-16 text-center ${darkMode ? 'text-white/40' : 'text-black/40'}`}>
          <p className="text-sm">
            Questions? Email us at{' '}
            <a href="mailto:hello@craftorcrap.cc" className={`underline ${darkMode ? 'hover:text-white' : 'hover:text-black'}`}>
              hello@craftorcrap.cc
            </a>
          </p>
        </div>
      </section>
    </div>
  )
}
