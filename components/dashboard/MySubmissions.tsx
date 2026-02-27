'use client'

import { useState, useEffect } from 'react'
import StatCard from './StatCard'

interface SubmissionItem {
  id: string
  url: string
  title: string | null
  thumbnail_url: string | null
  total_craft: number
  total_crap: number
  total_votes: number
  craft_percent: number
  created_at: string
}

interface SubmissionStats {
  total_submissions: number
  total_votes_received: number
  avg_craft_percent: number
}

interface MySubmissionsProps {
  darkMode?: boolean
}

export default function MySubmissions({ darkMode = true }: MySubmissionsProps) {
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([])
  const [stats, setStats] = useState<SubmissionStats>({
    total_submissions: 0,
    total_votes_received: 0,
    avg_craft_percent: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchSubmissions() {
      try {
        const res = await fetch('/api/user/submissions')
        if (res.ok) {
          const data = await res.json()
          setSubmissions(data.submissions || [])
          setStats(data.stats || { total_submissions: 0, total_votes_received: 0, avg_craft_percent: 0 })
        }
      } catch (error) {
        console.error('Error fetching submissions:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchSubmissions()
  }, [])

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
                <div className={`w-20 h-20 rounded-lg ${darkMode ? 'bg-white/10' : 'bg-black/10'}`} />
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
        <StatCard label="Submissions" value={stats.total_submissions} darkMode={darkMode} />
        <StatCard label="Total Votes" value={stats.total_votes_received} darkMode={darkMode} />
        <StatCard
          label="Avg Craft %"
          value={`${stats.avg_craft_percent}%`}
          color={stats.avg_craft_percent >= 70 ? 'green' : stats.avg_craft_percent <= 30 ? 'red' : 'default'}
          darkMode={darkMode}
        />
      </div>

      {/* Submissions List */}
      {submissions.length === 0 ? (
        <div className={`text-center py-12 ${darkMode ? 'text-white/40' : 'text-black/40'}`}>
          <svg
            className={`w-12 h-12 mx-auto mb-4 ${darkMode ? 'text-white/20' : 'text-black/20'}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 4v16m8-8H4"
            />
          </svg>
          <p className="text-lg mb-2">No submissions yet</p>
          <p className="text-sm">Submit your work to see how the community rates it</p>
          <a
            href="/submit"
            className={`inline-block mt-4 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              darkMode ? 'bg-white text-black hover:bg-white/90' : 'bg-black text-white hover:bg-black/90'
            }`}
          >
            Submit Work
          </a>
        </div>
      ) : (
        <div className="space-y-3">
          {submissions.map((sub) => (
            <a
              key={sub.id}
              href={sub.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-4 p-4 rounded-xl transition-all group ${
                darkMode ? 'bg-white/[0.03] hover:bg-white/[0.05]' : 'bg-black/[0.03] hover:bg-black/[0.05]'
              }`}
            >
              {/* Thumbnail */}
              <div className={`w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 ${darkMode ? 'bg-white/[0.02]' : 'bg-black/[0.02]'}`}>
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
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs ${darkMode ? 'text-white/40' : 'text-black/40'}`}>Votes:</span>
                    <span className={`text-sm font-semibold ${darkMode ? 'text-white/80' : 'text-black/80'}`}>{sub.total_votes}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs ${darkMode ? 'text-white/40' : 'text-black/40'}`}>Craft:</span>
                    <span
                      className={`text-sm font-semibold ${
                        sub.craft_percent >= 70
                          ? 'text-emerald-500'
                          : sub.craft_percent <= 30
                          ? 'text-red-500'
                          : darkMode ? 'text-white/80' : 'text-black/80'
                      }`}
                    >
                      {sub.craft_percent}%
                    </span>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="flex items-center gap-2 mt-2">
                  <div className={`flex-1 h-1.5 rounded-full overflow-hidden ${darkMode ? 'bg-white/10' : 'bg-black/10'}`}>
                    <div
                      className={`h-full rounded-full transition-all ${
                        sub.craft_percent >= 70
                          ? 'bg-emerald-500'
                          : sub.craft_percent <= 30
                          ? 'bg-red-500'
                          : darkMode ? 'bg-white/50' : 'bg-black/50'
                      }`}
                      style={{ width: `${sub.craft_percent}%` }}
                    />
                  </div>
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
          ))}
        </div>
      )}
    </div>
  )
}
