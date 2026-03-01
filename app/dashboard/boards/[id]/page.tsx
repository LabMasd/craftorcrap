'use client'

import { useState, useEffect, use } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import SubmissionCard from '@/components/SubmissionCard'
import type { Submission } from '@/types'

interface Board {
  id: string
  name: string
  icon: string
  share_id: string
  slug: string | null
  allow_voting: boolean
  allow_submissions: boolean
  visibility: 'private' | 'link' | 'public'
  topic: string | null
}

const TOPICS = ['Design', 'Tech', 'Fashion', 'Architecture', 'Art', 'Photography', 'Gaming', 'Music', 'Film']

interface SavedItem {
  id: string
  created_at: string
  submissions: Submission
}

type CardSize = 'compact' | 'normal' | 'large'

export default function BoardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { isSignedIn, isLoaded } = useUser()
  const [board, setBoard] = useState<Board | null>(null)
  const [items, setItems] = useState<SavedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [darkMode, setDarkMode] = useState(true)
  const [cardSize, setCardSize] = useState<CardSize>('normal')
  const [editing, setEditing] = useState(false)
  const [newName, setNewName] = useState('')
  const [copied, setCopied] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('craftorcrap-theme')
    if (saved) setDarkMode(saved === 'dark')
    const savedSize = localStorage.getItem('craftorcrap-card-size')
    if (savedSize) setCardSize(savedSize as CardSize)
  }, [])

  useEffect(() => {
    if (!isSignedIn) return

    async function fetchBoard() {
      try {
        const res = await fetch(`/api/user/boards/${id}`)
        if (res.ok) {
          const data = await res.json()
          // Ensure defaults for permission fields
          const boardData = {
            ...data.board,
            allow_voting: data.board?.allow_voting ?? true,
            allow_submissions: data.board?.allow_submissions ?? true,
            visibility: data.board?.visibility || 'private',
            topic: data.board?.topic || null,
          }
          setBoard(boardData)
          setItems(data.items || [])
          setNewName(data.board?.name || '')
        }
      } catch (error) {
        console.error('Error fetching board:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchBoard()
  }, [id, isSignedIn])

  async function handleRename() {
    if (!newName.trim() || newName === board?.name) {
      setEditing(false)
      return
    }

    try {
      const res = await fetch(`/api/user/boards/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      })

      if (res.ok) {
        setBoard((prev) => prev ? { ...prev, name: newName.trim() } : null)
      }
    } catch (error) {
      console.error('Error renaming board:', error)
    }
    setEditing(false)
  }

  function copyShareLink() {
    if (!board?.share_id) return
    const url = `${window.location.origin}/b/${board.share_id}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function togglePermission(field: 'allow_voting' | 'allow_submissions') {
    if (!board) return
    const newValue = !board[field]

    // Optimistic update
    setBoard(prev => prev ? { ...prev, [field]: newValue } : null)

    try {
      const res = await fetch(`/api/user/boards/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: newValue }),
      })

      if (!res.ok) {
        // Revert on failure
        setBoard(prev => prev ? { ...prev, [field]: !newValue } : null)
      }
    } catch {
      // Revert on error
      setBoard(prev => prev ? { ...prev, [field]: !newValue } : null)
    }
  }

  async function updateVisibility(visibility: 'private' | 'link' | 'public', topic?: string) {
    if (!board) return
    const oldVisibility = board.visibility
    const oldTopic = board.topic

    // Generate slug for public boards
    const slug = visibility === 'public' && !board.slug
      ? board.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + board.share_id.slice(0, 4)
      : board.slug

    // Optimistic update
    setBoard(prev => prev ? { ...prev, visibility, topic: topic ?? prev.topic, slug } : null)

    try {
      const res = await fetch(`/api/user/boards/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility, topic: topic ?? board.topic, slug }),
      })

      if (!res.ok) {
        setBoard(prev => prev ? { ...prev, visibility: oldVisibility, topic: oldTopic } : null)
      }
    } catch {
      setBoard(prev => prev ? { ...prev, visibility: oldVisibility, topic: oldTopic } : null)
    }
  }

  async function handleRemoveFromBoard(submissionId: string) {
    try {
      const res = await fetch('/api/user/saved', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submission_id: submissionId, board_id: null }),
      })

      if (res.ok) {
        setItems((prev) => prev.filter((item) => item.submissions.id !== submissionId))
      }
    } catch (error) {
      console.error('Error removing from board:', error)
    }
  }

  async function handleDeleteBoard() {
    if (!confirm('Delete this board? Items will be moved back to your saved collection.')) return

    setDeleting(true)
    try {
      const res = await fetch(`/api/user/boards/${id}`, { method: 'DELETE' })
      if (res.ok) {
        router.push('/dashboard')
      }
    } catch (error) {
      console.error('Error deleting board:', error)
      setDeleting(false)
    }
  }

  const gridCols = {
    compact: 'columns-2 sm:columns-3 md:columns-4 lg:columns-5',
    normal: 'columns-1 sm:columns-2 md:columns-3 lg:columns-4',
    large: 'columns-1 sm:columns-2 lg:columns-3',
  }

  if (!isLoaded || loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-black' : 'bg-neutral-50'}`}>
        <div className={`animate-spin w-8 h-8 border-2 rounded-full ${darkMode ? 'border-white/20 border-t-white' : 'border-black/20 border-t-black'}`} />
      </div>
    )
  }

  if (!isSignedIn) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-black text-white' : 'bg-neutral-50 text-black'}`}>
        <p>Please sign in to view this board.</p>
      </div>
    )
  }

  if (!board) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-black text-white' : 'bg-neutral-50 text-black'}`}>
        <div className="text-center">
          <p className="mb-4">Board not found.</p>
          <Link href="/dashboard" className={`underline ${darkMode ? 'text-white/60 hover:text-white' : 'text-black/60 hover:text-black'}`}>
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-black text-white' : 'bg-neutral-50 text-black'}`}>
      {/* Header */}
      <header className={`sticky top-0 z-50 backdrop-blur-md border-b ${darkMode ? 'bg-black/80 border-white/5' : 'bg-white/80 border-black/5'}`}>
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className={`p-2 rounded-full transition-all ${darkMode ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            {editing ? (
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onBlur={handleRename}
                onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                autoFocus
                className={`text-lg font-bold bg-transparent border-b-2 outline-none ${
                  darkMode ? 'border-white/20 focus:border-white' : 'border-black/20 focus:border-black'
                }`}
              />
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="text-lg font-bold hover:opacity-70 transition-opacity"
              >
                {board.name}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Card size toggle */}
            <div className={`hidden sm:flex rounded-full p-0.5 ${darkMode ? 'bg-white/5' : 'bg-black/5'}`}>
              {(['compact', 'normal', 'large'] as CardSize[]).map((size) => (
                <button
                  key={size}
                  onClick={() => setCardSize(size)}
                  className={`p-1.5 rounded-full transition-all ${
                    cardSize === size
                      ? darkMode ? 'bg-white text-black' : 'bg-black text-white'
                      : darkMode ? 'text-white/40' : 'text-black/40'
                  }`}
                  title={size.charAt(0).toUpperCase() + size.slice(1)}
                >
                  {size === 'compact' && (
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16">
                      <rect x="1" y="1" width="6" height="6" rx="1" />
                      <rect x="9" y="1" width="6" height="6" rx="1" />
                      <rect x="1" y="9" width="6" height="6" rx="1" />
                      <rect x="9" y="9" width="6" height="6" rx="1" />
                    </svg>
                  )}
                  {size === 'normal' && (
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16">
                      <rect x="1" y="1" width="6" height="14" rx="1" />
                      <rect x="9" y="1" width="6" height="14" rx="1" />
                    </svg>
                  )}
                  {size === 'large' && (
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16">
                      <rect x="1" y="1" width="14" height="14" rx="1" />
                    </svg>
                  )}
                </button>
              ))}
            </div>

            {/* Settings dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`p-2 rounded-full transition-all ${
                  showSettings
                    ? darkMode ? 'bg-white/20' : 'bg-black/10'
                    : darkMode ? 'hover:bg-white/10' : 'hover:bg-black/5'
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>

              {showSettings && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowSettings(false)} />
                  <div className={`absolute right-0 top-full mt-2 w-64 rounded-xl p-3 z-50 shadow-xl ${
                    darkMode ? 'bg-neutral-900 border border-white/10' : 'bg-white border border-black/10'
                  }`}>
                    {/* Visibility selector */}
                    <p className={`text-xs font-medium mb-2 ${darkMode ? 'text-white/40' : 'text-black/40'}`}>
                      Visibility
                    </p>
                    <div className="flex gap-1 mb-3">
                      {(['private', 'link', 'public'] as const).map((v) => (
                        <button
                          key={v}
                          onClick={() => updateVisibility(v)}
                          className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-lg transition-all capitalize ${
                            board.visibility === v
                              ? 'bg-emerald-500 text-white'
                              : darkMode
                              ? 'bg-white/10 text-white/60 hover:bg-white/15'
                              : 'bg-black/10 text-black/60 hover:bg-black/15'
                          }`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>

                    {/* Topic selector for public boards */}
                    {board.visibility === 'public' && (
                      <div className="mb-3">
                        <p className={`text-xs font-medium mb-2 ${darkMode ? 'text-white/40' : 'text-black/40'}`}>
                          Topic
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {TOPICS.map((t) => (
                            <button
                              key={t}
                              onClick={() => updateVisibility('public', t)}
                              className={`px-2 py-1 text-xs font-medium rounded-full transition-all ${
                                board.topic === t
                                  ? 'bg-emerald-500 text-white'
                                  : darkMode
                                  ? 'bg-white/10 text-white/50 hover:bg-white/15'
                                  : 'bg-black/10 text-black/50 hover:bg-black/15'
                              }`}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className={`border-t my-2 ${darkMode ? 'border-white/10' : 'border-black/10'}`} />

                    <p className={`text-xs font-medium mb-2 ${darkMode ? 'text-white/40' : 'text-black/40'}`}>
                      Permissions
                    </p>

                    <label className="flex items-center justify-between py-2 cursor-pointer">
                      <span className={`text-sm ${darkMode ? 'text-white/80' : 'text-black/80'}`}>Allow voting</span>
                      <button
                        onClick={() => togglePermission('allow_voting')}
                        className={`relative w-10 h-5 rounded-full transition-colors ${
                          board.allow_voting ? 'bg-emerald-500' : darkMode ? 'bg-white/20' : 'bg-black/20'
                        }`}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                          board.allow_voting ? 'translate-x-5' : ''
                        }`} />
                      </button>
                    </label>

                    <label className="flex items-center justify-between py-2 cursor-pointer">
                      <span className={`text-sm ${darkMode ? 'text-white/80' : 'text-black/80'}`}>Allow submissions</span>
                      <button
                        onClick={() => togglePermission('allow_submissions')}
                        className={`relative w-10 h-5 rounded-full transition-colors ${
                          board.allow_submissions ? 'bg-emerald-500' : darkMode ? 'bg-white/20' : 'bg-black/20'
                        }`}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                          board.allow_submissions ? 'translate-x-5' : ''
                        }`} />
                      </button>
                    </label>

                    <div className={`border-t my-2 ${darkMode ? 'border-white/10' : 'border-black/10'}`} />

                    <button
                      onClick={() => {
                        copyShareLink()
                        setShowSettings(false)
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        copied
                          ? 'bg-emerald-500 text-white'
                          : darkMode
                          ? 'bg-white/10 text-white/80 hover:bg-white/20'
                          : 'bg-black/5 text-black/80 hover:bg-black/10'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                      {copied ? 'Link copied!' : 'Copy share link'}
                    </button>

                    <div className={`border-t my-2 ${darkMode ? 'border-white/10' : 'border-black/10'}`} />

                    <button
                      onClick={handleDeleteBoard}
                      disabled={deleting}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all text-red-500 ${
                        darkMode ? 'hover:bg-red-500/10' : 'hover:bg-red-500/10'
                      } disabled:opacity-50`}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      {deleting ? 'Deleting...' : 'Delete board'}
                    </button>
                  </div>
                </>
              )}
            </div>

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
        </div>
      </header>

      {/* Content */}
      <main className="px-3 sm:px-4 py-8">
        {/* Item count */}
        <div className={`mb-4 text-sm ${darkMode ? 'text-white/40' : 'text-black/40'}`}>
          {items.length} item{items.length !== 1 ? 's' : ''}
        </div>

        {items.length === 0 ? (
          <div className={`text-center py-20 ${darkMode ? 'text-white/40' : 'text-black/40'}`}>
            <svg className={`w-12 h-12 mx-auto mb-4 ${darkMode ? 'text-white/20' : 'text-black/20'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <p className="text-lg mb-2">This board is empty</p>
            <p className="text-sm">Add items from your saved collection</p>
          </div>
        ) : (
          <div className={`${gridCols[cardSize]} gap-3`}>
            {items.map((item) => (
              <div key={item.id} className="break-inside-avoid mb-3 relative group">
                {/* Remove from board button */}
                <button
                  onClick={() => handleRemoveFromBoard(item.submissions.id)}
                  className={`absolute top-2 right-2 z-10 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all ${
                    darkMode ? 'bg-black/60 text-white/70 hover:bg-black/80 hover:text-white' : 'bg-white/60 text-black/70 hover:bg-white/80 hover:text-black'
                  }`}
                  title="Remove from board"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <SubmissionCard
                  submission={item.submissions}
                  size={cardSize}
                  darkMode={darkMode}
                />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
