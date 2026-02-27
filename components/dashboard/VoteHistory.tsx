'use client'

import { useState, useEffect } from 'react'
import StatCard from './StatCard'

interface VoteItem {
  id: string
  verdict: 'craft' | 'crap'
  created_at: string
  submissions: {
    id: string
    url: string
    title: string | null
    thumbnail_url: string | null
    total_craft: number
    total_crap: number
  }
}

interface VoteStats {
  total_votes: number
  craft_votes: number
  crap_votes: number
}

interface VoteHistoryProps {
  darkMode?: boolean
}

export default function VoteHistory({ darkMode = true }: VoteHistoryProps) {
  const [votes, setVotes] = useState<VoteItem[]>([])
  const [stats, setStats] = useState<VoteStats>({ total_votes: 0, craft_votes: 0, crap_votes: 0 })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'craft' | 'crap'>('all')

  useEffect(() => {
    async function fetchVotes() {
      try {
        const res = await fetch('/api/user/votes')
        if (res.ok) {
          const data = await res.json()
          setVotes(data.votes || [])
          setStats(data.stats || { total_votes: 0, craft_votes: 0, crap_votes: 0 })
        }
      } catch (error) {
        console.error('Error fetching votes:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchVotes()
  }, [])

  const filteredVotes = votes.filter((vote) => {
    if (filter === 'all') return true
    return vote.verdict === filter
  })

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`rounded-xl p-4 animate-pulse ${darkMode ? 'bg-white/[0.03]' : 'bg-black/[0.03]'}`}>
              <div className={`h-3 w-16 rounded mb-2 ${darkMode ? 'bg-white/10' : 'bg-black/10'}`} />
              <div className={`h-7 w-12 rounded ${darkMode ? 'bg-white/10' : 'bg-black/10'}`} />
            </div>
          ))}
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`rounded-xl p-4 animate-pulse ${darkMode ? 'bg-white/[0.03]' : 'bg-black/[0.03]'}`}>
              <div className="flex gap-4">
                <div className={`w-16 h-16 rounded-lg ${darkMode ? 'bg-white/10' : 'bg-black/10'}`} />
                <div className="flex-1 space-y-2">
                  <div className={`h-4 w-3/4 rounded ${darkMode ? 'bg-white/10' : 'bg-black/10'}`} />
                  <div className={`h-3 w-1/2 rounded ${darkMode ? 'bg-white/10' : 'bg-black/10'}`} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total Votes" value={stats.total_votes} darkMode={darkMode} />
        <StatCard label="Craft" value={stats.craft_votes} color="green" darkMode={darkMode} />
        <StatCard label="Crap" value={stats.crap_votes} color="red" darkMode={darkMode} />
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {(['all', 'craft', 'crap'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              filter === f
                ? darkMode ? 'bg-white text-black' : 'bg-black text-white'
                : darkMode ? 'bg-white/5 text-white/60 hover:bg-white/10' : 'bg-black/5 text-black/60 hover:bg-black/10'
            }`}
          >
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Vote List */}
      {filteredVotes.length === 0 ? (
        <div className={`text-center py-12 ${darkMode ? 'text-white/40' : 'text-black/40'}`}>
          {votes.length === 0 ? (
            <>
              <p className="text-lg mb-2">No votes yet</p>
              <p className="text-sm">Start voting on submissions to see your history here</p>
            </>
          ) : (
            <p>No {filter} votes</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredVotes.map((vote) => {
            const sub = vote.submissions
            const totalVotes = sub.total_craft + sub.total_crap
            const craftPercent = totalVotes > 0 ? Math.round((sub.total_craft / totalVotes) * 100) : 50

            return (
              <a
                key={vote.id}
                href={sub.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-4 p-3 rounded-xl transition-all group ${
                  darkMode ? 'bg-white/[0.03] hover:bg-white/[0.05]' : 'bg-black/[0.03] hover:bg-black/[0.05]'
                }`}
              >
                {/* Thumbnail */}
                <div className={`w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 ${darkMode ? 'bg-white/[0.02]' : 'bg-black/[0.02]'}`}>
                  {sub.thumbnail_url ? (
                    <img
                      src={sub.thumbnail_url}
                      alt={sub.title || 'Thumbnail'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center text-xs ${darkMode ? 'text-white/20' : 'text-black/20'}`}>
                      No preview
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className={`text-sm font-medium truncate ${darkMode ? 'text-white/90 group-hover:text-white' : 'text-black/90 group-hover:text-black'}`}>
                    {sub.title || new URL(sub.url).hostname}
                  </h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded ${
                        vote.verdict === 'craft'
                          ? 'bg-emerald-500/20 text-emerald-500'
                          : 'bg-red-500/20 text-red-500'
                      }`}
                    >
                      {vote.verdict.toUpperCase()}
                    </span>
                    <span className={`text-xs ${darkMode ? 'text-white/40' : 'text-black/40'}`}>
                      {craftPercent}% craft · {totalVotes} votes
                    </span>
                  </div>
                </div>

                {/* Arrow */}
                <svg
                  className={`w-4 h-4 flex-shrink-0 ${darkMode ? 'text-white/20 group-hover:text-white/40' : 'text-black/20 group-hover:text-black/40'}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}
