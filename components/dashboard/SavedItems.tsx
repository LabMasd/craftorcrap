'use client'

import { useState, useEffect } from 'react'

interface SavedItem {
  id: string
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

export default function SavedItems() {
  const [items, setItems] = useState<SavedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [removingId, setRemovingId] = useState<string | null>(null)

  useEffect(() => {
    async function fetchSaved() {
      try {
        const res = await fetch('/api/user/saved')
        if (res.ok) {
          const data = await res.json()
          setItems(data.items || [])
        }
      } catch (error) {
        console.error('Error fetching saved items:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchSaved()
  }, [])

  async function handleRemove(submissionId: string) {
    setRemovingId(submissionId)
    try {
      const res = await fetch('/api/user/saved', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submission_id: submissionId }),
      })
      if (res.ok) {
        setItems((prev) => prev.filter((item) => item.submissions.id !== submissionId))
      }
    } catch (error) {
      console.error('Error removing saved item:', error)
    } finally {
      setRemovingId(null)
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-white/[0.03] rounded-xl overflow-hidden animate-pulse">
            <div className="aspect-video bg-white/10" />
            <div className="p-3 space-y-2">
              <div className="h-4 w-3/4 bg-white/10 rounded" />
              <div className="h-3 w-1/2 bg-white/10 rounded" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
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
            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
          />
        </svg>
        <p className="text-lg mb-2">No saved items</p>
        <p className="text-sm">Star submissions you like to save them here</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {items.map((item) => {
        const sub = item.submissions
        const totalVotes = sub.total_craft + sub.total_crap
        const craftPercent = totalVotes > 0 ? Math.round((sub.total_craft / totalVotes) * 100) : 50

        return (
          <div
            key={item.id}
            className="group bg-white/[0.03] hover:bg-white/[0.05] rounded-xl overflow-hidden transition-all relative"
          >
            {/* Remove button */}
            <button
              onClick={() => handleRemove(sub.id)}
              disabled={removingId === sub.id}
              className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-black/50 text-white/60 opacity-0 group-hover:opacity-100 hover:bg-black/70 hover:text-white transition-all"
              title="Remove from saved"
            >
              {removingId === sub.id ? (
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </button>

            <a href={sub.url} target="_blank" rel="noopener noreferrer">
              {/* Thumbnail */}
              <div className="aspect-video bg-white/[0.02] overflow-hidden">
                {sub.thumbnail_url ? (
                  <img
                    src={sub.thumbnail_url}
                    alt={sub.title || 'Thumbnail'}
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/20 text-xs">
                    No preview
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-3">
                <h3 className="text-sm font-medium text-white/90 truncate group-hover:text-white">
                  {sub.title || new URL(sub.url).hostname}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        craftPercent >= 70 ? 'bg-emerald-500' : craftPercent <= 30 ? 'bg-red-500' : 'bg-white/50'
                      }`}
                      style={{ width: `${craftPercent}%` }}
                    />
                  </div>
                  <span className="text-xs text-white/40">{craftPercent}%</span>
                </div>
              </div>
            </a>
          </div>
        )
      })}
    </div>
  )
}
