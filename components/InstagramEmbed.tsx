'use client'

import { useEffect, useRef, useState } from 'react'

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
  const [processed, setProcessed] = useState(false)

  useEffect(() => {
    const processEmbed = () => {
      if (window.instgrm && !processed) {
        window.instgrm.Embeds.process()
        setProcessed(true)
      }
    }

    // Try immediately
    processEmbed()

    // Retry a few times in case script hasn't loaded
    const timers = [
      setTimeout(processEmbed, 500),
      setTimeout(processEmbed, 1000),
      setTimeout(processEmbed, 2000),
    ]

    return () => timers.forEach(clearTimeout)
  }, [url, processed])

  return (
    <div
      ref={containerRef}
      className={`instagram-embed-container w-full ${darkMode ? 'bg-white/[0.02]' : 'bg-neutral-100'}`}
    >
      <blockquote
        className="instagram-media"
        data-instgrm-permalink={url}
        data-instgrm-version="14"
        style={{
          background: '#000',
          border: 0,
          borderRadius: '3px',
          boxShadow: 'none',
          margin: '0 auto',
          maxWidth: '540px',
          minWidth: '326px',
          padding: 0,
          width: '100%',
        }}
      >
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '400px',
            color: 'rgba(255,255,255,0.4)',
            textDecoration: 'none',
            fontSize: '14px'
          }}
        >
          Loading Instagram...
        </a>
      </blockquote>
    </div>
  )
}
