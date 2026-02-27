'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface ProLinkProps {
  darkMode?: boolean
}

export default function ProLink({ darkMode = true }: ProLinkProps) {
  const [plan, setPlan] = useState<'free' | 'solo' | 'studio' | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/pro/user')
      .then(res => res.json())
      .then(data => {
        if (data.plan) setPlan(data.plan)
        else setPlan('free')
        setLoading(false)
      })
      .catch(() => {
        setPlan('free')
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <span className={`px-3 py-1.5 text-xs font-medium rounded-full ${darkMode ? 'text-white/30' : 'text-black/30'}`}>
        ...
      </span>
    )
  }

  // Pro users (solo or studio) see "Pro" link to dashboard
  if (plan === 'solo' || plan === 'studio') {
    return (
      <Link
        href="/pro"
        className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
          darkMode
            ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
            : 'bg-amber-500/20 text-amber-600 hover:bg-amber-500/30'
        }`}
      >
        Pro
      </Link>
    )
  }

  // Free users see "Go Pro" link to pricing page
  return (
    <Link
      href="/go-pro"
      className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
        darkMode
          ? 'bg-white/10 text-white/70 hover:bg-white/20'
          : 'bg-black/10 text-black/70 hover:bg-black/20'
      }`}
    >
      Go Pro
    </Link>
  )
}
