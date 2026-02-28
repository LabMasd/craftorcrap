'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Board {
  id: string
  name: string
  icon: string
  created_at: string
  item_count: number
}

interface MyBoardsProps {
  darkMode?: boolean
}

export default function MyBoards({ darkMode = true }: MyBoardsProps) {
  const [boards, setBoards] = useState<Board[]>([])
  const [unsortedCount, setUnsortedCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newBoardName, setNewBoardName] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    fetchBoards()
  }, [])

  async function fetchBoards() {
    try {
      const res = await fetch('/api/user/boards')
      if (res.ok) {
        const data = await res.json()
        setBoards(data.boards || [])
        setUnsortedCount(data.unsorted_count || 0)
      }
    } catch (error) {
      console.error('Error fetching boards:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate() {
    if (!newBoardName.trim()) return

    setCreating(true)
    try {
      const res = await fetch('/api/user/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newBoardName.trim() }),
      })

      if (res.ok) {
        const newBoard = await res.json()
        setBoards((prev) => [{ ...newBoard, item_count: 0 }, ...prev])
        setNewBoardName('')
        setShowCreate(false)
      }
    } catch (error) {
      console.error('Error creating board:', error)
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(boardId: string) {
    if (!confirm('Delete this board? Items will be moved to Unsorted.')) return

    try {
      const res = await fetch(`/api/user/boards/${boardId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setBoards((prev) => prev.filter((b) => b.id !== boardId))
        fetchBoards() // Refresh to get updated unsorted count
      }
    } catch (error) {
      console.error('Error deleting board:', error)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`rounded-xl p-4 animate-pulse ${darkMode ? 'bg-white/[0.03]' : 'bg-black/[0.03]'}`}
            >
              <div className={`w-10 h-10 rounded-lg mb-3 ${darkMode ? 'bg-white/10' : 'bg-black/10'}`} />
              <div className={`h-4 w-3/4 rounded mb-2 ${darkMode ? 'bg-white/10' : 'bg-black/10'}`} />
              <div className={`h-3 w-1/2 rounded ${darkMode ? 'bg-white/10' : 'bg-black/10'}`} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Create board */}
      {showCreate ? (
        <div className={`rounded-xl p-4 ${darkMode ? 'bg-white/[0.03]' : 'bg-black/[0.03]'}`}>
          <input
            type="text"
            value={newBoardName}
            onChange={(e) => setNewBoardName(e.target.value)}
            placeholder="Board name..."
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            className={`w-full bg-transparent border-none outline-none text-lg font-medium placeholder:opacity-40 ${
              darkMode ? 'text-white' : 'text-black'
            }`}
          />
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleCreate}
              disabled={creating || !newBoardName.trim()}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 ${
                darkMode ? 'bg-white text-black hover:bg-white/90' : 'bg-black text-white hover:bg-black/90'
              }`}
            >
              {creating ? 'Creating...' : 'Create'}
            </button>
            <button
              onClick={() => {
                setShowCreate(false)
                setNewBoardName('')
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                darkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-black/10 hover:bg-black/20'
              }`}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowCreate(true)}
          className={`w-full rounded-xl p-4 border-2 border-dashed transition-all flex items-center justify-center gap-2 ${
            darkMode
              ? 'border-white/10 hover:border-white/20 text-white/40 hover:text-white/60'
              : 'border-black/10 hover:border-black/20 text-black/40 hover:text-black/60'
          }`}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="font-medium">Create Board</span>
        </button>
      )}

      {/* Boards grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {/* Unsorted */}
        <Link
          href="/dashboard/unsorted"
          className={`group rounded-xl p-4 transition-all ${
            darkMode ? 'bg-white/[0.03] hover:bg-white/[0.05]' : 'bg-black/[0.03] hover:bg-black/[0.05]'
          }`}
        >
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
              darkMode ? 'bg-white/10' : 'bg-black/10'
            }`}
          >
            <svg className={`w-5 h-5 ${darkMode ? 'text-white/60' : 'text-black/60'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <h3 className={`font-medium truncate ${darkMode ? 'text-white/90 group-hover:text-white' : 'text-black/90 group-hover:text-black'}`}>
            Unsorted
          </h3>
          <p className={`text-sm ${darkMode ? 'text-white/40' : 'text-black/40'}`}>
            {unsortedCount} item{unsortedCount !== 1 ? 's' : ''}
          </p>
        </Link>

        {/* User boards */}
        {boards.map((board) => (
          <Link
            key={board.id}
            href={`/dashboard/boards/${board.id}`}
            className={`group rounded-xl p-4 transition-all relative block ${
              darkMode ? 'bg-white/[0.03] hover:bg-white/[0.05]' : 'bg-black/[0.03] hover:bg-black/[0.05]'
            }`}
          >
            {/* Delete button */}
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleDelete(board.id)
              }}
              className={`absolute top-2 right-2 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all z-10 ${
                darkMode ? 'hover:bg-white/10 text-white/40 hover:text-white/60' : 'hover:bg-black/10 text-black/40 hover:text-black/60'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                darkMode ? 'bg-white/10' : 'bg-black/10'
              }`}
            >
              <svg className={`w-5 h-5 ${darkMode ? 'text-white/60' : 'text-black/60'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <h3 className={`font-medium truncate ${darkMode ? 'text-white/90 group-hover:text-white' : 'text-black/90 group-hover:text-black'}`}>
              {board.name}
            </h3>
            <p className={`text-sm ${darkMode ? 'text-white/40' : 'text-black/40'}`}>
              {board.item_count} item{board.item_count !== 1 ? 's' : ''}
            </p>
          </Link>
        ))}
      </div>

      {boards.length === 0 && unsortedCount === 0 && (
        <div className={`text-center py-8 ${darkMode ? 'text-white/40' : 'text-black/40'}`}>
          <p>No saved items yet. Star items to save them here.</p>
        </div>
      )}
    </div>
  )
}
