'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import SubmitForm from '@/components/SubmitForm'

export default function SubmitPage() {
  const [darkMode, setDarkMode] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem('craftorcrap-theme')
    if (saved) setDarkMode(saved === 'dark')
  }, [])

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-black text-white' : 'bg-white text-black'}`}>
      <header className={`border-b ${darkMode ? 'border-white/10' : 'border-black/10'}`}>
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/" className="text-xl font-medium tracking-tight">
            craft<span className={darkMode ? 'text-white/40' : 'text-black/40'}>or</span>crap
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-16">
        <h1 className="text-2xl font-medium mb-10 text-center">Submit Work</h1>
        <SubmitForm darkMode={darkMode} />
      </main>
    </div>
  )
}
