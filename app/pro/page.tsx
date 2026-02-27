'use client'

import { useUser, UserButton } from '@clerk/nextjs'
import Link from 'next/link'
import { useState, useEffect } from 'react'

interface Board {
  id: string
  title: string
  description: string | null
  share_token: string
  visibility: 'private' | 'link' | 'public'
  item_count: number
  vote_count: number
  created_at: string
}

interface UserData {
  plan: 'free' | 'solo' | 'studio'
}

export default function ProDashboard() {
  const { user, isLoaded } = useUser()
  const [boards, setBoards] = useState<Board[]>([])
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newBoardTitle, setNewBoardTitle] = useState('')
  const [newBoardDescription, setNewBoardDescription] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (isLoaded && user) {
      fetchBoards()
      fetchUserData()
    }
  }, [isLoaded, user])

  async function fetchBoards() {
    setLoading(true)
    try {
      const res = await fetch('/api/pro/boards')
      if (res.ok) {
        const data = await res.json()
        setBoards(data)
      }
    } catch (err) {
      console.error('Failed to fetch boards:', err)
    }
    setLoading(false)
  }

  async function fetchUserData() {
    try {
      const res = await fetch('/api/pro/user')
      if (res.ok) {
        const data = await res.json()
        setUserData(data)
      }
    } catch (err) {
      console.error('Failed to fetch user data:', err)
    }
  }

  async function createBoard(e: React.FormEvent) {
    e.preventDefault()
    if (!newBoardTitle.trim()) return

    setCreating(true)
    setError('')

    try {
      const res = await fetch('/api/pro/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newBoardTitle.trim(),
          description: newBoardDescription.trim() || null,
        }),
      })

      if (res.ok) {
        const board = await res.json()
        setBoards([board, ...boards])
        setShowCreateModal(false)
        setNewBoardTitle('')
        setNewBoardDescription('')
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to create board')
      }
    } catch (err) {
      setError('Failed to create board')
    }
    setCreating(false)
  }

  const totalVotes = boards.reduce((sum, b) => sum + (b.vote_count || 0), 0)

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white/30">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            craft<span className="text-white/40">or</span>crap
            <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-white/10 text-white/50">
              Pro
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-sm text-white/50 hover:text-white transition-colors"
            >
              ← Public feed
            </Link>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Welcome section */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold mb-2">
            Welcome, {user?.firstName || 'there'}
          </h1>
          <p className="text-white/50">
            Create private boards and get feedback from clients and collaborators.
          </p>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <div className="text-3xl font-semibold">{boards.length}</div>
            <div className="text-sm text-white/40">Active boards</div>
          </div>
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <div className="text-3xl font-semibold">{totalVotes}</div>
            <div className="text-sm text-white/40">Total votes</div>
          </div>
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <div className={`text-3xl font-semibold ${
              userData?.plan === 'studio' ? 'text-purple-400' :
              userData?.plan === 'solo' ? 'text-blue-400' : 'text-amber-500'
            }`}>
              {userData?.plan === 'studio' ? 'Studio' :
               userData?.plan === 'solo' ? 'Solo' : 'Free'}
            </div>
            <div className="text-sm text-white/40">Current plan</div>
          </div>
        </div>

        {/* Boards section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium">Your boards</h2>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-white text-black hover:bg-white/90 transition-colors"
            >
              + New board
            </button>
          </div>

          {loading ? (
            <div className="text-center py-16">
              <p className="text-white/30">Loading boards...</p>
            </div>
          ) : boards.length === 0 ? (
            <div className="text-center py-16 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/5 flex items-center justify-center">
                <svg className="w-8 h-8 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-lg font-medium mb-2">No boards yet</h3>
              <p className="text-white/40 text-sm mb-6 max-w-sm mx-auto">
                Create your first board to start collecting feedback on your creative work.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 text-sm font-medium rounded-lg bg-white text-black hover:bg-white/90 transition-colors"
              >
                Create your first board
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {boards.map((board) => (
                <Link
                  key={board.id}
                  href={`/pro/boards/${board.id}`}
                  className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.1] transition-all group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium group-hover:text-white transition-colors">{board.title}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                      board.visibility === 'public' ? 'bg-green-500/20 text-green-400' :
                      board.visibility === 'link' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-white/10 text-white/40'
                    }`}>
                      {board.visibility}
                    </span>
                  </div>
                  {board.description && (
                    <p className="text-sm text-white/40 mb-3 line-clamp-2">{board.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-white/30">
                    <span>{board.item_count || 0} items</span>
                    <span>{board.vote_count || 0} votes</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Upgrade CTA - only show for free users */}
        {userData?.plan === 'free' && (
          <div className="p-6 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-medium mb-1">Upgrade to Pro</h3>
                <p className="text-white/50 text-sm mb-4">
                  Get unlimited boards, team collaboration, and priority support.
                </p>
                <div className="flex items-center gap-4">
                  <button className="px-4 py-2 text-sm font-medium rounded-lg bg-amber-500 text-black hover:bg-amber-400 transition-colors">
                    View plans
                  </button>
                  <span className="text-sm text-white/40">Starting at £6.99/mo</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Create Board Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-semibold mb-4">Create new board</h2>

            <form onSubmit={createBoard}>
              <div className="mb-4">
                <label className="block text-sm text-white/50 mb-2">Board name</label>
                <input
                  type="text"
                  value={newBoardTitle}
                  onChange={(e) => setNewBoardTitle(e.target.value)}
                  placeholder="e.g. Homepage Redesign"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
                  autoFocus
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm text-white/50 mb-2">Description (optional)</label>
                <textarea
                  value={newBoardDescription}
                  onChange={(e) => setNewBoardDescription(e.target.value)}
                  placeholder="What's this board for?"
                  rows={3}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 resize-none"
                />
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false)
                    setError('')
                  }}
                  className="flex-1 px-4 py-3 text-sm font-medium rounded-lg border border-white/10 text-white/70 hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !newBoardTitle.trim()}
                  className="flex-1 px-4 py-3 text-sm font-medium rounded-lg bg-white text-black hover:bg-white/90 transition-colors disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create board'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
