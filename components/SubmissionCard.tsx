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

        {/* Category picker for uncategorized submissions */}
        {needsCategory && !isCompact && (
          <div className={`mb-3 ${showCategoryPicker ? '' : ''}`}>
            {showCategoryPicker ? (
              <div className="flex flex-wrap gap-1">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => handleSetCategory(cat)}
                    disabled={isSettingCategory}
                    className={`px-2 py-1 text-[9px] font-medium rounded-md transition-all ${
                      darkMode
                        ? 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
                        : 'bg-black/10 text-black/70 hover:bg-black/20 hover:text-black'
                    } ${isSettingCategory ? 'opacity-50' : ''}`}
                  >
                    {cat}
                  </button>
                ))}
                <button
                  onClick={() => setShowCategoryPicker(false)}
                  className={`px-2 py-1 text-[9px] rounded-md ${
                    darkMode ? 'text-white/30 hover:text-white/50' : 'text-black/30 hover:text-black/50'
                  }`}
                >
                  ×
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowCategoryPicker(true)}
                className={`flex items-center gap-1 px-2 py-1 text-[9px] font-medium rounded-md transition-all ${
                  darkMode
                    ? 'bg-amber-500/10 text-amber-400/80 hover:bg-amber-500/20 hover:text-amber-400'
                    : 'bg-amber-500/10 text-amber-600/80 hover:bg-amber-500/20 hover:text-amber-600'
                }`}
              >
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                Add category
              </button>
            )}
          </div>
        )}

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
