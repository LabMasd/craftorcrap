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

export default function MySubmissions() {
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
            <div key={i} className="bg-white/[0.03] rounded-xl p-4 animate-pulse">
              <div className="h-3 w-16 bg-white/10 rounded mb-2" />
              <div className="h-7 w-12 bg-white/10 rounded" />
            </div>
          ))}
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white/[0.03] rounded-xl p-4 animate-pulse">
              <div className="flex gap-4">
                <div className="w-20 h-20 bg-white/10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 bg-white/10 rounded" />
                  <div className="h-3 w-1/2 bg-white/10 rounded" />
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
        <StatCard label="Submissions" value={stats.total_submissions} />
        <StatCard label="Total Votes" value={stats.total_votes_received} />
        <StatCard
          label="Avg Craft %"
          value={`${stats.avg_craft_percent}%`}
          color={stats.avg_craft_percent >= 70 ? 'green' : stats.avg_craft_percent <= 30 ? 'red' : 'default'}
        />
      </div>

      {/* Submissions List */}
      {submissions.length === 0 ? (
        <div className="text-center py-12 text-white/40">
          <svg
            className="w-12 h-12 mx-auto mb-4 text-white/20"
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
            className="inline-block mt-4 px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-white/90 transition-all"
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
              className="flex items-center gap-4 p-4 bg-white/[0.03] hover:bg-white/[0.05] rounded-xl transition-all group"
            >
              {/* Thumbnail */}
              <div className="w-20 h-20 rounded-lg overflow-hidden bg-white/[0.02] flex-shrink-0">
                {sub.thumbnail_url ? (
                  <img
                    src={sub.thumbnail_url}
                    alt={sub.title || 'Thumbnail'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/20 text-xs">
                    No preview
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-white/90 truncate group-hover:text-white">
                  {sub.title || new URL(sub.url).hostname}
                </h3>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-white/40">Votes:</span>
                    <span className="text-sm font-semibold text-white/80">{sub.total_votes}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-white/40">Craft:</span>
                    <span
                      className={`text-sm font-semibold ${
                        sub.craft_percent >= 70
                          ? 'text-emerald-400'
                          : sub.craft_percent <= 30
                          ? 'text-red-400'
                          : 'text-white/80'
                      }`}
                    >
                      {sub.craft_percent}%
                    </span>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        sub.craft_percent >= 70
                          ? 'bg-emerald-500'
                          : sub.craft_percent <= 30
                          ? 'bg-red-500'
                          : 'bg-white/50'
                      }`}
                      style={{ width: `${sub.craft_percent}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Arrow */}
              <svg
                className="w-4 h-4 text-white/20 group-hover:text-white/40 flex-shrink-0"
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
