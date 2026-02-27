'use client'

import { useUser, UserButton } from '@clerk/nextjs'
import Link from 'next/link'
import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'

interface BoardItem {
  id: string
  url: string
  title: string | null
  preview_image: string | null
  dominant_color: string | null
  description: string | null
  total_craft: number
  total_crap: number
  total_votes: number
  created_at: string
}

interface Board {
  id: string
  title: string
  description: string | null
  share_token: string
  visibility: 'private' | 'link' | 'public'
  allow_anonymous_votes: boolean
  created_at: string
  board_items: BoardItem[]
}

type Tab = 'all' | 'craft' | 'crap'
type CardSize = 'compact' | 'normal' | 'large'
type SortMode = 'newest' | 'random'

export default function BoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user, isLoaded } = useUser()
  const router = useRouter()

  const [board, setBoard] = useState<Board | null>(null)
  const [loading, setLoading] = useState(true)
  const [newItemUrl, setNewItemUrl] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [votedItems, setVotedItems] = useState<Record<string, 'craft' | 'crap'>>({})

  // View controls
  const [activeTab, setActiveTab] = useState<Tab>('all')
  const [cardSize, setCardSize] = useState<CardSize>('normal')
  const [sortMode, setSortMode] = useState<SortMode>('newest')
  const [darkMode, setDarkMode] = useState(true)
  const [isDragging, setIsDragging] = useState(false)

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
    if (isLoaded && user) {
      fetchBoard()
    }
  }, [isLoaded, user, id])

  async function fetchBoard() {
    setLoading(true)
    try {
      const res = await fetch(`/api/pro/boards/${id}`)
      if (res.ok) {
        const data = await res.json()
        setBoard(data)
      } else if (res.status === 404) {
        router.push('/pro')
      }
    } catch (err) {
      console.error('Failed to fetch board:', err)
    }
    setLoading(false)
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault()
    if (!newItemUrl.trim()) return

    setAdding(true)
    setError('')

    try {
      const res = await fetch(`/api/pro/boards/${id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: newItemUrl.trim() }),
      })

      if (res.ok) {
        const item = await res.json()
        setBoard(prev => prev ? {
          ...prev,
          board_items: [...prev.board_items, { ...item, total_craft: 0, total_crap: 0, total_votes: 0 }]
        } : null)
        setNewItemUrl('')
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to add item')
      }
    } catch (err) {
      setError('Failed to add item')
    }
    setAdding(false)
  }

  async function vote(itemId: string, verdict: 'craft' | 'crap') {
    const prevVote = votedItems[itemId]
    setVotedItems(prev => ({ ...prev, [itemId]: verdict }))

    setBoard(prev => {
      if (!prev) return null
      return {
        ...prev,
        board_items: prev.board_items.map(item => {
          if (item.id !== itemId) return item
          let newCraft = item.total_craft
          let newCrap = item.total_crap
          if (prevVote === 'craft') newCraft--
          else if (prevVote === 'crap') newCrap--
          if (verdict === 'craft') newCraft++
          else newCrap++
          return { ...item, total_craft: newCraft, total_crap: newCrap, total_votes: newCraft + newCrap }
        })
      }
    })

    try {
      const res = await fetch(`/api/pro/boards/${id}/items/${itemId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verdict }),
      })
      if (!res.ok) fetchBoard()
    } catch (err) {
      console.error('Failed to vote:', err)
      fetchBoard()
    }
  }

  async function deleteItem(itemId: string) {
    if (!confirm('Delete this item?')) return
    try {
      const res = await fetch(`/api/pro/boards/${id}/items/${itemId}`, { method: 'DELETE' })
      if (res.ok) {
        setBoard(prev => prev ? { ...prev, board_items: prev.board_items.filter(i => i.id !== itemId) } : null)
      }
    } catch (err) {
      console.error('Failed to delete item:', err)
    }
  }

  function copyShareLink() {
    const shareUrl = `${window.location.origin}/b/${board?.share_token}`
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Drag and drop handlers
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    // Only set to false if we're leaving the main container
    if (e.currentTarget === e.target) {
      setIsDragging(false)
    }
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    // Try to get URL from various data types
    let url = ''

    // Check for image being dragged
    const html = e.dataTransfer.getData('text/html')
    if (html) {
      const match = html.match(/src=["']([^"']+)["']/)
      if (match) url = match[1]
    }

    // Check for direct URL
    if (!url) {
      url = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain') || ''
    }

    // Check for files (images)
    if (!url && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0]
      if (file.type.startsWith('image/')) {
        // For now, we can't upload files directly - show message
        setError('File upload not supported yet. Drag image URLs from websites instead.')
        return
      }
    }

    if (!url) {
      setError('Could not detect URL. Try dragging the image directly.')
      return
    }

    // Clean up the URL
    url = url.trim()
    if (!url.startsWith('http')) {
      setError('Invalid URL')
      return
    }

    // Add the item
    setAdding(true)
    setError('')

    try {
      const res = await fetch(`/api/pro/boards/${id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })

      if (res.ok) {
        const item = await res.json()
        setBoard(prev => prev ? {
          ...prev,
          board_items: [...prev.board_items, { ...item, total_craft: 0, total_crap: 0, total_votes: 0 }]
        } : null)
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to add item')
      }
    } catch (err) {
      setError('Failed to add item')
    }
    setAdding(false)
  }

  // Filter and sort items
  let displayItems = board?.board_items || []

  if (activeTab === 'craft') {
    displayItems = displayItems.filter(item => {
      const total = item.total_craft + item.total_crap
      return total > 0 && (item.total_craft / total) > 0.5
    })
  } else if (activeTab === 'crap') {
    displayItems = displayItems.filter(item => {
      const total = item.total_craft + item.total_crap
      return total > 0 && (item.total_craft / total) <= 0.5
    })
  }

  if (sortMode === 'random') {
    displayItems = [...displayItems].sort(() => Math.random() - 0.5)
  } else {
    displayItems = [...displayItems].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }

  const gridCols = {
    compact: 'columns-2 sm:columns-3 md:columns-4 lg:columns-5 xl:columns-6 2xl:columns-7',
    normal: 'columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5',
    large: 'columns-1 sm:columns-2 lg:columns-3 xl:columns-4',
  }

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white/30">Loading...</div>
      </div>
    )
  }

  if (!board) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white/30">Board not found</div>
      </div>
    )
  }

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-black text-white' : 'bg-neutral-50 text-black'}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drop zone overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="w-24 h-24 mx-auto mb-4 rounded-3xl border-4 border-dashed border-white/40 flex items-center justify-center">
              <svg className="w-12 h-12 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-2xl font-semibold text-white mb-2">Drop image here</p>
            <p className="text-white/50">Drag images from any website</p>
          </div>
        </div>
      )}
      {/* Fixed Header */}
      <header className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-xl ${darkMode ? 'bg-black/80 border-b border-white/10' : 'bg-white/80 border-b border-black/5'}`}>
        <div className="px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link href="/pro" className="text-lg font-semibold tracking-tight">
            craft<span className={darkMode ? 'text-white/40' : 'text-black/40'}>or</span>crap
            <span className={`ml-2 text-[10px] font-medium px-1.5 py-0.5 rounded ${darkMode ? 'bg-white/10 text-white/50' : 'bg-black/10 text-black/50'}`}>Pro</span>
          </Link>

          {/* Center: Tabs */}
          <div className={`hidden sm:flex absolute left-1/2 -translate-x-1/2 p-1 rounded-full ${darkMode ? 'bg-white/5' : 'bg-black/5'}`}>
            <div className="relative flex">
              <div
                className={`absolute top-0 bottom-0 rounded-full will-change-transform ${darkMode ? 'bg-white' : 'bg-black'}`}
                style={{
                  width: '64px',
                  transform: `translateX(${(['all', 'craft', 'crap'] as Tab[]).indexOf(activeTab) * 64}px)`,
                  transition: 'transform 500ms cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              />
              {(['all', 'craft', 'crap'] as Tab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`relative z-10 w-16 py-2 text-xs font-medium rounded-full transition-colors duration-300 text-center ${
                    activeTab === tab
                      ? darkMode ? 'text-black' : 'text-white'
                      : darkMode ? 'text-white/50 hover:text-white/70' : 'text-black/50 hover:text-black/70'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Theme toggle */}
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

            {/* Card size toggle */}
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

            <UserButton afterSignOutUrl="/" />
          </div>
        </div>

        {/* Mobile: Tabs */}
        <div className="sm:hidden flex justify-start px-4 pb-3">
          <div className={`p-1 rounded-full ${darkMode ? 'bg-white/5' : 'bg-black/5'}`}>
            <div className="relative flex">
              <div
                className={`absolute top-0 bottom-0 rounded-full will-change-transform ${darkMode ? 'bg-white' : 'bg-black'}`}
                style={{
                  width: '64px',
                  transform: `translateX(${(['all', 'craft', 'crap'] as Tab[]).indexOf(activeTab) * 64}px)`,
                  transition: 'transform 500ms cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              />
              {(['all', 'craft', 'crap'] as Tab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`relative z-10 w-16 py-2 text-xs font-medium rounded-full transition-colors duration-300 text-center ${
                    activeTab === tab
                      ? darkMode ? 'text-black' : 'text-white'
                      : darkMode ? 'text-white/50 hover:text-white/70' : 'text-black/50 hover:text-black/70'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-28 sm:pt-20 px-3 sm:px-4 pb-20">
        {/* Board title bar */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/pro" className={`text-sm ${darkMode ? 'text-white/40 hover:text-white' : 'text-black/40 hover:text-black'}`}>←</Link>
            <div>
              <h1 className="font-semibold">{board.title}</h1>
              {board.description && <p className={`text-xs ${darkMode ? 'text-white/40' : 'text-black/40'}`}>{board.description}</p>}
            </div>
          </div>
          <button
            onClick={copyShareLink}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors flex items-center gap-1.5 ${darkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-black/10 hover:bg-black/20'}`}
          >
            {copied ? (
              <><svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Copied!</>
            ) : (
              <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>Share</>
            )}
          </button>
        </div>

        {/* Inline Add Item */}
        <div className={`mb-6 p-4 rounded-2xl ${darkMode ? 'bg-white/[0.03] border border-white/[0.06]' : 'bg-black/[0.02] border border-black/[0.06]'}`}>
          <form onSubmit={addItem} className="flex gap-2">
            <input
              type="url"
              value={newItemUrl}
              onChange={(e) => setNewItemUrl(e.target.value)}
              placeholder="Paste a URL..."
              className={`flex-1 border-0 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 ${
                darkMode
                  ? 'bg-white/5 text-white placeholder-white/30 focus:ring-white/20'
                  : 'bg-black/5 text-black placeholder-black/30 focus:ring-black/20'
              }`}
            />
            <button
              type="submit"
              disabled={!newItemUrl.trim() || adding}
              className={`px-5 py-3 rounded-xl text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed transition-all ${
                darkMode
                  ? 'bg-white/10 text-white/70 hover:bg-white/15'
                  : 'bg-black/10 text-black/70 hover:bg-black/15'
              }`}
            >
              {adding ? '...' : 'Add'}
            </button>
          </form>
          {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
        </div>

        {/* Sort toggle */}
        <div className="mb-6 flex justify-end">
          <div className={`p-1 rounded-full ${darkMode ? 'bg-white/5' : 'bg-black/5'}`}>
            <div className="relative flex">
              <div
                className={`absolute top-0 bottom-0 rounded-full will-change-transform ${darkMode ? 'bg-white' : 'bg-black'}`}
                style={{
                  width: '56px',
                  transform: `translateX(${sortMode === 'newest' ? 0 : 56}px)`,
                  transition: 'transform 500ms cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              />
              <button
                onClick={() => setSortMode('newest')}
                className={`relative z-10 w-14 py-1.5 text-[11px] font-medium rounded-full transition-colors duration-300 text-center ${
                  sortMode === 'newest'
                    ? darkMode ? 'text-black' : 'text-white'
                    : darkMode ? 'text-white/50 hover:text-white/70' : 'text-black/50 hover:text-black/70'
                }`}
              >
                Newest
              </button>
              <button
                onClick={() => setSortMode('random')}
                className={`relative z-10 w-14 py-1.5 text-[11px] font-medium rounded-full transition-colors duration-300 text-center ${
                  sortMode === 'random'
                    ? darkMode ? 'text-black' : 'text-white'
                    : darkMode ? 'text-white/50 hover:text-white/70' : 'text-black/50 hover:text-black/70'
                }`}
              >
                Random
              </button>
            </div>
          </div>
        </div>

        {/* Items Grid */}
        {displayItems.length === 0 ? (
          <div className={`text-center py-32 ${darkMode ? 'text-white/30' : 'text-black/30'}`}>
            {board.board_items.length === 0 ? (
              <div>
                <div className={`w-20 h-20 mx-auto mb-4 rounded-2xl border-2 border-dashed flex items-center justify-center ${darkMode ? 'border-white/20' : 'border-black/20'}`}>
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="font-medium mb-1">Drag & drop images here</p>
                <p className="text-sm opacity-60">Or paste a URL above</p>
              </div>
            ) : 'No items match this filter.'}
          </div>
        ) : (
          <div className={`${gridCols[cardSize]} gap-3`}>
            {displayItems.map((item) => {
              const totalVotes = item.total_craft + item.total_crap
              const craftPercent = totalVotes > 0 ? Math.round((item.total_craft / totalVotes) * 100) : 50
              const userVote = votedItems[item.id]
              const isCompact = cardSize === 'compact'

              let domain = ''
              try { domain = new URL(item.url).hostname.replace('www.', '') } catch { domain = item.url }

              return (
                <div key={item.id} className="break-inside-avoid mb-3">
                  <div className={`group rounded-xl overflow-hidden transition-all ${
                    darkMode ? 'bg-white/[0.03] hover:bg-white/[0.05]' : 'bg-white hover:shadow-lg'
                  }`}>
                    {/* Image */}
                    <div className="relative">
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="block">
                        <div className={`relative overflow-hidden ${darkMode ? 'bg-white/[0.02]' : 'bg-neutral-100'}`}>
                          {item.preview_image ? (
                            <img
                              src={item.preview_image}
                              alt={item.title || 'Item thumbnail'}
                              className="w-full h-auto object-cover group-hover:scale-[1.02] transition-transform duration-500"
                              loading="lazy"
                            />
                          ) : (
                            <div
                              className={`w-full aspect-video flex items-center justify-center text-sm ${darkMode ? 'text-white/20' : 'text-black/20'}`}
                              style={item.dominant_color ? { backgroundColor: item.dominant_color } : undefined}
                            >
                              No preview
                            </div>
                          )}
                        </div>
                      </a>

                      {/* Delete button on hover */}
                      <button
                        onClick={() => deleteItem(item.id)}
                        className={`absolute top-2 right-2 p-1.5 rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all ${
                          darkMode ? 'bg-black/50 text-white/60' : 'bg-white/50 text-black/60'
                        }`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    {/* Content */}
                    <div className={isCompact ? 'p-2.5' : 'p-4'}>
                      <div className={isCompact ? 'mb-2' : 'mb-3'}>
                        <h3 className={`font-medium leading-snug ${isCompact ? 'line-clamp-1 text-[11px]' : 'line-clamp-2 text-sm'} ${
                          darkMode ? 'text-white/90' : 'text-black/90'
                        }`}>
                          {item.title || domain}
                        </h3>
                        {!isCompact && <p className={`text-[11px] mt-0.5 ${darkMode ? 'text-white/30' : 'text-black/40'}`}>{domain}</p>}
                      </div>

                      {/* Vote buttons */}
                      <div className={`flex gap-1 ${isCompact ? 'mb-1.5' : 'mb-3'}`}>
                        <button
                          onClick={() => vote(item.id, 'craft')}
                          disabled={!!userVote}
                          className={`flex-1 font-semibold tracking-wide rounded-md transition-all duration-200 ${
                            isCompact ? 'py-1 text-[9px]' : 'py-2 text-[11px]'
                          } ${
                            userVote === 'craft'
                              ? darkMode ? 'bg-white text-black' : 'bg-black text-white'
                              : userVote
                              ? darkMode ? 'bg-white/5 text-white/20 cursor-not-allowed' : 'bg-black/5 text-black/20 cursor-not-allowed'
                              : darkMode ? 'bg-white/5 text-white/60 hover:bg-white hover:text-black' : 'bg-black/5 text-black/60 hover:bg-black hover:text-white'
                          }`}
                        >
                          CRAFT
                        </button>
                        <button
                          onClick={() => vote(item.id, 'crap')}
                          disabled={!!userVote}
                          className={`flex-1 font-semibold tracking-wide rounded-md transition-all duration-200 ${
                            isCompact ? 'py-1 text-[9px]' : 'py-2 text-[11px]'
                          } ${
                            userVote === 'crap'
                              ? darkMode ? 'bg-white text-black' : 'bg-black text-white'
                              : userVote
                              ? darkMode ? 'bg-white/5 text-white/20 cursor-not-allowed' : 'bg-black/5 text-black/20 cursor-not-allowed'
                              : darkMode ? 'bg-white/5 text-white/60 hover:bg-white hover:text-black' : 'bg-black/5 text-black/60 hover:bg-black hover:text-white'
                          }`}
                        >
                          CRAP
                        </button>
                      </div>

                      {/* Progress bar */}
                      <div className="flex items-center gap-2">
                        <div className={`flex-1 h-1 rounded-full overflow-hidden ${darkMode ? 'bg-white/10' : 'bg-black/10'}`}>
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              craftPercent >= 70 ? 'bg-emerald-500' : craftPercent <= 30 ? 'bg-red-500' : darkMode ? 'bg-white/50' : 'bg-black/50'
                            }`}
                            style={{ width: `${craftPercent}%` }}
                          />
                        </div>
                        <span className={`font-semibold tabular-nums ${isCompact ? 'text-[8px]' : 'text-[10px]'} ${
                          craftPercent >= 70 ? 'text-emerald-500' : craftPercent <= 30 ? 'text-red-500' : darkMode ? 'text-white/40' : 'text-black/40'
                        }`}>
                          {craftPercent}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className={`fixed bottom-0 left-0 right-0 py-3 text-center text-[11px] backdrop-blur-sm ${darkMode ? 'bg-black/60 text-white/30' : 'bg-white/60 text-black/30'}`}>
        <span>Private board</span>
        <span className="mx-2">·</span>
        <span>{board.board_items.length} items</span>
      </footer>
    </div>
  )
}
