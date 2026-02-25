import { Vibrant } from 'node-vibrant/node'

interface MicrolinkResponse {
  status: string
  data: {
    title?: string
    description?: string
    image?: {
      url?: string
    }
  }
}

export interface UrlPreview {
  title: string | null
  thumbnail_url: string | null
  description: string | null
  dominant_color: string | null
}

async function extractDominantColor(imageUrl: string): Promise<string | null> {
  try {
    const palette = await Vibrant.from(imageUrl).getPalette()
    // Try vibrant first, then muted, then any available
    const swatch = palette.Vibrant || palette.Muted || palette.DarkVibrant || palette.LightVibrant
    if (swatch) {
      return swatch.hex
    }
    return null
  } catch (error) {
    console.error('Color extraction failed:', error)
    return null
  }
}

export async function fetchUrlPreview(url: string): Promise<UrlPreview> {
  const apiKey = process.env.MICROLINK_API_KEY
  const headers: HeadersInit = apiKey ? { 'x-api-key': apiKey } : {}

  const response = await fetch(
    `https://api.microlink.io?url=${encodeURIComponent(url)}`,
    { headers }
  )

  if (!response.ok) {
    throw new Error('Failed to fetch URL preview')
  }

  const data: MicrolinkResponse = await response.json()
  const thumbnailUrl = data.data.image?.url || null

  // Extract dominant color from thumbnail
  let dominantColor: string | null = null
  if (thumbnailUrl) {
    dominantColor = await extractDominantColor(thumbnailUrl)
  }

  return {
    title: data.data.title || null,
    thumbnail_url: thumbnailUrl,
    description: data.data.description || null,
    dominant_color: dominantColor,
  }
}
