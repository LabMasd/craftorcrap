'use client'

interface YouTubeEmbedProps {
  url: string
  darkMode?: boolean
}

export function isYouTubeUrl(url: string): boolean {
  return url.includes('youtube.com/watch') ||
         url.includes('youtu.be/') ||
         url.includes('youtube.com/shorts/')
}

export function getYouTubeId(url: string): string | null {
  // Handle youtube.com/watch?v=ID
  const watchMatch = url.match(/[?&]v=([^&]+)/)
  if (watchMatch) return watchMatch[1]

  // Handle youtu.be/ID
  const shortMatch = url.match(/youtu\.be\/([^?&]+)/)
  if (shortMatch) return shortMatch[1]

  // Handle youtube.com/shorts/ID
  const shortsMatch = url.match(/youtube\.com\/shorts\/([^?&]+)/)
  if (shortsMatch) return shortsMatch[1]

  return null
}

export default function YouTubeEmbed({ url, darkMode = true }: YouTubeEmbedProps) {
  const videoId = getYouTubeId(url)

  if (!videoId) {
    return null
  }

  const isShort = url.includes('/shorts/')

  return (
    <div
      className={`youtube-embed-container w-full ${darkMode ? 'bg-white/[0.02]' : 'bg-neutral-100'}`}
    >
      <div className={`relative w-full ${isShort ? 'aspect-[9/16] max-w-[320px] mx-auto' : 'aspect-video'}`}>
        <iframe
          src={`https://www.youtube.com/embed/${videoId}`}
          title="YouTube video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute top-0 left-0 w-full h-full"
          style={{ border: 0 }}
        />
      </div>
    </div>
  )
}
