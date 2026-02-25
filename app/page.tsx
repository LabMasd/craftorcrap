'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import SubmissionCard from '@/components/SubmissionCard'
import { supabase } from '@/lib/supabase'
import type { Submission, Category } from '@/types'
import { CATEGORIES } from '@/types'

type Tab = 'all' | 'craft' | 'crap'
type CardSize = 'compact' | 'normal' | 'large'
type SortMode = 'newest' | 'random'

const COLOR_FILTERS = [
  { name: 'Red', hex: '#ef4444' },
  { name: 'Orange', hex: '#f97316' },
  { name: 'Yellow', hex: '#eab308' },
  { name: 'Green', hex: '#22c55e' },
  { name: 'Blue', hex: '#3b82f6' },
  { name: 'Purple', hex: '#a855f7' },
  { name: 'Pink', hex: '#ec4899' },
  { name: 'Black', hex: '#171717' },
  { name: 'White', hex: '#f5f5f5' },
]

// Calculate color distance (simple RGB distance)
function colorDistance(hex1: string, hex2: string): number {
  const r1 = parseInt(hex1.slice(1, 3), 16)
  const g1 = parseInt(hex1.slice(3, 5), 16)
  const b1 = parseInt(hex1.slice(5, 7), 16)
  const r2 = parseInt(hex2.slice(1, 3), 16)
  const g2 = parseInt(hex2.slice(3, 5), 16)
  const b2 = parseInt(hex2.slice(5, 7), 16)
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2)
}

const MOCK_SUBMISSIONS: Submission[] = [
  {
    id: '1',
    url: 'https://linear.app',
    title: 'Linear – Plan, build, ship',
    thumbnail_url: 'https://linear.app/static/og-image.png',
    category: 'Web',
    dominant_color: '#5E6AD2',
    submitted_by: null,
    total_craft: 847,
    total_crap: 52,
    created_at: new Date().toISOString(),
  },
  {
    id: '2',
    url: 'https://www.apple.com/apple-vision-pro/',
    title: 'Apple Vision Pro',
    thumbnail_url: 'https://www.apple.com/newsroom/images/2024/01/apple-vision-pro-available-in-the-us-on-february-2/article/Apple-Vision-Pro-availability-hero_big.jpg.large.jpg',
    category: 'Branding',
    dominant_color: '#f5f5f5',
    submitted_by: null,
    total_craft: 623,
    total_crap: 198,
    created_at: new Date().toISOString(),
  },
  {
    id: '3',
    url: 'https://www.stripe.com',
    title: 'Stripe – Financial Infrastructure',
    thumbnail_url: 'https://images.ctfassets.net/fzn2n1nzq965/HTTOloNPhisV9P4hlMPNA/cacf1bb88b9fc492dfad34378d844280/Stripe_logo_-_revised_2016.png',
    category: 'Web',
    dominant_color: '#635BFF',
    submitted_by: null,
    total_craft: 912,
    total_crap: 31,
    created_at: new Date().toISOString(),
  },
  {
    id: '4',
    url: 'https://midjourney.com',
    title: 'Midjourney',
    thumbnail_url: 'https://upload.wikimedia.org/wikipedia/commons/e/e6/Midjourney_Emblem.png',
    category: 'Illustration',
    dominant_color: '#171717',
    submitted_by: null,
    total_craft: 445,
    total_crap: 267,
    created_at: new Date().toISOString(),
  },
  {
    id: '5',
    url: 'https://vercel.com',
    title: 'Vercel – Ship with confidence',
    thumbnail_url: 'https://assets.vercel.com/image/upload/front/vercel/dps.png',
    category: 'Web',
    dominant_color: '#171717',
    submitted_by: null,
    total_craft: 734,
    total_crap: 89,
    created_at: new Date().toISOString(),
  },
  {
    id: '6',
    url: 'https://notion.so',
    title: 'Notion – Your wiki, docs & projects',
    thumbnail_url: 'https://www.notion.so/images/meta/default.png',
    category: 'Web',
    dominant_color: '#f5f5f5',
    submitted_by: null,
    total_craft: 567,
    total_crap: 156,
    created_at: new Date().toISOString(),
  },
  {
    id: '7',
    url: 'https://figma.com',
    title: 'Figma – Design tool for teams',
    thumbnail_url: 'https://cdn.sanity.io/images/599r6htc/localized/46a76c802176eb17b04e12108de7e7e0f3736dc6-1024x1024.png',
    category: 'Web',
    dominant_color: '#F24E1E',
    submitted_by: null,
    total_craft: 891,
    total_crap: 45,
    created_at: new Date().toISOString(),
  },
  {
    id: '8',
    url: 'https://raycast.com',
    title: 'Raycast – Supercharged productivity',
    thumbnail_url: 'https://www.raycast.com/og-image.png',
    category: 'Web',
    dominant_color: '#FF6363',
    submitted_by: null,
    total_craft: 678,
    total_crap: 123,
    created_at: new Date().toISOString(),
  },
]

