'use client'

import { useState, useEffect } from 'react'
import { useUser, SignInButton, UserButton } from '@clerk/nextjs'
import Link from 'next/link'
import DashboardTabs from '@/components/dashboard/DashboardTabs'
import VoteHistory from '@/components/dashboard/VoteHistory'
import SavedItems from '@/components/dashboard/SavedItems'
import MySubmissions from '@/components/dashboard/MySubmissions'

type TabType = 'votes' | 'saved' | 'submissions'

export default function DashboardPage() {
  const { user, isLoaded, isSignedIn } = useUser()
  const [activeTab, setActiveTab] = useState<TabType>('votes')
  const [counts, setCounts] = useState({ votes: 0, saved: 0, submissions: 0 })

  useEffect(() => {
    if (!isSignedIn) return

    async function fetchCounts() {
      try {
        const [votesRes, savedRes, submissionsRes] = await Promise.all([
          fetch('/api/user/votes'),
          fetch('/api/user/saved'),
          fetch('/api/user/submissions'),
        ])

        const [votesData, savedData, submissionsData] = await Promise.all([
          votesRes.ok ? votesRes.json() : { votes: [] },
          savedRes.ok ? savedRes.json() : { items: [] },
          submissionsRes.ok ? submissionsRes.json() : { submissions: [] },
        ])

        setCounts({
          votes: votesData.stats?.total_votes || votesData.votes?.length || 0,
          saved: savedData.items?.length || 0,
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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-white/20 border-t-white rounded-full" />
      </div>
    )
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-black">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/5">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/" className="text-lg font-bold text-white">
              craftorcrap
            </Link>
          </div>
        </header>

        {/* Sign in prompt */}
        <div className="max-w-md mx-auto px-4 py-20 text-center">
          <div className="bg-white/[0.03] rounded-2xl p-8">
            <svg
              className="w-16 h-16 mx-auto mb-6 text-white/20"
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
            <h1 className="text-2xl font-bold text-white mb-2">Sign in to your dashboard</h1>
            <p className="text-white/50 mb-6">
              Track your votes, save favorites, and see how your submissions are performing.
            </p>
            <SignInButton mode="modal">
              <button className="w-full py-3 bg-white text-black font-semibold rounded-lg hover:bg-white/90 transition-all">
                Sign In
              </button>
            </SignInButton>
            <p className="mt-4 text-xs text-white/30">
              Don&apos;t have an account?{' '}
              <Link href="/sign-up" className="text-white/60 hover:text-white underline">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold text-white">
            craftorcrap
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-sm text-white/60 hover:text-white transition-colors"
            >
              Feed
            </Link>
            <Link
              href="/submit"
              className="text-sm text-white/60 hover:text-white transition-colors"
            >
              Submit
            </Link>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">
            Welcome back{user?.firstName ? `, ${user.firstName}` : ''}
          </h1>
          <p className="text-white/50 mt-1">
            Track your activity and see how your work is performing
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <DashboardTabs activeTab={activeTab} onTabChange={setActiveTab} counts={counts} />
        </div>

        {/* Tab content */}
        <div>
          {activeTab === 'votes' && <VoteHistory />}
          {activeTab === 'saved' && <SavedItems />}
          {activeTab === 'submissions' && <MySubmissions />}
        </div>
      </main>
    </div>
  )
}
