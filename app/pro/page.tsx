'use client'

import { useUser } from '@clerk/nextjs'
import Link from 'next/link'
import { useState } from 'react'

export default function ProDashboard() {
  const { user, isLoaded } = useUser()
  const [boards] = useState<any[]>([]) // Will connect to database later

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white/30">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            craft<span className="text-white/40">or</span>crap
            <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-white/10 text-white/50">
              Pro
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-sm text-white/50 hover:text-white transition-colors"
            >
              ← Back to public
            </Link>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Welcome section */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold mb-2">
            Welcome, {user?.firstName || 'there'}
          </h1>
          <p className="text-white/50">
            Create private boards and get feedback from clients and collaborators.
          </p>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <div className="text-3xl font-semibold">{boards.length}</div>
            <div className="text-sm text-white/40">Active boards</div>
          </div>
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <div className="text-3xl font-semibold">0</div>
            <div className="text-sm text-white/40">Total votes</div>
          </div>
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <div className="text-3xl font-semibold text-amber-500">Free</div>
            <div className="text-sm text-white/40">Current plan</div>
          </div>
        </div>

        {/* Boards section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium">Your boards</h2>
            <button
              className="px-4 py-2 text-sm font-medium rounded-lg bg-white text-black hover:bg-white/90 transition-colors"
            >
              + New board
            </button>
          </div>

          {boards.length === 0 ? (
            <div className="text-center py-16 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/5 flex items-center justify-center">
                <svg className="w-8 h-8 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-lg font-medium mb-2">No boards yet</h3>
              <p className="text-white/40 text-sm mb-6 max-w-sm mx-auto">
                Create your first board to start collecting feedback on your creative work.
              </p>
              <button
                className="px-6 py-3 text-sm font-medium rounded-lg bg-white text-black hover:bg-white/90 transition-colors"
              >
                Create your first board
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {boards.map((board) => (
                <Link
                  key={board.id}
                  href={`/pro/boards/${board.id}`}
                  className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition-colors"
                >
                  <h3 className="font-medium mb-1">{board.title}</h3>
                  <p className="text-sm text-white/40">{board.itemCount} items</p>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Upgrade CTA */}
        <div className="p-6 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-medium mb-1">Upgrade to Pro</h3>
              <p className="text-white/50 text-sm mb-4">
                Get unlimited boards, team collaboration, and priority support.
              </p>
              <div className="flex items-center gap-4">
                <button className="px-4 py-2 text-sm font-medium rounded-lg bg-amber-500 text-black hover:bg-amber-400 transition-colors">
                  View plans
                </button>
                <span className="text-sm text-white/40">Starting at £15/mo</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
