'use client'

import { useState, useEffect } from 'react'
import { useUser, SignInButton, UserButton } from '@clerk/nextjs'
import Link from 'next/link'
import DashboardTabs from '@/components/dashboard/DashboardTabs'
import VoteHistory from '@/components/dashboard/VoteHistory'
import SavedItems from '@/components/dashboard/SavedItems'
import MySubmissions from '@/components/dashboard/MySubmissions'
import MyBoards from '@/components/dashboard/MyBoards'

type TabType = 'votes' | 'saved' | 'boards' | 'submissions'

export default function DashboardPage() {
  const { user, isLoaded, isSignedIn } = useUser()
  const [activeTab, setActiveTab] = useState<TabType>('boards')
  const [counts, setCounts] = useState({ votes: 0, saved: 0, boards: 0, submissions: 0 })
  const [darkMode, setDarkMode] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem('craftorcrap-theme')
    if (saved) setDarkMode(saved === 'dark')
  }, [])

  useEffect(() => {
    localStorage.setItem('craftorcrap-theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  useEffect(() => {
    if (!isSignedIn) return

    async function fetchCounts() {
      try {
        const [votesRes, savedRes, boardsRes, submissionsRes] = await Promise.all([
          fetch('/api/user/votes'),
          fetch('/api/user/saved'),
          fetch('/api/user/boards'),
          fetch('/api/user/submissions'),
        ])

        const [votesData, savedData, boardsData, submissionsData] = await Promise.all([
          votesRes.ok ? votesRes.json() : { votes: [] },
          savedRes.ok ? savedRes.json() : { items: [] },
          boardsRes.ok ? boardsRes.json() : { boards: [] },
          submissionsRes.ok ? submissionsRes.json() : { submissions: [] },
        ])

        setCounts({
          votes: votesData.stats?.total_votes || votesData.votes?.length || 0,
          saved: savedData.items?.length || 0,
          boards: boardsData.boards?.length || 0,
          submissions: submissionsData.stats?.total_submissions || submissionsData.submissions?.length || 0,
        })
      } catch (error) {
        console.error('Error fetching counts:', error)
      }
    }

    fetchCounts()
  }, [isSignedIn])

  if (!isLoaded) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-black' : 'bg-neutral-50'}`}>
        <div className={`animate-spin w-8 h-8 border-2 rounded-full ${darkMode ? 'border-white/20 border-t-white' : 'border-black/20 border-t-black'}`} />
      </div>
    )
  }

  if (!isSignedIn) {
    return (
      <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-black text-white' : 'bg-neutral-50 text-black'}`}>
        {/* Header */}
        <header className={`sticky top-0 z-50 backdrop-blur-md border-b ${darkMode ? 'bg-black/80 border-white/5' : 'bg-white/80 border-black/5'}`}>
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
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

        {/* Sign in prompt */}
        <div className="max-w-md mx-auto px-4 py-20 text-center">
          <div className={`rounded-2xl p-8 ${darkMode ? 'bg-white/[0.03]' : 'bg-black/[0.02]'}`}>
            <svg
              className={`w-16 h-16 mx-auto mb-6 ${darkMode ? 'text-white/20' : 'text-black/20'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            <h1 className="text-2xl font-bold mb-2">Sign in to your dashboard</h1>
            <p className={`mb-6 ${darkMode ? 'text-white/50' : 'text-black/50'}`}>
              Track your votes, save favorites, and see how your submissions are performing.
            </p>
            <SignInButton mode="modal">
              <button className={`w-full py-3 font-semibold rounded-lg transition-all ${darkMode ? 'bg-white text-black hover:bg-white/90' : 'bg-black text-white hover:bg-black/90'}`}>
                Sign In
              </button>
            </SignInButton>
            <p className={`mt-4 text-xs ${darkMode ? 'text-white/30' : 'text-black/30'}`}>
              Don&apos;t have an account?{' '}
              <Link href="/sign-up" className={`underline ${darkMode ? 'text-white/60 hover:text-white' : 'text-black/60 hover:text-black'}`}>
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-black text-white' : 'bg-neutral-50 text-black'}`}>
      {/* Header */}
      <header className={`sticky top-0 z-50 backdrop-blur-md border-b ${darkMode ? 'bg-black/80 border-white/5' : 'bg-white/80 border-black/5'}`}>
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold">
            craft<span className={darkMode ? 'text-white/40' : 'text-black/40'}>or</span>crap
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className={`text-sm transition-colors ${darkMode ? 'text-white/60 hover:text-white' : 'text-black/60 hover:text-black'}`}
            >
              Feed
            </Link>
            <Link
              href="/submit"
              className={`text-sm transition-colors ${darkMode ? 'text-white/60 hover:text-white' : 'text-black/60 hover:text-black'}`}
            >
              Submit
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
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold">
            Welcome back{user?.firstName ? `, ${user.firstName}` : ''}
          </h1>
          <p className={`mt-1 ${darkMode ? 'text-white/50' : 'text-black/50'}`}>
            Track your activity and see how your work is performing
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <DashboardTabs activeTab={activeTab} onTabChange={setActiveTab} counts={counts} darkMode={darkMode} />
        </div>

        {/* Tab content */}
        <div>
          {activeTab === 'boards' && <MyBoards darkMode={darkMode} />}
          {activeTab === 'saved' && <SavedItems darkMode={darkMode} />}
          {activeTab === 'votes' && <VoteHistory darkMode={darkMode} />}
          {activeTab === 'submissions' && <MySubmissions darkMode={darkMode} />}
        </div>
      </main>
    </div>
  )
}
