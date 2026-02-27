'use client'

import { useState, useEffect, useRef } from 'react'

interface Board {
  id: string
  name: string
  item_count: number
}

interface BoardPickerProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (boardId: string | null) => void
  darkMode?: boolean
  position?: { top: number; left: number }
  activeBoard?: string | null
  onSetActiveBoard?: (boardId: string | null) => void
}

// Helper to get/set active board from localStorage
export function getActiveBoard(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('craftorcrap-active-board')
}

export function setActiveBoard(boardId: string | null) {
  if (typeof window === 'undefined') return
  if (boardId) {
    localStorage.setItem('craftorcrap-active-board', boardId)
  } else {
    localStorage.removeItem('craftorcrap-active-board')
  }
  // Dispatch event for other components
  window.dispatchEvent(new CustomEvent('active-board-change', { detail: boardId }))
}

export default function BoardPicker({ isOpen, onClose, onSelect, darkMode = true, position, activeBoard, onSetActiveBoard }: BoardPickerProps) {
  const [boards, setBoards] = useState<Board[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newBoardName, setNewBoardName] = useState('')
  const [creating, setCreating] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      fetchBoards()
    }
  }, [isOpen])

  useEffect(() => {
    if (showCreate && inputRef.current) {
      inputRef.current.focus()
    }
  }, [showCreate])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

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
        // Select the newly created board
        onSelect(newBoard.id)
        setNewBoardName('')
        setShowCreate(false)
      }
    } catch (error) {
      console.error('Error creating board:', error)
    } finally {
      setCreating(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      ref={pickerRef}
      className={`absolute z-50 w-64 rounded-xl shadow-2xl border overflow-hidden ${
        darkMode ? 'bg-neutral-900 border-white/10' : 'bg-white border-black/10'
      }`}
      style={position ? { top: position.top, left: position.left } : { top: '100%', right: 0 }}
    >
      {/* Header */}
      <div className={`px-4 py-3 border-b ${darkMode ? 'border-white/10' : 'border-black/10'}`}>
        <h3 className="font-semibold text-sm">Save to board</h3>
      </div>

      {/* Board list */}
      <div className="max-h-64 overflow-y-auto">
        {loading ? (
          <div className="px-4 py-8 text-center">
            <div className={`animate-spin w-5 h-5 border-2 rounded-full mx-auto ${darkMode ? 'border-white/20 border-t-white' : 'border-black/20 border-t-black'}`} />
          </div>
        ) : (
          <>
            {/* Empty state */}
            {boards.length === 0 && (
              <div className={`px-4 py-4 text-center ${darkMode ? 'text-white/40' : 'text-black/40'}`}>
                <p className="text-xs">No boards yet</p>
                <p className="text-[10px] mt-0.5">Create one below or save to Unsorted</p>
              </div>
            )}

            {/* Boards */}
            {boards.map((board) => (
              <div
                key={board.id}
                className={`w-full px-4 py-3 flex items-center gap-3 transition-all ${
                  darkMode ? 'hover:bg-white/5' : 'hover:bg-black/5'
                } ${activeBoard === board.id ? (darkMode ? 'bg-white/5' : 'bg-black/5') : ''}`}
              >
                <button
                  onClick={() => onSelect(board.id)}
                  className="flex items-center gap-3 flex-1 min-w-0 text-left"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    activeBoard === board.id
                      ? 'bg-amber-500 text-white'
                      : darkMode ? 'bg-white/10' : 'bg-black/10'
                  }`}>
                    <svg className={`w-4 h-4 ${activeBoard === board.id ? '' : darkMode ? 'text-white/60' : 'text-black/60'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{board.name}</p>
                    <p className={`text-xs ${darkMode ? 'text-white/40' : 'text-black/40'}`}>
                      {board.item_count} item{board.item_count !== 1 ? 's' : ''}
                    </p>
                  </div>
                </button>
                {/* Set as active button */}
                {onSetActiveBoard && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onSetActiveBoard(activeBoard === board.id ? null : board.id)
                    }}
                    className={`p-1.5 rounded-full transition-all ${
                      activeBoard === board.id
                        ? 'bg-amber-500 text-white'
                        : darkMode ? 'text-white/30 hover:text-white/60 hover:bg-white/10' : 'text-black/30 hover:text-black/60 hover:bg-black/10'
                    }`}
                    title={activeBoard === board.id ? 'Remove as default' : 'Set as default board'}
                  >
                    <svg className="w-4 h-4" fill={activeBoard === board.id ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </>
        )}
      </div>

      {/* Create new board */}
      <div className={`border-t ${darkMode ? 'border-white/10' : 'border-black/10'}`}>
        {showCreate ? (
          <div className="p-3">
            <input
              ref={inputRef}
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
                {creating ? 'Creating...' : 'Create & Save'}
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
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${darkMode ? 'bg-white/10' : 'bg-black/10'}`}>
              <svg className={`w-4 h-4 ${darkMode ? 'text-white/60' : 'text-black/60'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <p className="text-sm font-medium">Create new board</p>
          </button>
        )}
      </div>
    </div>
  )
}
