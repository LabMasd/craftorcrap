'use client'

import { useState, useEffect, useRef } from 'react'
import { getActiveBoard, setActiveBoard } from './BoardPicker'

interface Board {
  id: string
  name: string
  item_count: number
}

interface ActiveBoardButtonProps {
  darkMode?: boolean
}

export default function ActiveBoardButton({ darkMode = true }: ActiveBoardButtonProps) {
  const [boards, setBoards] = useState<Board[]>([])
  const [activeBoard, setActiveBoardState] = useState<string | null>(null)
  const [activeBoardName, setActiveBoardName] = useState<string | null>(null)
  const [showPicker, setShowPicker] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newBoardName, setNewBoardName] = useState('')
  const [creating, setCreating] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setActiveBoardState(getActiveBoard())
    fetchBoards()

    const handleActiveBoardChange = (e: CustomEvent<string | null>) => {
      setActiveBoardState(e.detail)
    }
    window.addEventListener('active-board-change', handleActiveBoardChange as EventListener)
    return () => window.removeEventListener('active-board-change', handleActiveBoardChange as EventListener)
  }, [])

  useEffect(() => {
    if (activeBoard && boards.length > 0) {
      const board = boards.find(b => b.id === activeBoard)
      setActiveBoardName(board?.name || null)
    } else {
      setActiveBoardName(null)
    }
  }, [activeBoard, boards])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowPicker(false)
        setShowCreate(false)
      }
    }

    if (showPicker) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showPicker])

  async function fetchBoards() {
    try {
      const res = await fetch('/api/user/boards')
      if (res.ok) {
        const data = await res.json()
        setBoards(data.boards || [])
      }
    } catch (error) {
      console.error('Error fetching boards:', error)
    } finally {
      setLoading(false)
    }
  }

  function handleSelectBoard(boardId: string | null) {
    setActiveBoard(boardId)
    setActiveBoardState(boardId)
    setShowPicker(false)
  }

  async function handleCreateBoard() {
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
        setBoards(prev => [{ ...newBoard, item_count: 0 }, ...prev])
        handleSelectBoard(newBoard.id)
        setNewBoardName('')
        setShowCreate(false)
      }
    } catch (error) {
      console.error('Error creating board:', error)
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className={`px-3 py-1.5 text-[11px] font-medium rounded-full ${darkMode ? 'bg-white/5 text-white/30' : 'bg-black/5 text-black/30'}`}>
        ...
      </div>
    )
  }

  return (
    <div className="relative" ref={pickerRef}>
      <button
        onClick={() => setShowPicker(!showPicker)}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-full transition-all ${
          activeBoard
            ? 'bg-amber-500 text-white'
            : darkMode ? 'bg-white/5 text-white/50 hover:text-white/70' : 'bg-black/5 text-black/50 hover:text-black/70'
        }`}
      >
        <svg className="w-3 h-3" fill={activeBoard ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
        {activeBoardName || 'Unsorted'}
      </button>

      {showPicker && (
        <div className={`absolute top-full left-0 mt-2 w-56 rounded-xl shadow-2xl border overflow-hidden z-50 ${
          darkMode ? 'bg-neutral-900 border-white/10' : 'bg-white border-black/10'
        }`}>
          {/* Boards - click active board again to deselect */}
          {boards.length === 0 && (
            <div className={`px-4 py-3 text-center ${darkMode ? 'text-white/40' : 'text-black/40'}`}>
              <p className="text-xs">No boards yet</p>
              <p className="text-[10px] mt-0.5">Create one to organize saves</p>
            </div>
          )}
          {boards.map((board) => (
            <button
              key={board.id}
              onClick={() => handleSelectBoard(activeBoard === board.id ? null : board.id)}
              className={`w-full px-4 py-3 flex items-center gap-3 text-left transition-all ${
                darkMode ? 'hover:bg-white/5' : 'hover:bg-black/5'
              } ${activeBoard === board.id ? (darkMode ? 'bg-white/5' : 'bg-black/5') : ''}`}
            >
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                activeBoard === board.id ? 'bg-amber-500 text-white' : darkMode ? 'bg-white/10' : 'bg-black/10'
              }`}>
                <svg className={`w-3.5 h-3.5 ${activeBoard === board.id ? '' : darkMode ? 'text-white/60' : 'text-black/60'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{board.name}</p>
                <p className={`text-xs ${darkMode ? 'text-white/40' : 'text-black/40'}`}>
                  {board.item_count} item{board.item_count !== 1 ? 's' : ''}
                </p>
              </div>
              {activeBoard === board.id && (
                <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                </svg>
              )}
            </button>
          ))}

          {/* Create new board */}
          <div className={`${boards.length > 0 ? 'border-t' : ''} ${darkMode ? 'border-white/10' : 'border-black/10'}`}>
            {showCreate ? (
              <div className="p-3">
                <input
                  type="text"
                  value={newBoardName}
                  onChange={(e) => setNewBoardName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateBoard()
                    if (e.key === 'Escape') {
                      setShowCreate(false)
                      setNewBoardName('')
                    }
                  }}
                  placeholder="Board name..."
                  autoFocus
                  className={`w-full px-3 py-2 rounded-lg text-sm outline-none ${
                    darkMode ? 'bg-white/5 focus:bg-white/10 placeholder:text-white/30' : 'bg-black/5 focus:bg-black/10 placeholder:text-black/30'
                  }`}
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={handleCreateBoard}
                    disabled={creating || !newBoardName.trim()}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all disabled:opacity-50 ${
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
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
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
                className={`w-full px-4 py-3 flex items-center gap-3 text-left transition-all ${
                  darkMode ? 'hover:bg-white/5' : 'hover:bg-black/5'
                }`}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${darkMode ? 'bg-white/10' : 'bg-black/10'}`}>
                  <svg className={`w-3.5 h-3.5 ${darkMode ? 'text-white/60' : 'text-black/60'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <p className="text-sm font-medium">Create board</p>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
