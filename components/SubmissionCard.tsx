'use client'

import { useState, useEffect } from 'react'
import type { Submission, Verdict, Category } from '@/types'
import { CATEGORIES } from '@/types'
import { getFingerprint } from '@/lib/fingerprint'
import { supabase } from '@/lib/supabase'

type CardSize = 'compact' | 'normal' | 'large'

interface SubmissionCardProps {
  submission: Submission
  size?: CardSize
  darkMode?: boolean
}

export default function SubmissionCard({
  submission: initialSubmission,
  size = 'normal',
  darkMode = true,
}: SubmissionCardProps) {
  const [submission, setSubmission] = useState(initialSubmission)
  const [userVote, setUserVote] = useState<Verdict | null>(null)
  const [isVoting, setIsVoting] = useState(false)
  const [fingerprint, setFingerprint] = useState<string>('')
  const [isDemo, setIsDemo] = useState(false)
  const [showCategoryPicker, setShowCategoryPicker] = useState(false)
  const [isSettingCategory, setIsSettingCategory] = useState(false)
  const [isStarred, setIsStarred] = useState(false)

  const totalVotes = submission.total_craft + submission.total_crap
  const craftPercent = totalVotes > 0 ? Math.round((submission.total_craft / totalVotes) * 100) : 50

  let domain = ''
  try {
    domain = new URL(submission.url).hostname.replace('www.', '')
  } catch {
    domain = submission.url
  }

  useEffect(() => {
    if (!supabase) {
      setIsDemo(true)
      return
    }
    getFingerprint().then(setFingerprint)
  }, [])

  // Check if submission is starred
  useEffect(() => {
    const starred = JSON.parse(localStorage.getItem('craftorcrap-starred') || '[]')
    setIsStarred(starred.includes(submission.id))
  }, [submission.id])

  function toggleStar() {
    const starred = JSON.parse(localStorage.getItem('craftorcrap-starred') || '[]')
    let newStarred: string[]
    if (starred.includes(submission.id)) {
      newStarred = starred.filter((id: string) => id !== submission.id)
      setIsStarred(false)
    } else {
      newStarred = [...starred, submission.id]
      setIsStarred(true)
    }
    localStorage.setItem('craftorcrap-starred', JSON.stringify(newStarred))
    // Dispatch event so other components can react
    window.dispatchEvent(new CustomEvent('starred-change', { detail: newStarred }))
  }

  useEffect(() => {
    if (!fingerprint || !supabase) return

    async function checkExistingVote() {
      const { data } = await supabase
        .from('votes')
        .select('verdict')
        .eq('submission_id', submission.id)
        .eq('fingerprint', fingerprint)
        .single()

      if (data) {
        setUserVote(data.verdict as Verdict)
      }
    }

    checkExistingVote()
  }, [fingerprint, submission.id])

  useEffect(() => {
    if (!supabase) return

    const channel = supabase
      .channel(`submission:${submission.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'submissions',
          filter: `id=eq.${submission.id}`,
        },
        (payload) => {
          setSubmission(payload.new as Submission)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [submission.id])

  async function handleVote(verdict: Verdict) {
    if (userVote || isVoting) return

    if (isDemo) {
      setUserVote(verdict)
      setSubmission((prev) => ({
        ...prev,
        total_craft: verdict === 'craft' ? prev.total_craft + 1 : prev.total_craft,
        total_crap: verdict === 'crap' ? prev.total_crap + 1 : prev.total_crap,
      }))
      return
    }

    if (!fingerprint) return

    setIsVoting(true)

    try {
      const response = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submission_id: submission.id,
          verdict,
          fingerprint,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setUserVote(verdict)
        setSubmission((prev) => ({
          ...prev,
          total_craft: data.total_craft,
          total_crap: data.total_crap,
        }))
      }
    } finally {
      setIsVoting(false)
    }
  }

  async function handleSetCategory(category: Category) {
    if (isSettingCategory || submission.category) return

    if (isDemo) {
      setSubmission((prev) => ({ ...prev, category }))
      setShowCategoryPicker(false)
      return
    }

    setIsSettingCategory(true)

    try {
      const response = await fetch('/api/category', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submission_id: submission.id,
          category,
        }),
      })

      if (response.ok) {
        setSubmission((prev) => ({ ...prev, category }))
        setShowCategoryPicker(false)
      }
    } finally {
      setIsSettingCategory(false)
    }
  }

  const isCompact = size === 'compact'
  const needsCategory = !submission.category

  return (
    <div
      className={`group rounded-xl overflow-hidden transition-all duration-300 ${
        darkMode
          ? 'bg-white/[0.03] hover:bg-white/[0.05]'
          : 'bg-white hover:shadow-lg'
      }`}
    >
      <div className="relative">
        <a
          href={submission.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          <div className={`relative overflow-hidden ${darkMode ? 'bg-white/[0.02]' : 'bg-neutral-100'}`}>
            {submission.thumbnail_url ? (
              <img
                src={submission.thumbnail_url}
                alt={submission.title || 'Submission thumbnail'}
                className="w-full h-auto object-cover group-hover:scale-[1.02] transition-transform duration-500"
                loading="lazy"
              />
            ) : (
              <div
                className={`w-full aspect-video flex items-center justify-center text-sm ${
                  darkMode ? 'text-white/20' : 'text-black/20'
                }`}
              >
                No preview
              </div>
            )}
          </div>
        </a>

        {/* Category tag - top left for uncategorized */}
        {needsCategory && (
          <div className="absolute top-2 left-2">
            {showCategoryPicker ? (
              <div className="flex flex-wrap gap-1 max-w-[200px] bg-black/80 backdrop-blur-sm p-2 rounded-lg">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => handleSetCategory(cat)}
                    disabled={isSettingCategory}
                    className={`px-2 py-1 text-[9px] font-medium rounded transition-all bg-white/20 text-white hover:bg-white/30 ${
                      isSettingCategory ? 'opacity-50' : ''
                    }`}
                  >
                    {cat}
                  </button>
                ))}
                <button
                  onClick={() => setShowCategoryPicker(false)}
                  className="px-2 py-1 text-[9px] text-white/50 hover:text-white"
                >
                  ×
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowCategoryPicker(true)}
                className="flex items-center gap-1 px-2 py-1.5 text-[10px] font-medium rounded-md bg-amber-500 text-white hover:bg-amber-600 transition-all shadow-lg"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                Add tag
              </button>
            )}
          </div>
        )}

        {/* Star button - top right */}
        <button
          onClick={toggleStar}
          className={`absolute top-2 right-2 p-1.5 rounded-full transition-all ${
            isStarred
              ? 'bg-amber-500 text-white'
              : darkMode
              ? 'bg-black/50 text-white/60 opacity-0 group-hover:opacity-100 hover:bg-black/70 hover:text-white'
              : 'bg-white/50 text-black/60 opacity-0 group-hover:opacity-100 hover:bg-white/70 hover:text-black'
          }`}
          title={isStarred ? 'Remove from saved' : 'Save'}
        >
          <svg
            className={isCompact ? 'w-3 h-3' : 'w-4 h-4'}
            fill={isStarred ? 'currentColor' : 'none'}
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        </button>
      </div>

      <div className={isCompact ? 'p-2.5' : 'p-4'}>
        <div className={isCompact ? 'mb-2' : 'mb-3'}>
          <h3
            className={`font-medium leading-snug ${isCompact ? 'line-clamp-1 text-[11px]' : 'line-clamp-2 text-sm'} ${
              darkMode ? 'text-white/90' : 'text-black/90'
            }`}
          >
            {submission.title || domain}
          </h3>
          {!isCompact && (
            <p className={`text-[11px] mt-0.5 ${darkMode ? 'text-white/30' : 'text-black/40'}`}>
              {domain}
            </p>
          )}
        </div>

        <div className={`flex gap-1 ${isCompact ? 'mb-1.5' : 'mb-3'}`}>
          <button
            onClick={() => handleVote('craft')}
            disabled={!!userVote || isVoting}
            className={`flex-1 font-semibold tracking-wide rounded-md transition-all duration-200 ${
              isCompact ? 'py-1 text-[9px]' : 'py-2 text-[11px]'
            } ${
              userVote === 'craft'
                ? darkMode
                  ? 'bg-white text-black'
                  : 'bg-black text-white'
                : userVote
                ? darkMode
                  ? 'bg-white/5 text-white/20 cursor-not-allowed'
                  : 'bg-black/5 text-black/20 cursor-not-allowed'
                : darkMode
                ? 'bg-white/5 text-white/60 hover:bg-white hover:text-black'
                : 'bg-black/5 text-black/60 hover:bg-black hover:text-white'
            }`}
          >
            CRAFT
          </button>
          <button
            onClick={() => handleVote('crap')}
            disabled={!!userVote || isVoting}
            className={`flex-1 font-semibold tracking-wide rounded-md transition-all duration-200 ${
              isCompact ? 'py-1 text-[9px]' : 'py-2 text-[11px]'
            } ${
              userVote === 'crap'
                ? darkMode
                  ? 'bg-white text-black'
                  : 'bg-black text-white'
                : userVote
                ? darkMode
                  ? 'bg-white/5 text-white/20 cursor-not-allowed'
                  : 'bg-black/5 text-black/20 cursor-not-allowed'
                : darkMode
                ? 'bg-white/5 text-white/60 hover:bg-white hover:text-black'
                : 'bg-black/5 text-black/60 hover:bg-black hover:text-white'
            }`}
          >
            CRAP
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div
            className={`flex-1 h-1 rounded-full overflow-hidden ${
              darkMode ? 'bg-white/10' : 'bg-black/10'
            }`}
          >
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                craftPercent >= 70
                  ? 'bg-emerald-500'
                  : craftPercent <= 30
                  ? 'bg-red-500'
                  : darkMode ? 'bg-white/50' : 'bg-black/50'
              }`}
              style={{ width: `${craftPercent}%` }}
            />
          </div>
          <span
            className={`font-semibold tabular-nums ${isCompact ? 'text-[8px]' : 'text-[10px]'} ${
              craftPercent >= 70
                ? 'text-emerald-500'
                : craftPercent <= 30
                ? 'text-red-500'
                : darkMode ? 'text-white/40' : 'text-black/40'
            }`}
          >
            {craftPercent}%
          </span>
        </div>
      </div>
    </div>
  )
}
