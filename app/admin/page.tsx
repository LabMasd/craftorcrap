'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import type { Submission } from '@/types'

function AdminContent() {
  const searchParams = useSearchParams()
  const key = searchParams.get('key')

  const [authorized, setAuthorized] = useState(false)
  const [checking, setChecking] = useState(true)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    async function checkAuth() {
      if (!key) {
        setChecking(false)
        return
      }

      const res = await fetch(`/api/admin/verify?key=${encodeURIComponent(key)}`)
      if (res.ok) {
        setAuthorized(true)
        fetchSubmissions()
      }
      setChecking(false)
    }

    checkAuth()
  }, [key])

  async function fetchSubmissions() {
    setLoading(true)
    const res = await fetch(`/api/admin/submissions?key=${encodeURIComponent(key!)}`)
    if (res.ok) {
      const data = await res.json()
      setSubmissions(data)
    }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this submission?')) return

    setDeleting(id)
    const res = await fetch(`/api/admin/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, key }),
    })

    if (res.ok) {
      setSubmissions(submissions.filter(s => s.id !== id))
    }
    setDeleting(null)
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-white/40">Checking...</p>
      </div>
    )
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/40 mb-4">Not authorized</p>
          <Link href="/" className="text-white/60 hover:text-white underline">
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
          <Link href="/" className="text-white/40 hover:text-white text-sm">
            Back to site
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
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

        {loading ? (
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
      </main>
    </div>
  )
}

export default function AdminPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-white/40">Loading...</p>
      </div>
    }>
      <AdminContent />
    </Suspense>
  )
}
