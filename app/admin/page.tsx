'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useUser, SignInButton } from '@clerk/nextjs'
import type { Submission } from '@/types'

interface User {
  id: string
  clerk_id: string
  email: string
  name: string | null
  avatar_url: string | null
  plan: 'free' | 'solo' | 'studio'
  created_at: string
  updated_at: string
  workspace_count: number
  board_count: number
}

type Tab = 'submissions' | 'users'

export default function AdminPage() {
  const { isLoaded, isSignedIn, user } = useUser()

  const [authorized, setAuthorized] = useState(false)
  const [checking, setChecking] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('submissions')

  // Submissions state
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loadingSubmissions, setLoadingSubmissions] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  // Users state
  const [users, setUsers] = useState<User[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)

  useEffect(() => {
    async function checkAuth() {
      if (!isLoaded) return
      if (!isSignedIn) {
        setChecking(false)
        return
      }

      const res = await fetch('/api/admin/verify')
      if (res.ok) {
        setAuthorized(true)
        fetchSubmissions()
      }
      setChecking(false)
    }

    checkAuth()
  }, [isLoaded, isSignedIn])

  async function fetchSubmissions() {
    setLoadingSubmissions(true)
    const res = await fetch('/api/admin/submissions')
    if (res.ok) {
      const data = await res.json()
      setSubmissions(data)
    }
    setLoadingSubmissions(false)
  }

  async function fetchUsers() {
    setLoadingUsers(true)
    const res = await fetch('/api/admin/users')
    if (res.ok) {
      const data = await res.json()
      setUsers(data)
    }
    setLoadingUsers(false)
  }

  useEffect(() => {
    if (authorized && activeTab === 'users' && users.length === 0) {
      fetchUsers()
    }
  }, [authorized, activeTab])

  async function handleDelete(id: string) {
    if (!confirm('Delete this submission?')) return

    setDeleting(id)
    const res = await fetch('/api/admin/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })

    if (res.ok) {
      setSubmissions(submissions.filter(s => s.id !== id))
    }
    setDeleting(null)
  }

  if (!isLoaded || checking) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-white/40">Loading...</p>
      </div>
    )
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/40 mb-4">Sign in to access admin</p>
          <SignInButton mode="modal">
            <button className="px-4 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-white/90">
              Sign In
            </button>
          </SignInButton>
        </div>
      </div>
    )
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/40 mb-2">Access denied</p>
          <p className="text-white/20 text-sm mb-4">
            Signed in as {user?.primaryEmailAddress?.emailAddress}
          </p>
          <Link href="/" className="text-white/60 hover:text-white underline text-sm">
            Go home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <h1 className="text-lg font-semibold">Admin Panel</h1>
          <div className="flex items-center gap-4">
            <span className="text-white/30 text-sm">{user?.primaryEmailAddress?.emailAddress}</span>
            <Link href="/" className="text-white/40 hover:text-white text-sm">
              Back to site
            </Link>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab('submissions')}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'submissions'
                  ? 'border-white text-white'
                  : 'border-transparent text-white/40 hover:text-white/60'
              }`}
            >
              Submissions
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'users'
                  ? 'border-white text-white'
                  : 'border-transparent text-white/40 hover:text-white/60'
              }`}
            >
              Users
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {activeTab === 'submissions' && (
          <>
            <div className="mb-6 flex items-center justify-between">
              <p className="text-white/40 text-sm">
                {submissions.length} submission{submissions.length !== 1 ? 's' : ''}
              </p>
              <button
                onClick={fetchSubmissions}
                className="text-xs text-white/40 hover:text-white"
              >
                Refresh
              </button>
            </div>

            {loadingSubmissions ? (
              <p className="text-white/30">Loading...</p>
            ) : submissions.length === 0 ? (
              <p className="text-white/30">No submissions yet</p>
            ) : (
              <div className="space-y-3">
                {submissions.map((submission) => {
                  const totalVotes = submission.total_craft + submission.total_crap
                  const craftPercent = totalVotes > 0
                    ? Math.round((submission.total_craft / totalVotes) * 100)
                    : 50

                  let domain = ''
                  try {
                    domain = new URL(submission.url).hostname.replace('www.', '')
                  } catch {
                    domain = submission.url
                  }

                  return (
                    <div
                      key={submission.id}
                      className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]"
                    >
                      {submission.thumbnail_url ? (
                        <img
                          src={submission.thumbnail_url}
                          alt=""
                          className="w-16 h-12 object-cover rounded-lg flex-shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-12 bg-white/5 rounded-lg flex-shrink-0" />
                      )}

                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm truncate">
                          {submission.title || domain}
                        </h3>
                        <p className="text-xs text-white/30 truncate">{domain}</p>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <p className={`text-sm font-semibold ${
                          craftPercent >= 70 ? 'text-emerald-500' :
                          craftPercent <= 30 ? 'text-red-500' : 'text-white/50'
                        }`}>
                          {craftPercent}%
                        </p>
                        <p className="text-[10px] text-white/30">
                          {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
                        </p>
                      </div>

                      <div className="flex-shrink-0">
                        <span className="text-[10px] text-white/30 px-2 py-1 rounded-full bg-white/5">
                          {submission.category}
                        </span>
                      </div>

                      <button
                        onClick={() => handleDelete(submission.id)}
                        disabled={deleting === submission.id}
                        className="flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                      >
                        {deleting === submission.id ? '...' : 'Delete'}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {activeTab === 'users' && (
          <>
            <div className="mb-6 flex items-center justify-between">
              <p className="text-white/40 text-sm">
                {users.length} user{users.length !== 1 ? 's' : ''}
              </p>
              <button
                onClick={fetchUsers}
                className="text-xs text-white/40 hover:text-white"
              >
                Refresh
              </button>
            </div>

            {loadingUsers ? (
              <p className="text-white/30">Loading...</p>
            ) : users.length === 0 ? (
              <p className="text-white/30">No users yet</p>
            ) : (
              <div className="space-y-3">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]"
                  >
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt=""
                        className="w-10 h-10 rounded-full flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-white/10 rounded-full flex-shrink-0 flex items-center justify-center text-white/40 text-sm font-medium">
                        {user.name?.[0] || user.email[0].toUpperCase()}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm truncate">
                        {user.name || 'No name'}
                      </h3>
                      <p className="text-xs text-white/30 truncate">{user.email}</p>
                    </div>

                    <div className="flex-shrink-0 text-right">
                      <p className="text-xs text-white/50">
                        {user.workspace_count} workspace{user.workspace_count !== 1 ? 's' : ''}
                      </p>
                      <p className="text-xs text-white/30">
                        {user.board_count} board{user.board_count !== 1 ? 's' : ''}
                      </p>
                    </div>

                    <div className="flex-shrink-0">
                      <span className={`text-[10px] px-2 py-1 rounded-full ${
                        user.plan === 'studio'
                          ? 'bg-purple-500/20 text-purple-400'
                          : user.plan === 'solo'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-white/5 text-white/30'
                      }`}>
                        {user.plan}
                      </span>
                    </div>

                    <div className="flex-shrink-0 text-xs text-white/30">
                      {new Date(user.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