export default function Home() {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('all')
  const [activeCategory, setActiveCategory] = useState<Category | 'all'>('all')
  const [sortMode, setSortMode] = useState<SortMode>('newest')
  const [activeColor, setActiveColor] = useState<string | null>(null)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showCategoryFilter, setShowCategoryFilter] = useState(false)
  const [cardSize, setCardSize] = useState<CardSize>('normal')
  const [darkMode, setDarkMode] = useState(true)
  const [isDemo, setIsDemo] = useState(false)

  // Inline submit state
  const [submitUrl, setSubmitUrl] = useState('')
  const [submitCategory, setSubmitCategory] = useState<Category>('Web')
  const [preview, setPreview] = useState<{ title: string | null; thumbnail_url: string | null; dominant_color: string | null } | null>(null)
  const [fetchingPreview, setFetchingPreview] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('craftorcrap-theme')
    if (saved) setDarkMode(saved === 'dark')
    const savedSize = localStorage.getItem('craftorcrap-card-size')
    if (savedSize) setCardSize(savedSize as CardSize)
  }, [])

  useEffect(() => {
    localStorage.setItem('craftorcrap-theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  useEffect(() => {
    localStorage.setItem('craftorcrap-card-size', cardSize)
  }, [cardSize])

  useEffect(() => {
    async function fetchSubmissions() {
      setLoading(true)

      if (!supabase) {
        let filtered = [...MOCK_SUBMISSIONS]

        // Filter by category
        if (activeCategory !== 'all') {
          filtered = filtered.filter(s => s.category === activeCategory)
        }

        // Filter by tab
        if (activeTab === 'craft') {
          filtered = filtered.filter(s => {
            const total = s.total_craft + s.total_crap
            return total > 0 && (s.total_craft / total) > 0.5
          })
        } else if (activeTab === 'crap') {
          filtered = filtered.filter(s => {
            const total = s.total_craft + s.total_crap
            return total > 0 && (s.total_craft / total) <= 0.5
          })
        }

        // Filter by color
        if (activeColor) {
          filtered = filtered.filter(s => {
            if (!s.dominant_color) return false
            return colorDistance(s.dominant_color, activeColor) < 100
          })
        }

        // Sort by mode
        if (sortMode === 'random') {
          filtered.sort(() => Math.random() - 0.5)
        } else {
          filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        }

        setSubmissions(filtered)
        setIsDemo(true)
        setLoading(false)
        return
      }

      let query = supabase.from('submissions').select('*')

      // Filter by category
      if (activeCategory !== 'all') {
        query = query.eq('category', activeCategory)
      }

      const { data, error } = await query

      if (!error && data) {
        let filtered = [...data]

        // Filter by tab
        if (activeTab === 'craft') {
          filtered = filtered.filter(s => {
            const total = s.total_craft + s.total_crap
            return total > 0 && (s.total_craft / total) > 0.5
          })
        } else if (activeTab === 'crap') {
          filtered = filtered.filter(s => {
            const total = s.total_craft + s.total_crap
            return total > 0 && (s.total_craft / total) <= 0.5
          })
        }

        // Filter by color
        if (activeColor) {
          filtered = filtered.filter(s => {
            if (!s.dominant_color) return false
            return colorDistance(s.dominant_color, activeColor) < 100
          })
        }

        // Sort by mode
        if (sortMode === 'random') {
          filtered.sort(() => Math.random() - 0.5)
        } else {
          filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        }

        setSubmissions(filtered)
      }

      setLoading(false)
    }

    fetchSubmissions()
  }, [activeTab, activeCategory, sortMode, activeColor])

  const gridCols = {
    compact: 'columns-2 sm:columns-3 md:columns-4 lg:columns-5 xl:columns-6 2xl:columns-7',
    normal: 'columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5',
    large: 'columns-1 sm:columns-2 lg:columns-3 xl:columns-4',
  }

  async function handleFetchPreview() {
    if (!submitUrl) return
    setFetchingPreview(true)
    setSubmitError(null)
    setPreview(null)

    try {
      const res = await fetch('/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: submitUrl }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to fetch preview')
      }
      const data = await res.json()
      setPreview(data)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to fetch preview')
    } finally {
      setFetchingPreview(false)
    }
  }

  async function handleSubmit() {
    if (!submitUrl || !preview) return

    if (isDemo) {
      // Demo mode - just show success and reset
      setSubmitSuccess(true)
      setTimeout(() => {
        setSubmitUrl('')
        setPreview(null)
        setSubmitSuccess(false)
      }, 2000)
      return
    }

    if (!supabase) return

    setSubmitting(true)
    setSubmitError(null)

    try {
      const { data: existing } = await supabase
        .from('submissions')
        .select('id')
        .eq('url', submitUrl)
        .single()

      if (existing) {
        setSubmitError('This URL has already been submitted')
        setSubmitting(false)
        return
      }

      const { error: insertError } = await supabase.from('submissions').insert({
        url: submitUrl,
        title: preview.title,
        thumbnail_url: preview.thumbnail_url,
        dominant_color: preview.dominant_color,
        category: submitCategory,
        submitted_by: null,
      })

      if (insertError) throw insertError

      setSubmitSuccess(true)
      setSubmitUrl('')
      setPreview(null)

      // Refresh submissions
      const { data } = await supabase
        .from('submissions')
        .select('*')
        .order('created_at', { ascending: false })
      if (data) setSubmissions(data)

      setTimeout(() => setSubmitSuccess(false), 3000)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit')
    } finally {
      setSubmitting(false)
    }
  }

  let submitDomain = ''
  if (submitUrl) {
    try {
      submitDomain = new URL(submitUrl).hostname.replace('www.', '')
    } catch {
      submitDomain = ''
    }
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-black text-white' : 'bg-neutral-50 text-black'}`}>
      {/* Fixed Header */}
      <header className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-xl ${darkMode ? 'bg-black/80 border-b border-white/10' : 'bg-white/80 border-b border-black/5'}`}>
        <div className="px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            craft<span className={darkMode ? 'text-white/40' : 'text-black/40'}>or</span>crap
          </Link>

          {/* Desktop: Center Tabs */}
          <div className={`hidden sm:flex absolute left-1/2 -translate-x-1/2 gap-0.5 p-1 rounded-full ${darkMode ? 'bg-white/5' : 'bg-black/5'}`}>
            {(['all', 'craft', 'crap'] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2 text-xs font-medium rounded-full transition-all duration-200 ${
                  activeTab === tab
                    ? darkMode ? 'bg-white text-black' : 'bg-black text-white'
                    : darkMode ? 'text-white/50 hover:text-white/70' : 'text-black/50 hover:text-black/70'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-full transition-all ${darkMode ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
              title={darkMode ? 'Light mode' : 'Dark mode'}
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

            {/* Card size toggle - hidden on mobile */}
            <div className={`hidden sm:flex rounded-full p-0.5 ${darkMode ? 'bg-white/5' : 'bg-black/5'}`}>
              {(['compact', 'normal', 'large'] as CardSize[]).map((size) => (
                <button
                  key={size}
                  onClick={() => setCardSize(size)}
                  className={`p-1.5 rounded-full transition-all ${
                    cardSize === size
                      ? darkMode ? 'bg-white text-black' : 'bg-black text-white'
                      : darkMode ? 'text-white/40' : 'text-black/40'
                  }`}
                  title={size.charAt(0).toUpperCase() + size.slice(1)}
                >
                  {size === 'compact' && (
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16">
                      <rect x="1" y="1" width="6" height="6" rx="1" />
                      <rect x="9" y="1" width="6" height="6" rx="1" />
                      <rect x="1" y="9" width="6" height="6" rx="1" />
                      <rect x="9" y="9" width="6" height="6" rx="1" />
                    </svg>
                  )}
                  {size === 'normal' && (
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16">
                      <rect x="1" y="1" width="6" height="14" rx="1" />
                      <rect x="9" y="1" width="6" height="14" rx="1" />
                    </svg>
                  )}
                  {size === 'large' && (
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16">
                      <rect x="1" y="1" width="14" height="14" rx="1" />
                    </svg>
                  )}
                </button>
              ))}
            </div>

                      </div>
        </div>

        {/* Mobile: Tabs below header */}
        <div className={`sm:hidden flex justify-center pb-3 ${darkMode ? 'border-white/0' : 'border-black/0'}`}>
          <div className={`flex gap-0.5 p-1 rounded-full ${darkMode ? 'bg-white/5' : 'bg-black/5'}`}>
            {(['all', 'craft', 'crap'] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2 text-xs font-medium rounded-full transition-all duration-200 ${
                  activeTab === tab
                    ? darkMode ? 'bg-white text-black' : 'bg-black text-white'
                    : darkMode ? 'text-white/50 hover:text-white/70' : 'text-black/50 hover:text-black/70'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-28 sm:pt-20 px-3 sm:px-4 pb-20">
        {isDemo && (
          <div className={`mb-4 py-2 px-3 rounded-lg text-[11px] text-center ${darkMode ? 'bg-white/5 text-white/40' : 'bg-black/5 text-black/40'}`}>
            Demo mode — Connect Supabase to enable real submissions
          </div>
        )}

        {/* Inline Submit */}
        <div className={`mb-6 p-4 rounded-2xl ${darkMode ? 'bg-white/[0.03] border border-white/[0.06]' : 'bg-black/[0.02] border border-black/[0.06]'}`}>
          <div className="flex gap-2">
            <input
              type="url"
              value={submitUrl}
              onChange={(e) => setSubmitUrl(e.target.value)}
              placeholder="Paste a URL..."
              className={`flex-1 border-0 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 ${
                darkMode
                  ? 'bg-white/5 text-white placeholder-white/30 focus:ring-white/20'
                  : 'bg-black/5 text-black placeholder-black/30 focus:ring-black/20'
              }`}
            />
            <button
              onClick={handleFetchPreview}
              disabled={!submitUrl || fetchingPreview}
              className={`px-5 py-3 rounded-xl text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed transition-all ${
                darkMode
                  ? 'bg-white/10 text-white/70 hover:bg-white/15'
                  : 'bg-black/10 text-black/70 hover:bg-black/15'
              }`}
            >
              {fetchingPreview ? '...' : 'Preview'}
            </button>
          </div>

          {submitError && (
            <div className="mt-3 p-3 bg-red-500/10 rounded-xl text-red-400 text-xs">
              {submitError}
            </div>
          )}

          {submitSuccess && (
            <div className="mt-3 p-3 bg-emerald-500/10 rounded-xl text-emerald-400 text-xs">
              Submitted successfully!
            </div>
          )}

          {preview && (
            <div className="mt-4">
              <div className={`flex gap-4 items-start p-3 rounded-xl ${darkMode ? 'bg-white/[0.02]' : 'bg-black/[0.02]'}`}>
                {preview.thumbnail_url ? (
                  <img
                    src={preview.thumbnail_url}
                    alt=""
                    className="w-24 h-16 object-cover rounded-lg flex-shrink-0"
                  />
                ) : (
                  <div className={`w-24 h-16 rounded-lg flex-shrink-0 flex items-center justify-center text-[10px] ${darkMode ? 'bg-white/5 text-white/20' : 'bg-black/5 text-black/20'}`}>
                    No preview
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h4 className={`font-medium text-sm truncate ${darkMode ? 'text-white/90' : 'text-black/90'}`}>
                    {preview.title || submitDomain}
                  </h4>
                  <p className={`text-xs mt-0.5 ${darkMode ? 'text-white/30' : 'text-black/30'}`}>{submitDomain}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSubmitCategory(cat)}
                    className={`px-3 py-1.5 text-[11px] font-medium rounded-full transition-all ${
                      submitCategory === cat
                        ? darkMode ? 'bg-white text-black' : 'bg-black text-white'
                        : darkMode ? 'bg-white/5 text-white/40 hover:text-white/70' : 'bg-black/5 text-black/40 hover:text-black/70'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <button
                onClick={handleSubmit}
                disabled={submitting}
                className={`mt-4 w-full py-3 rounded-xl text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all ${
                  darkMode
                    ? 'bg-white text-black hover:bg-white/90'
                    : 'bg-black text-white hover:bg-black/90'
                }`}
              >
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          )}
        </div>

        {/* Category Filters + Sort */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          {/* Category Filter - slides from left */}
          <div className="flex items-center">
            <button
              onClick={() => setShowCategoryFilter(!showCategoryFilter)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-full transition-all ${
                activeCategory !== 'all' || showCategoryFilter
                  ? darkMode ? 'bg-white text-black' : 'bg-black text-white'
                  : darkMode ? 'bg-white/5 text-white/50 hover:text-white/70' : 'bg-black/5 text-black/50 hover:text-black/70'
              }`}
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              {activeCategory !== 'all' ? activeCategory : 'Filter'}
            </button>
            <div className={`flex items-center overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${
              showCategoryFilter ? 'max-w-[500px] opacity-100 ml-2' : 'max-w-0 opacity-0 ml-0'
            }`}>
              <div className={`flex items-center gap-1 p-1 rounded-full ${darkMode ? 'bg-white/5' : 'bg-black/5'}`}>
                <button
                  onClick={() => { setActiveCategory('all'); setShowCategoryFilter(false); }}
                  className={`px-2.5 py-1 text-[10px] font-medium rounded-full transition-all whitespace-nowrap ${
                    activeCategory === 'all'
                      ? darkMode ? 'bg-white text-black' : 'bg-black text-white'
                      : darkMode ? 'text-white/50 hover:text-white/70' : 'text-black/50 hover:text-black/70'
                  }`}
                >
                  All
                </button>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => { setActiveCategory(cat); setShowCategoryFilter(false); }}
                    className={`px-2.5 py-1 text-[10px] font-medium rounded-full transition-all whitespace-nowrap ${
                      activeCategory === cat
                        ? darkMode ? 'bg-white text-black' : 'bg-black text-white'
                        : darkMode ? 'text-white/50 hover:text-white/70' : 'text-black/50 hover:text-black/70'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Color + Sort */}
          <div className="flex items-center gap-2">
            {/* Color Filter - slides from right */}
            <div className="flex items-center">
              <div className={`flex items-center overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                showColorPicker ? 'max-w-[280px] opacity-100 mr-2' : 'max-w-0 opacity-0 mr-0'
              }`}>
                <div className={`flex items-center gap-1 p-1 rounded-full ${darkMode ? 'bg-white/5' : 'bg-black/5'}`}>
                  <button
                    onClick={() => { setActiveColor(null); setShowColorPicker(false); }}
                    className={`w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center flex-shrink-0 ${
                      activeColor === null
                        ? darkMode ? 'border-white' : 'border-black'
                        : darkMode ? 'border-white/20 hover:border-white/40' : 'border-black/20 hover:border-black/40'
                    }`}
                    title="All colors"
                  >
                    <span className={`text-[7px] ${darkMode ? 'text-white/60' : 'text-black/60'}`}>All</span>
                  </button>
                  {COLOR_FILTERS.map((color) => (
                    <button
                      key={color.hex}
                      onClick={() => { setActiveColor(color.hex); setShowColorPicker(false); }}
                      className={`w-5 h-5 rounded-full border-2 transition-all flex-shrink-0 ${
                        activeColor === color.hex
                          ? darkMode ? 'border-white scale-110' : 'border-black scale-110'
                          : darkMode ? 'border-white/20 hover:border-white/40' : 'border-black/20 hover:border-black/40'
                      }`}
                      style={{ backgroundColor: color.hex }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
              <button
                onClick={() => setShowColorPicker(!showColorPicker)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-full transition-all ${
                  activeColor || showColorPicker
                    ? darkMode ? 'bg-white text-black' : 'bg-black text-white'
                    : darkMode ? 'bg-white/5 text-white/50 hover:text-white/70' : 'bg-black/5 text-black/50 hover:text-black/70'
                }`}
              >
                {activeColor ? (
                  <span className="w-3 h-3 rounded-full border border-current" style={{ backgroundColor: activeColor }} />
                ) : (
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                  </svg>
                )}
                Color
              </button>
            </div>

            {/* Sort Toggle */}
            <div className={`flex gap-0.5 p-0.5 rounded-full ${darkMode ? 'bg-white/5' : 'bg-black/5'}`}>
              <button
                onClick={() => setSortMode('newest')}
                className={`px-3 py-1.5 text-[11px] font-medium rounded-full transition-all ${
                  sortMode === 'newest'
                    ? darkMode ? 'bg-white text-black' : 'bg-black text-white'
                    : darkMode ? 'text-white/50 hover:text-white/70' : 'text-black/50 hover:text-black/70'
                }`}
              >
                Newest
              </button>
              <button
                onClick={() => setSortMode('random')}
                className={`px-3 py-1.5 text-[11px] font-medium rounded-full transition-all ${
                  sortMode === 'random'
                    ? darkMode ? 'bg-white text-black' : 'bg-black text-white'
                    : darkMode ? 'text-white/50 hover:text-white/70' : 'text-black/50 hover:text-black/70'
                }`}
              >
                Random
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className={`text-center py-32 ${darkMode ? 'text-white/30' : 'text-black/30'}`}>Loading...</div>
        ) : submissions.length === 0 ? (
          <div className="text-center py-32">
            <p className={`mb-4 ${darkMode ? 'text-white/40' : 'text-black/40'}`}>
              {activeCategory !== 'all' ? `No ${activeCategory} submissions yet` : 'No submissions yet'}
            </p>
            {activeCategory !== 'all' ? (
              <button
                onClick={() => setActiveCategory('all')}
                className={`underline underline-offset-4 transition-colors ${darkMode ? 'text-white/70 hover:text-white' : 'text-black/70 hover:text-black'}`}
              >
                View all
              </button>
            ) : (
              <Link
                href="/submit"
                className={`underline underline-offset-4 transition-colors ${darkMode ? 'text-white/70 hover:text-white' : 'text-black/70 hover:text-black'}`}
              >
                Be the first
              </Link>
            )}
          </div>
        ) : (
          <div className={`${gridCols[cardSize]} gap-3`}>
            {submissions.map((submission) => (
              <div key={submission.id} className="break-inside-avoid mb-3">
                <SubmissionCard
                  submission={submission}
                  size={cardSize}
                  darkMode={darkMode}
                />
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className={`fixed bottom-0 left-0 right-0 py-3 text-center text-[11px] ${darkMode ? 'text-white/30' : 'text-black/30'}`}>
        <Link href="/about" className={`hover:underline ${darkMode ? 'text-white/50 hover:text-white/70' : 'text-black/50 hover:text-black/70'}`}>
          About
        </Link>
        <span className="mx-2">·</span>
        Made with 🖤 by{' '}
        <a
          href="https://masd.lab"
          target="_blank"
          rel="noopener noreferrer"
          className={`hover:underline ${darkMode ? 'text-white/50 hover:text-white/70' : 'text-black/50 hover:text-black/70'}`}
        >
          masd.lab
        </a>{' '}
        in London
      </footer>
    </div>
  )
}
