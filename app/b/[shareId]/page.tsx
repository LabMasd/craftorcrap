'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import SubmissionCard from '@/components/SubmissionCard'
import type { Submission } from '@/types'

interface BoardItem {
  id: string
  created_at: string
  submissions: Submission
}

interface Board {
  name: string
  share_id: string
  created_at: string
  allow_voting: boolean
  allow_submissions: boolean
}

export default function SharedBoardPage() {
  const params = useParams()
  const shareId = params.shareId as string

  const [board, setBoard] = useState<Board | null>(null)
  const [items, setItems] = useState<BoardItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [darkMode, setDarkMode] = useState(true)

  // Submit state
  const [submitUrl, setSubmitUrl] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('craftorcrap-theme')
    if (saved) setDarkMode(saved === 'dark')
  }, [])

  const fetchBoard = useCallback(async () => {
    try {
      const res = await fetch(`/api/boards/${shareId}`)
      if (!res.ok) {
        setError('Board not found')
        setLoading(false)
        return
      }
      const data = await res.json()
      setBoard(data.board)
      setItems(data.items)
    } catch {
      setError('Failed to load board')
    } finally {
      setLoading(false)
    }
  }, [shareId])

  useEffect(() => {
    if (shareId) {
      fetchBoard()
    }
  }, [shareId, fetchBoard])

  async function handleSubmit(url: string, imageUrl?: string) {
    if (!url.trim() || isSubmitting) return

    // Basic URL validation
    let finalUrl = url.trim()
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'https://' + finalUrl
    }

    try {
      new URL(finalUrl)
    } catch {
      setSubmitError('Please enter a valid URL')
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const res = await fetch(`/api/boards/${shareId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: finalUrl, imageUrl }),
      })

      const data = await res.json()

      if (!res.ok) {
        setSubmitError(data.error || 'Failed to submit')
        return
      }

      setSubmitUrl('')
      setSubmitSuccess(true)
      setTimeout(() => setSubmitSuccess(false), 2000)

      // Refetch board to show new item
      fetchBoard()
    } catch {
      setSubmitError('Failed to submit')
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    setSubmitError(null)

    // Try to get URL from various data types
    const html = e.dataTransfer.getData('text/html')
    const uriList = e.dataTransfer.getData('text/uri-list')
    const text = e.dataTransfer.getData('text/plain')

    let url = ''
    let imageUrl = ''

    // Try to extract href from HTML (best for page links)
    if (html) {
      const hrefMatch = html.match(/href=["']([^"']+)["']/)
      if (hrefMatch) {
        const href = hrefMatch[1]
        // Prefer page URLs over image/CDN URLs
        if (!href.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i)) {
          url = href
        }
      }
      // Also try to get image src
      const srcMatch = html.match(/src=["']([^"']+)["']/)
      if (srcMatch) {
        imageUrl = srcMatch[1]
      }
    }

    // Fall back to uri-list or text
    if (!url) {
      url = uriList || text || ''
    }

    // Check for CDN URLs
    const cdnPatterns = [/i\.pinimg\.com/i, /pinimg\.com/i, /cdn\.dribbble\.com/i, /mir-s3-cdn-cf\.behance\.net/i]
    if (cdnPatterns.some(p => p.test(url))) {
      setSubmitError('Got image URL instead of page link. Try right-click > "Copy link" on the source.')
      return
    }

    if (url) {
      handleSubmit(url, imageUrl)
    }
  }

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-black text-white' : 'bg-neutral-50 text-black'}`}>
        <div className={`animate-spin w-6 h-6 border-2 rounded-full ${darkMode ? 'border-white/20 border-t-white' : 'border-black/20 border-t-black'}`} />
      </div>
    )
  }

  if (error || !board) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center ${darkMode ? 'bg-black text-white' : 'bg-neutral-50 text-black'}`}>
        <h1 className="text-2xl font-bold mb-2">Board not found</h1>
        <p className={`mb-6 ${darkMode ? 'text-white/50' : 'text-black/50'}`}>This board doesn't exist or has been removed.</p>
        <Link href="/" className={`px-6 py-2 rounded-full font-medium ${darkMode ? 'bg-white text-black' : 'bg-black text-white'}`}>
          Go home
        </Link>
      </div>
    )
  }

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-black text-white' : 'bg-neutral-50 text-black'}`}
      onDragOver={board.allow_submissions ? handleDragOver : undefined}
      onDragLeave={board.allow_submissions ? handleDragLeave : undefined}
      onDrop={board.allow_submissions ? handleDrop : undefined}
    >
      {/* Drag overlay */}
      {isDragging && board.allow_submissions && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-white/10 flex items-center justify-center">
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <p className="text-xl font-medium text-white">Drop to add to board</p>
          </div>
        </div>
      )}

      {/* Header */}
      <header className={`sticky top-0 z-40 backdrop-blur-md border-b ${darkMode ? 'bg-black/80 border-white/5' : 'bg-white/80 border-black/5'}`}>
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold">
            craft<span className={darkMode ? 'text-white/40' : 'text-black/40'}>or</span>crap
          </Link>
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

      {/* Board info + Submit area */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <svg className={`w-6 h-6 ${darkMode ? 'text-white/40' : 'text-black/40'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <h1 className="text-2xl font-bold">{board.name}</h1>
            </div>
            <p className={`text-sm ${darkMode ? 'text-white/40' : 'text-black/40'}`}>
              {items.length} item{items.length !== 1 ? 's' : ''} · Shared board
            </p>
          </div>

          {/* Submit input - only show if submissions allowed */}
          {board.allow_submissions && (
            <div className="flex-shrink-0">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={submitUrl}
                  onChange={(e) => setSubmitUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit(submitUrl)}
                  placeholder="Paste URL or drag & drop"
                  className={`w-64 px-4 py-2 text-sm rounded-full outline-none transition-all ${
                    darkMode
                      ? 'bg-white/5 text-white placeholder:text-white/30 focus:bg-white/10'
                      : 'bg-black/5 text-black placeholder:text-black/30 focus:bg-black/10'
                  }`}
                />
                <button
                  onClick={() => handleSubmit(submitUrl)}
                  disabled={isSubmitting || !submitUrl.trim()}
                  className={`px-4 py-2 text-sm font-medium rounded-full transition-all ${
                    submitSuccess
                      ? 'bg-emerald-500 text-white'
                      : darkMode
                      ? 'bg-white text-black hover:bg-white/90 disabled:bg-white/10 disabled:text-white/30'
                      : 'bg-black text-white hover:bg-black/90 disabled:bg-black/10 disabled:text-black/30'
                  }`}
                >
                  {isSubmitting ? (
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : submitSuccess ? (
                    'Added!'
                  ) : (
                    'Add'
                  )}
                </button>
              </div>
              {submitError && (
                <p className="text-xs text-red-500 mt-1 text-right">{submitError}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Items grid */}
      <div className="max-w-6xl mx-auto px-4 pb-20">
        {items.length === 0 ? (
          <div className={`text-center py-20 ${darkMode ? 'text-white/40' : 'text-black/40'}`}>
            <svg className={`w-12 h-12 mx-auto mb-4 ${darkMode ? 'text-white/20' : 'text-black/20'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <p className="text-lg mb-2">This board is empty</p>
            <p className="text-sm">Drop a link or paste a URL to add the first item</p>
          </div>
        ) : (
          <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-3">
            {items.map((item) => (
              <div key={item.id} className="break-inside-avoid mb-3">
                <SubmissionCard
                  submission={item.submissions}
                  size="compact"
                  darkMode={darkMode}
                  disableVoting={!board.allow_voting}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
