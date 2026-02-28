'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'

export default function ExtensionConnectPage() {
  const { isLoaded, isSignedIn, user } = useUser()
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      fetchToken()
    } else if (isLoaded && !isSignedIn) {
      setLoading(false)
    }
  }, [isLoaded, isSignedIn])

  async function fetchToken() {
    try {
      const res = await fetch('/api/extension/token')
      const data = await res.json()
      if (data.token) {
        setToken(data.token)
      } else {
        setError('Failed to get token')
      }
    } catch {
      setError('Failed to connect')
    } finally {
      setLoading(false)
    }
  }

  async function regenerateToken() {
    setLoading(true)
    try {
      const res = await fetch('/api/extension/token', { method: 'POST' })
      const data = await res.json()
      if (data.token) {
        setToken(data.token)
        setCopied(false)
        setConnected(false)
      }
    } catch {
      setError('Failed to regenerate')
    } finally {
      setLoading(false)
    }
  }

  function copyToken() {
    if (token) {
      navigator.clipboard.writeText(token)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  function connectExtension() {
    if (!token) return

    // Try to send to extension via postMessage
    // The extension's content script will listen for this
    window.postMessage({
      type: 'CRAFTORCRAP_CONNECT',
      token,
      user: {
        id: user?.id,
        name: user?.firstName || user?.username || 'User',
        imageUrl: user?.imageUrl,
      }
    }, '*')

    setConnected(true)
    setTimeout(() => setConnected(false), 3000)
  }

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-white/50">Loading...</div>
      </div>
    )
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white/5 rounded-2xl p-8 text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Connect Extension</h1>
          <p className="text-white/60 mb-6">Sign in to connect your craftorcrap extension</p>
          <a
            href="/sign-in?redirect_url=/extension/connect"
            className="inline-block bg-white text-black px-6 py-3 rounded-full font-semibold hover:opacity-90 transition"
          >
            Sign In
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white/5 rounded-2xl p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Connect Extension</h1>
          <p className="text-white/60">Link your craftorcrap account to the browser extension</p>
        </div>

        {error && (
          <div className="bg-red-500/10 text-red-400 px-4 py-3 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">
              Your Extension Token
            </label>
            <div className="bg-black/50 rounded-lg p-4 font-mono text-sm text-white/80 break-all">
              {token ? `${token.slice(0, 20)}...${token.slice(-8)}` : '---'}
            </div>
          </div>

          <button
            onClick={connectExtension}
            disabled={!token}
            className="w-full bg-white text-black py-3 rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50"
          >
            {connected ? '✓ Sent to Extension!' : 'Connect Extension'}
          </button>

          <div className="flex gap-3">
            <button
              onClick={copyToken}
              disabled={!token}
              className="flex-1 bg-white/10 text-white py-3 rounded-xl font-medium hover:bg-white/15 transition disabled:opacity-50"
            >
              {copied ? '✓ Copied!' : 'Copy Token'}
            </button>
            <button
              onClick={regenerateToken}
              className="flex-1 bg-white/10 text-white py-3 rounded-xl font-medium hover:bg-white/15 transition"
            >
              Regenerate
            </button>
          </div>
        </div>

        <div className="mt-8 p-4 bg-white/5 rounded-xl">
          <h3 className="text-sm font-medium text-white mb-2">Manual Setup</h3>
          <ol className="text-sm text-white/50 space-y-1">
            <li>1. Click "Copy Token" above</li>
            <li>2. Open the extension sidepanel</li>
            <li>3. Click "Connect Account"</li>
            <li>4. Paste your token</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
