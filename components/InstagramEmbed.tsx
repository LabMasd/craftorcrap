'use client'

import { useEffect, useState } from 'react'

interface InstagramEmbedProps {
  url: string
  darkMode?: boolean
}

interface OEmbedData {
  html: string
  thumbnail_url?: string
  author_name?: string
  title?: string
}

export function isInstagramUrl(url: string): boolean {
  return url.includes('instagram.com/p/') ||
         url.includes('instagram.com/reel/') ||
         url.includes('instagram.com/tv/')
}

export default function InstagramEmbed({ url, darkMode = true }: InstagramEmbedProps) {
  const [embedHtml, setEmbedHtml] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function fetchEmbed() {
      try {
        const response = await fetch(`/api/instagram?url=${encodeURIComponent(url)}`)
        if (response.ok) {
          const data: OEmbedData = await response.json()
          setEmbedHtml(data.html)
        } else {
          setError(true)
        }
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    fetchEmbed()
  }, [url])

  useEffect(() => {
    // Process Instagram embeds after HTML is inserted
    if (embedHtml && typeof window !== 'undefined') {
      const timer = setTimeout(() => {
        if ((window as any).instgrm) {
          (window as any).instgrm.Embeds.process()
        } else {
          const script = document.createElement('script')
          script.src = '//www.instagram.com/embed.js'
          script.async = true
          document.body.appendChild(script)
        }
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [embedHtml])

  if (loading) {
    return (
      <div className={`w-full aspect-square flex items-center justify-center ${darkMode ? 'bg-white/[0.02]' : 'bg-neutral-100'}`}>
        <div className="animate-pulse text-white/20">Loading...</div>
      </div>
    )
  }

  if (error || !embedHtml) {
    // Fallback to link
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={`block relative w-full aspect-square overflow-hidden group ${
          darkMode ? 'bg-white/[0.02]' : 'bg-neutral-100'
        }`}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 opacity-20" />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <svg className="w-12 h-12 text-white/60" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
          </svg>
          <span className="text-xs font-medium text-white/40">View on Instagram</span>
        </div>
      </a>
    )
  }

  return (
    <div
      className={`instagram-embed-container w-full flex justify-center overflow-hidden ${darkMode ? 'bg-white/[0.02]' : 'bg-neutral-100'}`}
      dangerouslySetInnerHTML={{ __html: embedHtml }}
    />
  )
}
