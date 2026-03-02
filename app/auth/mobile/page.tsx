'use client'

import { useEffect, useState } from 'react'
import { useUser, SignInButton } from '@clerk/nextjs'

export default function MobileAuthPage() {
  const { user, isLoaded, isSignedIn } = useUser()
  const [token, setToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return

    // Fetch or create token for the user
    async function getToken() {
      try {
        const res = await fetch('/api/extension/token')
        if (res.ok) {
          const data = await res.json()
          setToken(data.token)

          // Redirect to app with token
          const redirectUrl = `craftorcrap://auth?token=${data.token}`
          window.location.href = redirectUrl
        } else {
          setError('Failed to get token')
        }
      } catch (e) {
        setError('Connection error')
      }
    }

    getToken()
  }, [isLoaded, isSignedIn])

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-white/20 border-t-white rounded-full" />
      </div>
    )
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8">
        <h1 className="text-2xl font-bold text-white mb-2">
          craft<span className="text-white/40">or</span>crap
        </h1>
        <p className="text-white/50 mb-8 text-center">
          Sign in to connect your account to the iOS app
        </p>
        <SignInButton mode="modal">
          <button className="w-full max-w-xs py-3 px-6 bg-white text-black font-semibold rounded-xl">
            Sign In
          </button>
        </SignInButton>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8">
        <p className="text-red-400 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="text-white/60 underline"
        >
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8">
      <div className="animate-spin w-8 h-8 border-2 border-white/20 border-t-white rounded-full mb-4" />
      <p className="text-white/50">Connecting to app...</p>
      {token && (
        <div className="mt-8 text-center">
          <p className="text-white/30 text-sm mb-2">If the app doesn&apos;t open, copy this token:</p>
          <code className="text-xs text-white/60 bg-white/10 px-3 py-2 rounded block break-all">
            {token}
          </code>
        </div>
      )}
    </div>
  )
}
