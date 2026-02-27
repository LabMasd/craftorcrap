'use client'

import Link from 'next/link'
import { useState, useEffect, use } from 'react'

interface BoardItem {
  id: string
  url: string
  title: string | null
  preview_image: string | null
  dominant_color: string | null
  description: string | null
  total_craft: number
  total_crap: number
  total_votes: number
}

interface Board {
  id: string
  title: string
  description: string | null
  visibility: 'link' | 'public'
  allow_anonymous_votes: boolean
  board_items: BoardItem[]
}

function generateVoterToken() {
  return 'vt_' + Math.random().toString(36).substring(2) + Date.now().toString(36)
}

function getVoterToken() {
  if (typeof window === 'undefined') return ''
  let token = localStorage.getItem('voter_token')
  if (!token) {
    token = generateVoterToken()
    localStorage.setItem('voter_token', token)
  }
  return token
}

export default function PublicBoardPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)

  const [board, setBoard] = useState<Board | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [votedItems, setVotedItems] = useState<Record<string, 'craft' | 'crap'>>({})
  const [voterToken, setVoterToken] = useState('')

  useEffect(() => {
    setVoterToken(getVoterToken())
    fetchBoard()
  }, [token])

  async function fetchBoard() {
    setLoading(true)
    try {
      const res = await fetch(`/api/boards/${token}`)
      if (res.ok) {
        const data = await res.json()
        setBoard(data)
      } else {
        const data = await res.json()
        setError(data.error || 'Board not found')
      }
    } catch (err) {
      setError('Failed to load board')
    }
    setLoading(false)
  }

  async function vote(itemId: string, verdict: 'craft' | 'crap') {
    const prevVote = votedItems[itemId]
    setVotedItems(prev => ({ ...prev, [itemId]: verdict }))

    setBoard(prev => {
      if (!prev) return null
      return {
        ...prev,
        board_items: prev.board_items.map(item => {
          if (item.id !== itemId) return item
          let newCraft = item.total_craft
          let newCrap = item.total_crap
          if (prevVote === 'craft') newCraft--
          else if (prevVote === 'crap') newCrap--
          if (verdict === 'craft') newCraft++
          else newCrap++
          return { ...item, total_craft: newCraft, total_crap: newCrap, total_votes: newCraft + newCrap }
        })
      }
    })

    try {
      const res = await fetch(`/api/boards/${token}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, verdict, voterToken }),
      })
      if (!res.ok) {
        setVotedItems(prev => {
          const next = { ...prev }
          if (prevVote) next[itemId] = prevVote
          else delete next[itemId]
          return next
        })
        fetchBoard()
      }
    } catch (err) {
      console.error('Failed to vote:', err)
      fetchBoard()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white/30">Loading...</div>
      </div>
    )
  }

  if (error || !board) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/40 mb-4">{error || 'Board not found'}</p>
          <Link href="/" className="text-white/60 hover:text-white underline">Go home</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold mb-1">{board.title}</h1>
            {board.description && <p className="text-white/50">{board.description}</p>}
          </div>
          <Link href="/" className="text-sm text-white/40 hover:text-white transition-colors">
            craft<span className="text-white/20">or</span>crap
          </Link>
        </div>
      </header>

      {/* Instructions */}
      <div className="border-b border-white/5 bg-white/[0.02]">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <p className="text-sm text-white/40 text-center">
            Vote on each item. Is it <span className="text-emerald-400">Craft</span> or <span className="text-red-400">Crap</span>?
          </p>
        </div>
      </div>

      {/* Items - Masonry grid */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {board.board_items.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-white/40">No items in this board yet.</p>
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-3">
            {board.board_items.map((item) => {
              const totalVotes = item.total_craft + item.total_crap
              const craftPercent = totalVotes > 0 ? Math.round((item.total_craft / totalVotes) * 100) : 50
              const userVote = votedItems[item.id]

              let domain = ''
              try { domain = new URL(item.url).hostname.replace('www.', '') } catch { domain = item.url }

              return (
                <div key={item.id} className="break-inside-avoid mb-3">
                  <div className="group rounded-xl overflow-hidden bg-white/[0.03] hover:bg-white/[0.05] transition-all">
                    {/* Image */}
                    <div className="relative">
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="block">
                        <div className="relative overflow-hidden bg-white/[0.02]">
                          {item.preview_image ? (
                            <img
                              src={item.preview_image}
                              alt={item.title || 'Item thumbnail'}
                              className="w-full h-auto object-cover group-hover:scale-[1.02] transition-transform duration-500"
                              loading="lazy"
                            />
                          ) : (
                            <div
                              className="w-full aspect-video flex items-center justify-center text-sm text-white/20"
                              style={item.dominant_color ? { backgroundColor: item.dominant_color } : undefined}
                            >
                              No preview
                            </div>
                          )}
                        </div>
                      </a>
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <div className="mb-3">
                        <h3 className="font-medium leading-snug line-clamp-2 text-sm text-white/90">
                          {item.title || domain}
                        </h3>
                        <p className="text-[11px] mt-0.5 text-white/30">{domain}</p>
                      </div>

                      {/* Vote buttons */}
                      <div className="flex gap-1 mb-3">
                        <button
                          onClick={() => vote(item.id, 'craft')}
                          className={`flex-1 py-2 text-[11px] font-semibold tracking-wide rounded-md transition-all duration-200 ${
                            userVote === 'craft'
                              ? 'bg-white text-black'
                              : userVote
                              ? 'bg-white/5 text-white/20 cursor-not-allowed'
                              : 'bg-white/5 text-white/60 hover:bg-white hover:text-black'
                          }`}
                        >
                          CRAFT
                        </button>
                        <button
                          onClick={() => vote(item.id, 'crap')}
                          className={`flex-1 py-2 text-[11px] font-semibold tracking-wide rounded-md transition-all duration-200 ${
                            userVote === 'crap'
                              ? 'bg-white text-black'
                              : userVote
                              ? 'bg-white/5 text-white/20 cursor-not-allowed'
                              : 'bg-white/5 text-white/60 hover:bg-white hover:text-black'
                          }`}
                        >
                          CRAP
                        </button>
                      </div>

                      {/* Progress bar */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1 rounded-full overflow-hidden bg-white/10">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              craftPercent >= 70 ? 'bg-emerald-500' : craftPercent <= 30 ? 'bg-red-500' : 'bg-white/50'
                            }`}
                            style={{ width: `${craftPercent}%` }}
                          />
                        </div>
                        <span className={`font-semibold tabular-nums text-[10px] ${
                          craftPercent >= 70 ? 'text-emerald-500' : craftPercent <= 30 ? 'text-red-500' : 'text-white/40'
                        }`}>
                          {craftPercent}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 mt-16">
        <div className="max-w-6xl mx-auto px-4 py-6 text-center">
          <p className="text-sm text-white/30">
            Powered by <Link href="/" className="text-white/50 hover:text-white">craftorcrap</Link>
          </p>
        </div>
      </footer>
    </div>
  )
}
