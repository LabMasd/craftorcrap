'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'

interface LeaderboardEntry {
  id: string
  name: string
  imageUrl: string | null
  votes: number
}

interface Stats {
  totalVotes: number
  totalSubmissions: number
  totalUsers: number
}

export default function LeaderboardPage() {
  const [darkMode, setDarkMode] = useState(true)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem('craftorcrap-theme')
    if (saved) setDarkMode(saved === 'dark')

    fetchLeaderboard()
  }, [])

  async function fetchLeaderboard() {
    try {
      const response = await fetch('/api/leaderboard')
      const data = await response.json()
      setLeaderboard(data.leaderboard || [])
      setStats(data.stats || null)
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-black text-white' : 'bg-white text-black'}`}>
      <header className={`border-b ${darkMode ? 'border-white/10' : 'border-black/10'}`}>
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            craft<span className={darkMode ? 'text-white/40' : 'text-black/40'}>or</span>crap
          </Link>
          <Link
            href="/"
            className={`text-sm ${darkMode ? 'text-white/50 hover:text-white' : 'text-black/50 hover:text-black'} transition-colors`}
          >
            Back to voting
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">
          Leaderboard
        </h1>
        <p className={`mb-8 ${darkMode ? 'text-white/50' : 'text-black/50'}`}>
          Top contributors shaping what's craft and what's crap
        </p>

        {/* Stats */}
        {stats && (
          <div className={`grid grid-cols-3 gap-4 mb-10 p-4 rounded-xl ${darkMode ? 'bg-white/5' : 'bg-black/5'}`}>
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.totalVotes.toLocaleString()}</div>
              <div className={`text-xs ${darkMode ? 'text-white/40' : 'text-black/40'}`}>Total Votes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.totalSubmissions.toLocaleString()}</div>
              <div className={`text-xs ${darkMode ? 'text-white/40' : 'text-black/40'}`}>Submissions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</div>
              <div className={`text-xs ${darkMode ? 'text-white/40' : 'text-black/40'}`}>Contributors</div>
            </div>
          </div>
        )}

        {/* Leaderboard */}
        {loading ? (
          <div className={`text-center py-12 ${darkMode ? 'text-white/40' : 'text-black/40'}`}>
            Loading...
          </div>
        ) : leaderboard.length === 0 ? (
          <div className={`text-center py-12 ${darkMode ? 'text-white/40' : 'text-black/40'}`}>
            No contributors yet. Be the first to vote!
          </div>
        ) : (
          <div className="space-y-2">
            {leaderboard.map((entry, index) => (
              <div
                key={entry.id}
                className={`flex items-center gap-4 p-4 rounded-xl transition-colors ${
                  darkMode ? 'bg-white/5 hover:bg-white/8' : 'bg-black/5 hover:bg-black/8'
                }`}
              >
                {/* Rank */}
                <div className={`w-8 text-center font-bold ${
                  index === 0 ? 'text-yellow-500' :
                  index === 1 ? 'text-gray-400' :
                  index === 2 ? 'text-amber-600' :
                  darkMode ? 'text-white/30' : 'text-black/30'
                }`}>
                  {index + 1}
                </div>

                {/* Avatar */}
                <div className={`w-10 h-10 rounded-full overflow-hidden flex-shrink-0 ${darkMode ? 'bg-white/10' : 'bg-black/10'}`}>
                  {entry.imageUrl ? (
                    <Image
                      src={entry.imageUrl}
                      alt={entry.name}
                      width={40}
                      height={40}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-lg font-medium">
                      {entry.name[0]?.toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Name */}
                <div className="flex-1 font-medium truncate">
                  {entry.name}
                </div>

                {/* Votes */}
                <div className={`text-sm font-medium ${darkMode ? 'text-white/60' : 'text-black/60'}`}>
                  {entry.votes.toLocaleString()} votes
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
