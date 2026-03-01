'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'

interface Board {
  id: string
  title: string
  description: string | null
  slug: string
  topic: string | null
  allowVoting: boolean
  allowSubmissions: boolean
  followerCount: number
  itemCount: number
  previews: string[]
  createdAt: string
  creator: {
    name: string
    avatar: string | null
  } | null
}

export default function ExplorePage() {
  const [darkMode, setDarkMode] = useState(true)
  const [boards, setBoards] = useState<Board[]>([])
  const [topics, setTopics] = useState<string[]>([])
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null)
  const [sort, setSort] = useState<'popular' | 'recent'>('popular')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem('craftorcrap-theme')
    if (saved) setDarkMode(saved === 'dark')
  }, [])

  useEffect(() => {
    fetchBoards()
  }, [selectedTopic, sort])

  async function fetchBoards() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedTopic) params.set('topic', selectedTopic)
      params.set('sort', sort)

      const response = await fetch(`/api/explore?${params}`)
      const data = await response.json()
      setBoards(data.boards || [])
      setTopics(data.topics || [])
    } catch (err) {
      console.error('Failed to fetch boards:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-black text-white' : 'bg-white text-black'}`}>
      {/* Header */}
      <header className={`sticky top-0 z-40 backdrop-blur-md border-b ${darkMode ? 'bg-black/80 border-white/5' : 'bg-white/80 border-black/5'}`}>
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold">
            craft<span className={darkMode ? 'text-white/40' : 'text-black/40'}>or</span>crap
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className={`text-sm ${darkMode ? 'text-white/50 hover:text-white' : 'text-black/50 hover:text-black'}`}
            >
              Vote
            </Link>
            <Link
              href="/leaderboard"
              className={`text-sm ${darkMode ? 'text-white/50 hover:text-white' : 'text-black/50 hover:text-black'}`}
            >
              Leaderboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Explore Boards</h1>
          <p className={darkMode ? 'text-white/50' : 'text-black/50'}>
            Community conversations about design, culture, and everything in between
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 mb-8">
          {/* Topic pills */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedTopic(null)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                !selectedTopic
                  ? darkMode ? 'bg-white text-black' : 'bg-black text-white'
                  : darkMode ? 'bg-white/10 text-white/70 hover:bg-white/15' : 'bg-black/10 text-black/70 hover:bg-black/15'
              }`}
            >
              All
            </button>
            {topics.map(topic => (
              <button
                key={topic}
                onClick={() => setSelectedTopic(topic)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedTopic === topic
                    ? darkMode ? 'bg-white text-black' : 'bg-black text-white'
                    : darkMode ? 'bg-white/10 text-white/70 hover:bg-white/15' : 'bg-black/10 text-black/70 hover:bg-black/15'
                }`}
              >
                {topic}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="ml-auto flex gap-2">
            <button
              onClick={() => setSort('popular')}
              className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                sort === 'popular'
                  ? darkMode ? 'bg-white/20 text-white' : 'bg-black/20 text-black'
                  : darkMode ? 'text-white/50 hover:text-white' : 'text-black/50 hover:text-black'
              }`}
            >
              Popular
            </button>
            <button
              onClick={() => setSort('recent')}
              className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                sort === 'recent'
                  ? darkMode ? 'bg-white/20 text-white' : 'bg-black/20 text-black'
                  : darkMode ? 'text-white/50 hover:text-white' : 'text-black/50 hover:text-black'
              }`}
            >
              Recent
            </button>
          </div>
        </div>

        {/* Boards grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className={`animate-spin w-6 h-6 border-2 rounded-full ${darkMode ? 'border-white/20 border-t-white' : 'border-black/20 border-t-black'}`} />
          </div>
        ) : boards.length === 0 ? (
          <div className={`text-center py-20 ${darkMode ? 'text-white/40' : 'text-black/40'}`}>
            <p className="text-lg mb-2">No boards yet</p>
            <p className="text-sm">Be the first to create a public board!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {boards.map(board => (
              <Link
                key={board.id}
                href={`/b/${board.slug}`}
                className={`group block rounded-2xl overflow-hidden transition-all ${
                  darkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-black/5 hover:bg-black/10'
                }`}
              >
                {/* Preview images */}
                <div className="aspect-[2/1] relative overflow-hidden">
                  {board.previews.length > 0 ? (
                    <div className="grid grid-cols-2 h-full">
                      {board.previews.slice(0, 4).map((preview, i) => (
                        <div key={i} className="relative overflow-hidden">
                          <Image
                            src={preview}
                            alt=""
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center ${darkMode ? 'bg-white/5' : 'bg-black/5'}`}>
                      <svg className={`w-12 h-12 ${darkMode ? 'text-white/20' : 'text-black/20'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-lg leading-tight">{board.title}</h3>
                    {board.topic && (
                      <span className={`flex-shrink-0 px-2 py-0.5 rounded text-xs font-medium ${
                        darkMode ? 'bg-white/10 text-white/60' : 'bg-black/10 text-black/60'
                      }`}>
                        {board.topic}
                      </span>
                    )}
                  </div>

                  {board.description && (
                    <p className={`text-sm mb-3 line-clamp-2 ${darkMode ? 'text-white/50' : 'text-black/50'}`}>
                      {board.description}
                    </p>
                  )}

                  <div className={`flex items-center gap-4 text-xs ${darkMode ? 'text-white/40' : 'text-black/40'}`}>
                    <span>{board.itemCount} items</span>
                    <span>{board.followerCount} followers</span>
                    {board.allowVoting && <span>Voting</span>}
                    {board.allowSubmissions && <span>Open</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
