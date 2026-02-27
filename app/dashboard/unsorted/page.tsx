'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import Link from 'next/link'

interface Board {
  id: string
  name: string
}

interface SavedItem {
  id: string
  created_at: string
  board_id: string | null
  submissions: {
    id: string
    url: string
    title: string | null
    thumbnail_url: string | null
    total_craft: number
    total_crap: number
  }
}

export default function UnsortedPage() {
  const { isSignedIn, isLoaded } = useUser()
  const [items, setItems] = useState<SavedItem[]>([])
  const [boards, setBoards] = useState<Board[]>([])
  const [loading, setLoading] = useState(true)
  const [darkMode, setDarkMode] = useState(true)
  const [movingItem, setMovingItem] = useState<string | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('craftorcrap-theme')
    if (saved) setDarkMode(saved === 'dark')
  }, [])

  useEffect(() => {
    if (!isSignedIn) return

    async function fetchData() {
      try {
        const [savedRes, boardsRes] = await Promise.all([
          fetch('/api/user/saved'),
          fetch('/api/user/boards'),
        ])

        if (savedRes.ok) {
          const data = await savedRes.json()
          // Filter to only unsorted items
          setItems((data.items || []).filter((item: SavedItem) => !item.board_id))
        }

        if (boardsRes.ok) {
          const data = await boardsRes.json()
          setBoards(data.boards || [])
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [isSignedIn])

  async function handleMoveToBoard(submissionId: string, boardId: string) {
    setMovingItem(submissionId)
    try {
      const res = await fetch('/api/user/saved', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submission_id: submissionId, board_id: boardId }),
      })

      if (res.ok) {
        setItems((prev) => prev.filter((item) => item.submissions.id !== submissionId))
      }
    } catch (error) {
      console.error('Error moving item:', error)
    } finally {
      setMovingItem(null)
    }
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
        <p>Please sign in to view your saved items.</p>
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
            <h1 className="text-lg font-bold">Unsorted</h1>
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
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {items.length === 0 ? (
          <div className={`text-center py-12 ${darkMode ? 'text-white/40' : 'text-black/40'}`}>
            <svg className={`w-12 h-12 mx-auto mb-4 ${darkMode ? 'text-white/20' : 'text-black/20'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="text-lg mb-2">No unsorted items</p>
            <p className="text-sm">All your saved items are organized in boards</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {items.map((item) => {
              const sub = item.submissions
              const totalVotes = sub.total_craft + sub.total_crap
              const craftPercent = totalVotes > 0 ? Math.round((sub.total_craft / totalVotes) * 100) : 50

              return (
                <div
                  key={item.id}
                  className={`group rounded-xl overflow-hidden transition-all relative ${
                    darkMode ? 'bg-white/[0.03] hover:bg-white/[0.05]' : 'bg-black/[0.03] hover:bg-black/[0.05]'
                  }`}
                >
                  {/* Move to board dropdown */}
                  {boards.length > 0 && (
                    <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-all">
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            handleMoveToBoard(sub.id, e.target.value)
                          }
                        }}
                        disabled={movingItem === sub.id}
                        className={`text-xs px-2 py-1 rounded-lg cursor-pointer ${
                          darkMode ? 'bg-black/70 text-white border-white/20' : 'bg-white/70 text-black border-black/20'
                        } border`}
                        defaultValue=""
                      >
                        <option value="" disabled>
                          {movingItem === sub.id ? 'Moving...' : 'Add to board'}
                        </option>
                        {boards.map((board) => (
                          <option key={board.id} value={board.id}>
                            {board.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <a href={sub.url} target="_blank" rel="noopener noreferrer">
                    <div className={`aspect-video overflow-hidden ${darkMode ? 'bg-white/[0.02]' : 'bg-black/[0.02]'}`}>
                      {sub.thumbnail_url ? (
                        <img
                          src={sub.thumbnail_url}
                          alt={sub.title || 'Thumbnail'}
                          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                        />
                      ) : (
                        <div className={`w-full h-full flex items-center justify-center text-xs ${darkMode ? 'text-white/20' : 'text-black/20'}`}>
                          No preview
                        </div>
                      )}
                    </div>

                    <div className="p-3">
                      <h3 className={`text-sm font-medium truncate ${darkMode ? 'text-white/90 group-hover:text-white' : 'text-black/90 group-hover:text-black'}`}>
                        {sub.title || new URL(sub.url).hostname}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <div className={`flex-1 h-1 rounded-full overflow-hidden ${darkMode ? 'bg-white/10' : 'bg-black/10'}`}>
                          <div
                            className={`h-full rounded-full ${
                              craftPercent >= 70 ? 'bg-emerald-500' : craftPercent <= 30 ? 'bg-red-500' : darkMode ? 'bg-white/50' : 'bg-black/50'
                            }`}
                            style={{ width: `${craftPercent}%` }}
                          />
                        </div>
                        <span className={`text-xs ${darkMode ? 'text-white/40' : 'text-black/40'}`}>{craftPercent}%</span>
                      </div>
                    </div>
                  </a>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
