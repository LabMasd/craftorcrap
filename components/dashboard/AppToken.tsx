'use client'

import { useState, useEffect } from 'react'

interface AppTokenProps {
  darkMode: boolean
}

export default function AppToken({ darkMode }: AppTokenProps) {
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showToken, setShowToken] = useState(false)

  const fetchToken = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/extension/token')
      if (res.ok) {
        const data = await res.json()
        setToken(data.token)
      }
    } catch (error) {
      console.error('Failed to fetch token:', error)
    }
    setLoading(false)
  }

  const copyToken = async () => {
    if (!token) return
    await navigator.clipboard.writeText(token)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const regenerateToken = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/extension/token', { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setToken(data.token)
      }
    } catch (error) {
      console.error('Failed to regenerate token:', error)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchToken()
  }, [])

  return (
    <div className={`rounded-xl p-4 ${darkMode ? 'bg-white/5' : 'bg-black/5'}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${darkMode ? 'bg-white/10' : 'bg-black/10'}`}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <h3 className="font-semibold">iOS App Token</h3>
          <p className={`text-xs ${darkMode ? 'text-white/50' : 'text-black/50'}`}>
            Use this token to connect the mobile app
          </p>
        </div>
      </div>

      {loading ? (
        <div className={`h-10 rounded-lg animate-pulse ${darkMode ? 'bg-white/10' : 'bg-black/10'}`} />
      ) : token ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div
              className={`flex-1 font-mono text-sm px-3 py-2 rounded-lg overflow-hidden ${darkMode ? 'bg-black/50' : 'bg-white'}`}
            >
              {showToken ? token : '•'.repeat(Math.min(token.length, 40))}
            </div>
            <button
              onClick={() => setShowToken(!showToken)}
              className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
              title={showToken ? 'Hide token' : 'Show token'}
            >
              {showToken ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
            <button
              onClick={copyToken}
              className={`p-2 rounded-lg transition-colors ${copied ? 'bg-green-500/20 text-green-400' : darkMode ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
              title="Copy token"
            >
              {copied ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
          </div>
          <button
            onClick={regenerateToken}
            className={`text-xs ${darkMode ? 'text-white/40 hover:text-white/60' : 'text-black/40 hover:text-black/60'}`}
          >
            Regenerate token
          </button>
        </div>
      ) : (
        <button
          onClick={fetchToken}
          className={`w-full py-2 rounded-lg font-medium ${darkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-black/10 hover:bg-black/20'}`}
        >
          Get Token
        </button>
      )}
    </div>
  )
}
