'use client'

import { useEffect, useRef } from 'react'

interface InstagramEmbedProps {
  url: string
  darkMode?: boolean
}

declare global {
  interface Window {
    instgrm?: {
      Embeds: {
        process: () => void
      }
    }
  }
}

export function isInstagramUrl(url: string): boolean {
  return url.includes('instagram.com/p/') ||
         url.includes('instagram.com/reel/') ||
         url.includes('instagram.com/tv/')
}

export default function InstagramEmbed({ url, darkMode = true }: InstagramEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Load Instagram embed script if not already loaded
    const loadScript = () => {
      if (window.instgrm) {
        window.instgrm.Embeds.process()
      } else {
        const existingScript = document.querySelector('script[src*="instagram.com/embed.js"]')
        if (!existingScript) {
          const script = document.createElement('script')
          script.src = '//www.instagram.com/embed.js'
          script.async = true
          script.onload = () => {
            if (window.instgrm) {
              window.instgrm.Embeds.process()
            }
          }
          document.body.appendChild(script)
        }
      }
    }

    // Small delay to ensure the blockquote is in the DOM
    const timer = setTimeout(loadScript, 100)
    return () => clearTimeout(timer)
  }, [url])

  return (
    <div
      ref={containerRef}
      className={`instagram-embed-container w-full flex justify-center ${darkMode ? 'bg-white/[0.02]' : 'bg-neutral-100'}`}
    >
      <blockquote
        className="instagram-media"
        data-instgrm-permalink={url}
        data-instgrm-version="14"
        data-instgrm-captioned
        style={{
          background: 'transparent',
          border: 0,
          borderRadius: '3px',
          boxShadow: 'none',
          margin: '0',
          maxWidth: '540px',
          minWidth: '326px',
          padding: 0,
          width: '100%',
        }}
      />
    </div>
  )
}
