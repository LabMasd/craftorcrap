'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import SubmissionCard from '@/components/SubmissionCard'
import { supabase } from '@/lib/supabase'
import type { Submission } from '@/types'

type Tab = 'all' | 'craft' | 'crap'
type CardSize = 'compact' | 'normal' | 'large'

const MOCK_SUBMISSIONS: Submission[] = [
  {
    id: '1',
    url: 'https://linear.app',
    title: 'Linear – Plan, build, ship',
    thumbnail_url: 'https://linear.app/static/og-image.png',
    category: 'Web',
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
  const [cardSize, setCardSize] = useState<CardSize>('normal')
  const [darkMode, setDarkMode] = useState(true)
  const [isDemo, setIsDemo] = useState(false)

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

        if (activeTab === 'craft') {
          filtered.sort((a, b) => {
            const aRatio = a.total_craft / (a.total_craft + a.total_crap || 1)
            const bRatio = b.total_craft / (b.total_craft + b.total_crap || 1)
            return bRatio - aRatio
          })
        } else if (activeTab === 'crap') {
          filtered.sort((a, b) => {
            const aRatio = a.total_crap / (a.total_craft + a.total_crap || 1)
            const bRatio = b.total_crap / (b.total_craft + b.total_crap || 1)
            return bRatio - aRatio
          })
        } else {
          filtered.sort((a, b) => (b.total_craft + b.total_crap) - (a.total_craft + a.total_crap))
        }

        setSubmissions(filtered)
        setIsDemo(true)
        setLoading(false)
        return
      }

      let query = supabase.from('submissions').select('*')

      if (activeTab === 'craft') {
        query = query.order('total_craft', { ascending: false })
      } else if (activeTab === 'crap') {
        query = query.order('total_crap', { ascending: false })
      } else {
        query = query.order('created_at', { ascending: false })
      }

      const { data, error } = await query

      if (!error && data) {
        setSubmissions(data)
      }

      setLoading(false)
    }

    fetchSubmissions()
  }, [activeTab])

  const gridCols = {
    compact: 'columns-2 sm:columns-3 md:columns-4 lg:columns-5 xl:columns-6 2xl:columns-7',
    normal: 'columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5',
    large: 'columns-1 sm:columns-2 lg:columns-3 xl:columns-4',
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

            <Link
              href="/submit"
              className={`text-xs font-medium px-4 py-2 rounded-full transition-all ${
                darkMode
                  ? 'bg-white text-black hover:bg-white/90'
                  : 'bg-black text-white hover:bg-black/90'
              }`}
            >
              Submit
            </Link>
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

        {loading ? (
          <div className={`text-center py-32 ${darkMode ? 'text-white/30' : 'text-black/30'}`}>Loading...</div>
        ) : submissions.length === 0 ? (
          <div className="text-center py-32">
            <p className={`mb-4 ${darkMode ? 'text-white/40' : 'text-black/40'}`}>No submissions yet</p>
            <Link
              href="/submit"
              className={`underline underline-offset-4 transition-colors ${darkMode ? 'text-white/70 hover:text-white' : 'text-black/70 hover:text-black'}`}
            >
              Be the first
            </Link>
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
